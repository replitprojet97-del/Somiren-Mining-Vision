import {
  activityLogsTable,
  collaboratorLoginChallengesTable,
  collaboratorSessionsTable,
  collaboratorTwoFactorTable,
  collaboratorsTable,
  db,
} from "@workspace/db";
import {
  DisableWorkspaceTwoFactorBody,
  DisableWorkspaceTwoFactorResponse,
  EnableWorkspaceTwoFactorBody,
  EnableWorkspaceTwoFactorResponse,
  GetWorkspaceTwoFactorStatusResponse,
  RegenerateWorkspaceTwoFactorRecoveryCodesBody,
  RegenerateWorkspaceTwoFactorRecoveryCodesResponse,
  SetupWorkspaceTwoFactorBody,
  SetupWorkspaceTwoFactorResponse,
} from "@workspace/api-zod";
import { and, eq, ne } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  COLLABORATOR_SESSION_COOKIE,
  getWorkspaceActor,
  tokenHash,
  verifyCollaboratorPassword,
} from "./collaboratorAuth";
import {
  createRecoveryCodes,
  createTotpProvisioningUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  hashRecoveryCode,
  matchFreshTotp,
  matchTotp,
  matchingRecoveryHash,
  totpEncryptionKey,
} from "../lib/twoFactorCrypto";

const router: IRouter = Router();
const FAILED_ATTEMPTS_LIMIT = 5;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;
const ENROLLMENT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ENROLLMENT_ATTEMPTS = 5;
const LEGACY_ADMIN_EMAIL = "admin@somiren.local";

const managementLimiter = rateLimit({
  windowMs: ENROLLMENT_WINDOW_MS,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de sécurité. Réessayez plus tard." },
});

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function clearOtherSessions(
  tx: DbTransaction,
  collaboratorId: number,
  currentToken: string | undefined,
) {
  const currentHash = currentToken ? tokenHash(currentToken) : undefined;
  return currentHash
    ? tx.delete(collaboratorSessionsTable).where(and(
      eq(collaboratorSessionsTable.collaboratorId, collaboratorId),
      ne(collaboratorSessionsTable.tokenHash, currentHash),
    ))
    : tx.delete(collaboratorSessionsTable).where(eq(collaboratorSessionsTable.collaboratorId, collaboratorId));
}

async function ensureFactorForUpdate(tx: DbTransaction, collaboratorId: number) {
  await tx.insert(collaboratorTwoFactorTable).values({ collaboratorId })
    .onConflictDoNothing({ target: collaboratorTwoFactorTable.collaboratorId });
  const [factor] = await tx.select().from(collaboratorTwoFactorTable)
    .where(eq(collaboratorTwoFactorTable.collaboratorId, collaboratorId))
    .for("update").limit(1);
  if (!factor) throw new Error("Second-factor row could not be locked");
  return factor;
}

async function accountForUpdate(tx: DbTransaction, collaboratorId: number) {
  const [account] = await tx.select().from(collaboratorsTable)
    .where(eq(collaboratorsTable.id, collaboratorId)).for("update").limit(1);
  return account;
}

async function logSecurityAction(
  tx: DbTransaction,
  collaboratorId: number,
  action: string,
  method?: "totp" | "recovery_code",
): Promise<void> {
  await tx.insert(activityLogsTable).values({
    collaboratorId,
    entityType: "collaborator_security",
    entityId: collaboratorId,
    action,
    details: method ? { method } : {},
  });
}

function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return Boolean(lockedUntil && lockedUntil > now);
}

async function countFailure(
  tx: DbTransaction,
  factor: typeof collaboratorTwoFactorTable.$inferSelect,
  now: Date,
): Promise<void> {
  const failures = factor.failedAttempts + 1;
  await tx.update(collaboratorTwoFactorTable).set({
    failedAttempts: failures,
    lockedUntil: failures >= FAILED_ATTEMPTS_LIMIT
      ? new Date(now.getTime() + ACCOUNT_LOCK_MS)
      : factor.lockedUntil,
    updatedAt: now,
  }).where(eq(collaboratorTwoFactorTable.id, factor.id));
}

async function recordSuccessfulFactorUse(
  tx: DbTransaction,
  factor: typeof collaboratorTwoFactorTable.$inferSelect,
  code: string,
  now: Date,
): Promise<{ ok: true; method: "totp" | "recovery_code"; matchedStep?: number; hashes: string[] } | { ok: false }> {
  if (!factor.secretCiphertext) return { ok: false };

  const secret = decryptTotpSecret(factor.secretCiphertext);
  const matchedTotp = matchFreshTotp(secret, code, factor.lastAcceptedStep, now.getTime());
  if (matchedTotp) {
    await tx.update(collaboratorTwoFactorTable).set({
      lastAcceptedStep: matchedTotp.step,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    }).where(eq(collaboratorTwoFactorTable.id, factor.id));
    return { ok: true, method: "totp", matchedStep: matchedTotp.step, hashes: factor.recoveryCodeHashes };
  }

  const recoveryHash = matchingRecoveryHash(code, factor.recoveryCodeHashes);
  if (!recoveryHash) return { ok: false };
  const hashes = factor.recoveryCodeHashes.filter((hash) => hash !== recoveryHash);
  await tx.update(collaboratorTwoFactorTable).set({
    recoveryCodeHashes: hashes,
    failedAttempts: 0,
    lockedUntil: null,
    updatedAt: now,
  }).where(eq(collaboratorTwoFactorTable.id, factor.id));
  return { ok: true, method: "recovery_code", hashes };
}

async function requireActor(req: Request, res: Response): Promise<number | undefined> {
  const actor = await getWorkspaceActor(req);
  if (!actor) {
    res.status(401).json({ error: "Authentification requise." });
    return undefined;
  }
  if (actor.email === LEGACY_ADMIN_EMAIL) {
    res.status(403).json({ error: "Cette authentification n’est pas disponible pour le portail administrateur historique." });
    return undefined;
  }
  res.locals.workspaceActor = actor;
  return actor.id;
}

router.get("/workspace/security/2fa", async (req, res): Promise<void> => {
  noStore(res);
  const collaboratorId = await requireActor(req, res);
  if (!collaboratorId) return;
  const [factor] = await db.select().from(collaboratorTwoFactorTable)
    .where(eq(collaboratorTwoFactorTable.collaboratorId, collaboratorId)).limit(1);
  res.json(GetWorkspaceTwoFactorStatusResponse.parse({
    enabled: Boolean(factor?.secretCiphertext),
    available: Boolean(totpEncryptionKey()),
    recoveryCodesRemaining: factor?.recoveryCodeHashes.length ?? 0,
  }));
});

router.post("/workspace/security/2fa/setup", managementLimiter, async (req, res): Promise<void> => {
  noStore(res);
  const collaboratorId = await requireActor(req, res);
  if (!collaboratorId) return;
  const parsed = SetupWorkspaceTwoFactorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Demande invalide." });
    return;
  }
  if (!totpEncryptionKey()) {
    res.status(503).json({ available: false });
    return;
  }

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const account = await accountForUpdate(tx, collaboratorId);
    if (!account || !account.isActive) return { status: 401 as const };
    if (isLocked(account.lockedUntil, now)) return { status: 429 as const };
    const factor = await ensureFactorForUpdate(tx, collaboratorId);
    if (isLocked(factor.lockedUntil, now)) return { status: 429 as const };
    if (!account.passwordHash || !(await verifyCollaboratorPassword(parsed.data.password, account.passwordHash))) {
      await countFailure(tx, factor, now);
      return { status: 401 as const };
    }
    if (factor.secretCiphertext) return { status: 409 as const };

    const windowStarted = factor.enrollmentWindowStartedAt;
    const enrollmentCount = windowStarted && now.getTime() - windowStarted.getTime() < ENROLLMENT_WINDOW_MS
      ? factor.enrollmentAttempts
      : 0;
    if (enrollmentCount >= MAX_ENROLLMENT_ATTEMPTS) return { status: 429 as const };

    const secret = generateTotpSecret();
    const ciphertext = encryptTotpSecret(secret);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    await tx.update(collaboratorTwoFactorTable).set({
      pendingSecretCiphertext: ciphertext,
      pendingExpiresAt: expiresAt,
      enrollmentAttempts: enrollmentCount + 1,
      enrollmentWindowStartedAt: windowStarted && enrollmentCount > 0 ? windowStarted : now,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    }).where(eq(collaboratorTwoFactorTable.id, factor.id));
    await logSecurityAction(tx, collaboratorId, "two_factor_setup_started");
    return {
      status: 200 as const,
      secret,
      otpauthUrl: createTotpProvisioningUri(secret, account.email),
      expiresAt,
    };
  });
  if (result.status !== 200) {
    res.status(result.status).json({ error: result.status === 409 ? "L’authentification à deux facteurs est déjà activée." : "Impossible de démarrer la configuration." });
    return;
  }
  res.json(SetupWorkspaceTwoFactorResponse.parse({
    secret: result.secret,
    otpauthUrl: result.otpauthUrl,
    expiresAt: result.expiresAt,
  }));
});

router.post("/workspace/security/2fa/enable", managementLimiter, async (req, res): Promise<void> => {
  noStore(res);
  const collaboratorId = await requireActor(req, res);
  if (!collaboratorId) return;
  const parsed = EnableWorkspaceTwoFactorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Code invalide." });
    return;
  }
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const account = await accountForUpdate(tx, collaboratorId);
    if (!account || !account.isActive) return { status: 401 as const };
    if (isLocked(account.lockedUntil, now)) return { status: 429 as const };
    const factor = await ensureFactorForUpdate(tx, collaboratorId);
    if (isLocked(factor.lockedUntil, now)) return { status: 429 as const };
    if (factor.secretCiphertext) return { status: 409 as const };
    if (!factor.pendingSecretCiphertext || !factor.pendingExpiresAt || factor.pendingExpiresAt <= now) {
      return { status: 400 as const };
    }
    const pendingSecret = decryptTotpSecret(factor.pendingSecretCiphertext);
    const matched = matchTotp(pendingSecret, parsed.data.code, now.getTime());
    if (!matched) {
      await countFailure(tx, factor, now);
      return { status: factor.failedAttempts + 1 >= FAILED_ATTEMPTS_LIMIT ? 429 as const : 400 as const };
    }

    const recoveryCodes = createRecoveryCodes(10);
    await tx.update(collaboratorTwoFactorTable).set({
      secretCiphertext: factor.pendingSecretCiphertext,
      pendingSecretCiphertext: null,
      pendingExpiresAt: null,
      recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
      lastAcceptedStep: matched.step,
      factorVersion: factor.factorVersion + 1,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    }).where(eq(collaboratorTwoFactorTable.id, factor.id));
    await tx.delete(collaboratorLoginChallengesTable)
      .where(eq(collaboratorLoginChallengesTable.collaboratorId, collaboratorId));
    await clearOtherSessions(tx, collaboratorId, req.cookies?.[COLLABORATOR_SESSION_COOKIE]);
    await logSecurityAction(tx, collaboratorId, "two_factor_enabled");
    return { status: 200 as const, recoveryCodes };
  });
  if (result.status !== 200) {
    res.status(result.status).json({ error: result.status === 409 ? "L’authentification à deux facteurs est déjà activée." : "Code invalide ou configuration expirée." });
    return;
  }
  res.json(EnableWorkspaceTwoFactorResponse.parse({ enabled: true, recoveryCodes: result.recoveryCodes }));
});

router.post("/workspace/security/2fa/disable", managementLimiter, async (req, res): Promise<void> => {
  noStore(res);
  const collaboratorId = await requireActor(req, res);
  if (!collaboratorId) return;
  const parsed = DisableWorkspaceTwoFactorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Demande invalide." });
    return;
  }
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const account = await accountForUpdate(tx, collaboratorId);
    if (!account || !account.isActive) return { status: 401 as const };
    if (isLocked(account.lockedUntil, now)) return { status: 429 as const };
    const factor = await ensureFactorForUpdate(tx, collaboratorId);
    if (isLocked(factor.lockedUntil, now)) return { status: 429 as const };
    if (!account.passwordHash || !(await verifyCollaboratorPassword(parsed.data.password, account.passwordHash))) {
      await countFailure(tx, factor, now);
      return { status: 401 as const };
    }
    if (!factor.secretCiphertext) return { status: 409 as const };
    const consumed = await recordSuccessfulFactorUse(tx, factor, parsed.data.code, now);
    if (!consumed.ok) {
      await countFailure(tx, factor, now);
      return { status: factor.failedAttempts + 1 >= FAILED_ATTEMPTS_LIMIT ? 429 as const : 400 as const };
    }
    await tx.update(collaboratorTwoFactorTable).set({
      secretCiphertext: null,
      pendingSecretCiphertext: null,
      pendingExpiresAt: null,
      recoveryCodeHashes: [],
      lastAcceptedStep: null,
      factorVersion: factor.factorVersion + 1,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    }).where(eq(collaboratorTwoFactorTable.id, factor.id));
    await tx.delete(collaboratorLoginChallengesTable)
      .where(eq(collaboratorLoginChallengesTable.collaboratorId, collaboratorId));
    await clearOtherSessions(tx, collaboratorId, req.cookies?.[COLLABORATOR_SESSION_COOKIE]);
    await logSecurityAction(tx, collaboratorId, "two_factor_disabled", consumed.method);
    return { status: 200 as const };
  });
  if (result.status !== 200) {
    res.status(result.status).json({ error: "Mot de passe ou code invalide." });
    return;
  }
  res.json(DisableWorkspaceTwoFactorResponse.parse({ enabled: false }));
});

router.post("/workspace/security/2fa/recovery-codes", managementLimiter, async (req, res): Promise<void> => {
  noStore(res);
  const collaboratorId = await requireActor(req, res);
  if (!collaboratorId) return;
  const parsed = RegenerateWorkspaceTwoFactorRecoveryCodesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Demande invalide." });
    return;
  }
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const account = await accountForUpdate(tx, collaboratorId);
    if (!account || !account.isActive) return { status: 401 as const };
    if (isLocked(account.lockedUntil, now)) return { status: 429 as const };
    const factor = await ensureFactorForUpdate(tx, collaboratorId);
    if (isLocked(factor.lockedUntil, now)) return { status: 429 as const };
    if (!account.passwordHash || !(await verifyCollaboratorPassword(parsed.data.password, account.passwordHash))) {
      await countFailure(tx, factor, now);
      return { status: 401 as const };
    }
    if (!factor.secretCiphertext) return { status: 409 as const };
    const consumed = await recordSuccessfulFactorUse(tx, factor, parsed.data.code, now);
    if (!consumed.ok) {
      await countFailure(tx, factor, now);
      return { status: factor.failedAttempts + 1 >= FAILED_ATTEMPTS_LIMIT ? 429 as const : 400 as const };
    }
    const recoveryCodes = createRecoveryCodes(10);
    await tx.update(collaboratorTwoFactorTable).set({
      recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
      factorVersion: factor.factorVersion + 1,
      updatedAt: now,
    }).where(eq(collaboratorTwoFactorTable.id, factor.id));
    await tx.delete(collaboratorLoginChallengesTable)
      .where(eq(collaboratorLoginChallengesTable.collaboratorId, collaboratorId));
    await clearOtherSessions(tx, collaboratorId, req.cookies?.[COLLABORATOR_SESSION_COOKIE]);
    await logSecurityAction(tx, collaboratorId, "two_factor_recovery_codes_regenerated", consumed.method);
    return { status: 200 as const, recoveryCodes };
  });
  if (result.status !== 200) {
    res.status(result.status).json({ error: result.status === 409 ? "L’authentification à deux facteurs n’est pas activée." : "Mot de passe ou code invalide." });
    return;
  }
  res.json(RegenerateWorkspaceTwoFactorRecoveryCodesResponse.parse({ recoveryCodes: result.recoveryCodes }));
});

export default router;