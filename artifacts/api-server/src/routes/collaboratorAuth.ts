import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  activityLogsTable,
  collaboratorLoginChallengesTable,
  collaboratorSessionsTable,
  collaboratorTwoFactorTable,
  collaboratorsTable,
  db,
} from "@workspace/db";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  LoginCollaboratorBody,
  LoginCollaboratorResponse,
  VerifyCollaboratorTwoFactorBody,
  VerifyCollaboratorTwoFactorResponse,
} from "@workspace/api-zod";
import {
  decryptTotpSecret,
  matchFreshTotp,
  matchingRecoveryHash,
  totpEncryptionKey,
} from "../lib/twoFactorCrypto";
import { parseSessionDevice } from "../lib/session-device";

const router: IRouter = Router();
const scrypt = promisify(scryptCallback);
export const COLLABORATOR_SESSION_COOKIE = "somiren_collaborator_session";
const CHALLENGE_COOKIE = "somiren_collaborator_2fa_challenge";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const CHALLENGE_DURATION_MS = 5 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 5;
const LEGACY_ADMIN_EMAIL = "admin@somiren.local";

export function sessionCookieOptions(req: Request) {
  const origin = req.get("origin");
  let crossSite = process.env.COOKIE_CROSS_SITE === "true";
  if (origin) {
    try {
      crossSite ||= new URL(origin).host !== req.get("host");
    } catch {
      crossSite = true;
    }
  }
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: crossSite ? "none" as const : "strict" as const,
    path: "/",
  };
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyCollaboratorPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function hashCollaboratorPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function createCollaboratorSession(req: Request, res: Response, collaboratorId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const device = parseSessionDevice(req.get("user-agent"));
  await db.insert(collaboratorSessionsTable).values({
    collaboratorId, tokenHash: tokenHash(token), expiresAt, lastActiveAt: new Date(),
    browserName: device.browserName, osName: device.osName,
  });
  res.cookie(COLLABORATOR_SESSION_COOKIE, token, { ...sessionCookieOptions(req), maxAge: SESSION_DURATION_MS });
}

function publicProfile(collaborator: typeof collaboratorsTable.$inferSelect) {
  return {
    id: collaborator.id,
    email: collaborator.email,
    fullName: collaborator.fullName,
    role: collaborator.role,
    permissions: collaborator.permissions,
    mustChangePassword: collaborator.mustChangePassword,
  };
}

export async function getWorkspaceActor(req: Request) {
  const token = req.cookies?.[COLLABORATOR_SESSION_COOKIE];
  if (typeof token !== "string" || token.length < 32) return undefined;
  const hashedToken = tokenHash(token);
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  const [result] = await db
    .select({
      collaborator: collaboratorsTable,
      sessionId: collaboratorSessionsTable.id,
      lastActiveAt: collaboratorSessionsTable.lastActiveAt,
      browserName: collaboratorSessionsTable.browserName,
      osName: collaboratorSessionsTable.osName,
    })
    .from(collaboratorSessionsTable)
    .innerJoin(collaboratorsTable, eq(collaboratorSessionsTable.collaboratorId, collaboratorsTable.id))
    .where(and(
      eq(collaboratorSessionsTable.tokenHash, hashedToken),
      gt(collaboratorSessionsTable.expiresAt, now),
      gt(collaboratorSessionsTable.lastActiveAt, idleCutoff),
      eq(collaboratorsTable.isActive, true),
    ))
    .limit(1);
  if (!result) {
    await db.delete(collaboratorSessionsTable)
      .where(eq(collaboratorSessionsTable.tokenHash, hashedToken));
    return undefined;
  }
  if (result.browserName === null || result.osName === null) {
    const device = parseSessionDevice(req.get("user-agent"));
    const deviceMetadataConditions = [
      ...(device.browserName ? [isNull(collaboratorSessionsTable.browserName)] : []),
      ...(device.osName ? [isNull(collaboratorSessionsTable.osName)] : []),
    ];
    if (deviceMetadataConditions.length) {
      const browserNameUpdate = device.browserName
        ? { browserName: sql`COALESCE(${collaboratorSessionsTable.browserName}, ${device.browserName})` }
        : {};
      const osNameUpdate = device.osName
        ? { osName: sql`COALESCE(${collaboratorSessionsTable.osName}, ${device.osName})` }
        : {};
      await db.update(collaboratorSessionsTable).set({
        ...browserNameUpdate,
        ...osNameUpdate,
      }).where(and(
        eq(collaboratorSessionsTable.id, result.sessionId),
        or(...deviceMetadataConditions),
      ));
    }
  }
  if (result.lastActiveAt < new Date(now.getTime() - SESSION_ACTIVITY_WRITE_INTERVAL_MS)) {
    await db.update(collaboratorSessionsTable)
      .set({ lastActiveAt: now })
      .where(and(
        eq(collaboratorSessionsTable.id, result.sessionId),
        lt(collaboratorSessionsTable.lastActiveAt, new Date(now.getTime() - SESSION_ACTIVITY_WRITE_INTERVAL_MS)),
      ));
  }
  return result?.collaborator;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
});
const challengeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de codes de vérification. Réessayez plus tard." },
});

router.post("/auth/login", loginLimiter, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const loginInput = req.body && typeof req.body === "object" && typeof req.body.email === "string"
    ? { ...req.body, email: req.body.email.trim() }
    : req.body;
  const parsed = LoginCollaboratorBody.safeParse(loginInput);
  if (!parsed.success) {
    res.status(400).json({ error: "Identifiants invalides." });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const now = new Date();
  const outcome = await db.transaction(async (tx) => {
    const [collaborator] = await tx.select().from(collaboratorsTable)
      .where(and(eq(collaboratorsTable.email, email), eq(collaboratorsTable.isActive, true)))
      .for("update").limit(1);
    if (!collaborator) return { status: 401 as const };
    if (collaborator.lockedUntil && collaborator.lockedUntil > now) return { status: 429 as const };

    const [factor] = await tx.select().from(collaboratorTwoFactorTable)
      .where(eq(collaboratorTwoFactorTable.collaboratorId, collaborator.id))
      .for("update").limit(1);
    const valid = collaborator.passwordHash
      ? await verifyCollaboratorPassword(parsed.data.password, collaborator.passwordHash)
      : false;
    if (!valid) {
      const failures = collaborator.failedLoginAttempts + 1;
      await tx.update(collaboratorsTable).set({
        failedLoginAttempts: failures,
        lockedUntil: failures >= MAX_FAILED_ATTEMPTS
          ? new Date(now.getTime() + ACCOUNT_LOCK_MS)
          : collaborator.lockedUntil,
        updatedAt: now,
      }).where(eq(collaboratorsTable.id, collaborator.id));
      return { status: 401 as const };
    }

    if (factor?.secretCiphertext && collaborator.email !== LEGACY_ADMIN_EMAIL) {
      if (!totpEncryptionKey()) return { status: 503 as const };
      if (factor.lockedUntil && factor.lockedUntil > now) return { status: 429 as const };
      const challengeToken = randomBytes(32).toString("base64url");
      const oldChallengeToken = req.cookies?.[CHALLENGE_COOKIE];
      if (typeof oldChallengeToken === "string") {
        await tx.delete(collaboratorLoginChallengesTable)
          .where(eq(collaboratorLoginChallengesTable.tokenHash, tokenHash(oldChallengeToken)));
      }
      const currentSessionToken = req.cookies?.[COLLABORATOR_SESSION_COOKIE];
      if (typeof currentSessionToken === "string") {
        await tx.delete(collaboratorSessionsTable)
          .where(eq(collaboratorSessionsTable.tokenHash, tokenHash(currentSessionToken)));
      }
      const expiresAt = new Date(now.getTime() + CHALLENGE_DURATION_MS);
      await tx.insert(collaboratorLoginChallengesTable).values({
        collaboratorId: collaborator.id,
        tokenHash: tokenHash(challengeToken),
        factorVersion: factor.factorVersion,
        attempts: 0,
        expiresAt,
      });
      await tx.update(collaboratorsTable).set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: now,
      }).where(eq(collaboratorsTable.id, collaborator.id));
      return {
        status: 200 as const,
        requiresTwoFactor: true as const,
        collaborator,
        challengeToken,
        expiresAt,
      };
    }

    const sessionToken = randomBytes(32).toString("base64url");
    const device = parseSessionDevice(req.get("user-agent"));
    await tx.insert(collaboratorSessionsTable).values({
      collaboratorId: collaborator.id,
      tokenHash: tokenHash(sessionToken),
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
      lastActiveAt: now,
      browserName: device.browserName,
      osName: device.osName,
    });
    await tx.update(collaboratorsTable).set({
      lastLoginAt: now,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    }).where(eq(collaboratorsTable.id, collaborator.id));
    return { status: 200 as const, requiresTwoFactor: false as const, collaborator, sessionToken };
  });

  if (outcome.status !== 200) {
    if (outcome.status === 503) {
      res.status(503).json({ error: "Le service d’authentification à deux facteurs est indisponible." });
      return;
    }
    if (outcome.status === 429) {
      res.status(429).json({ error: "Compte temporairement verrouillé. Réessayez plus tard." });
      return;
    }
    res.status(401).json({ error: "Adresse e-mail ou mot de passe incorrect." });
    return;
  }
  if (outcome.requiresTwoFactor) {
    res.clearCookie(COLLABORATOR_SESSION_COOKIE, sessionCookieOptions(req));
    res.cookie(CHALLENGE_COOKIE, outcome.challengeToken, {
      ...sessionCookieOptions(req),
      secure: true,
      maxAge: CHALLENGE_DURATION_MS,
    });
    res.json(LoginCollaboratorResponse.parse({ requiresTwoFactor: true }));
    return;
  }
  res.cookie(COLLABORATOR_SESSION_COOKIE, outcome.sessionToken, {
    ...sessionCookieOptions(req),
    maxAge: SESSION_DURATION_MS,
  });
  res.json(LoginCollaboratorResponse.parse({ profile: publicProfile(outcome.collaborator) }));
});

router.post("/auth/2fa/verify", challengeLimiter, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = VerifyCollaboratorTwoFactorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Code invalide." });
    return;
  }
  const challengeToken = req.cookies?.[CHALLENGE_COOKIE];
  if (typeof challengeToken !== "string" || challengeToken.length < 32) {
    res.clearCookie(CHALLENGE_COOKIE, sessionCookieOptions(req));
    res.status(401).json({ error: "Défi de connexion invalide ou expiré." });
    return;
  }
  const challengeHash = tokenHash(challengeToken);
  const [lookup] = await db.select({ collaboratorId: collaboratorLoginChallengesTable.collaboratorId })
    .from(collaboratorLoginChallengesTable)
    .where(eq(collaboratorLoginChallengesTable.tokenHash, challengeHash)).limit(1);
  if (!lookup) {
    res.clearCookie(CHALLENGE_COOKIE, sessionCookieOptions(req));
    res.status(401).json({ error: "Défi de connexion invalide ou expiré." });
    return;
  }

  const now = new Date();
  const outcome = await db.transaction(async (tx) => {
    const [collaborator] = await tx.select().from(collaboratorsTable)
      .where(eq(collaboratorsTable.id, lookup.collaboratorId)).for("update").limit(1);
    const [factor] = await tx.select().from(collaboratorTwoFactorTable)
      .where(eq(collaboratorTwoFactorTable.collaboratorId, lookup.collaboratorId))
      .for("update").limit(1);
    const [challenge] = await tx.select().from(collaboratorLoginChallengesTable)
      .where(eq(collaboratorLoginChallengesTable.tokenHash, challengeHash))
      .for("update").limit(1);
    if (!collaborator || !collaborator.isActive || !factor?.secretCiphertext || !challenge) {
      if (challenge) await tx.delete(collaboratorLoginChallengesTable)
        .where(eq(collaboratorLoginChallengesTable.id, challenge.id));
      return { status: 401 as const };
    }
    if (collaborator.lockedUntil && collaborator.lockedUntil > now) {
      return { status: 429 as const };
    }
    if (challenge.expiresAt <= now || challenge.factorVersion !== factor.factorVersion) {
      await tx.delete(collaboratorLoginChallengesTable)
        .where(eq(collaboratorLoginChallengesTable.id, challenge.id));
      return { status: 401 as const };
    }
    if (factor.lockedUntil && factor.lockedUntil > now) {
      return { status: 429 as const };
    }
    if (challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
      await tx.delete(collaboratorLoginChallengesTable)
        .where(eq(collaboratorLoginChallengesTable.id, challenge.id));
      return { status: 429 as const };
    }

    const secret = decryptTotpSecret(factor.secretCiphertext);
    const matched = matchFreshTotp(secret, parsed.data.code, factor.lastAcceptedStep, now.getTime());
    let method: "totp" | "recovery_code" | undefined;
    let matchedStep: number | undefined;
    let recoveryHashes = factor.recoveryCodeHashes;
    if (matched) {
      method = "totp";
      matchedStep = matched.step;
    } else {
      const recoveryHash = matchingRecoveryHash(parsed.data.code, factor.recoveryCodeHashes);
      if (recoveryHash) {
        method = "recovery_code";
        recoveryHashes = factor.recoveryCodeHashes.filter((hash) => hash !== recoveryHash);
      }
    }
    if (!method) {
      const attempts = challenge.attempts + 1;
      const failures = factor.failedAttempts + 1;
      const lockUntil = failures >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + ACCOUNT_LOCK_MS)
        : factor.lockedUntil;
      if (attempts >= MAX_CHALLENGE_ATTEMPTS || failures >= MAX_FAILED_ATTEMPTS) {
        await tx.delete(collaboratorLoginChallengesTable)
          .where(eq(collaboratorLoginChallengesTable.id, challenge.id));
      } else {
        await tx.update(collaboratorLoginChallengesTable).set({ attempts })
          .where(eq(collaboratorLoginChallengesTable.id, challenge.id));
      }
      await tx.update(collaboratorTwoFactorTable).set({
        failedAttempts: failures,
        lockedUntil: lockUntil,
        updatedAt: now,
      }).where(eq(collaboratorTwoFactorTable.id, factor.id));
      return {
        status: attempts >= MAX_CHALLENGE_ATTEMPTS || failures >= MAX_FAILED_ATTEMPTS ? 429 as const : 401 as const,
        retryable: attempts < MAX_CHALLENGE_ATTEMPTS && failures < MAX_FAILED_ATTEMPTS,
      };
    }

    const sessionToken = randomBytes(32).toString("base64url");
    const device = parseSessionDevice(req.get("user-agent"));
    await tx.delete(collaboratorLoginChallengesTable)
      .where(eq(collaboratorLoginChallengesTable.id, challenge.id));
    await tx.insert(collaboratorSessionsTable).values({
      collaboratorId: collaborator.id,
      tokenHash: tokenHash(sessionToken),
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
      lastActiveAt: now,
      browserName: device.browserName,
      osName: device.osName,
    });
    await tx.update(collaboratorsTable).set({
      lastLoginAt: now,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    }).where(eq(collaboratorsTable.id, collaborator.id));
    await tx.update(collaboratorTwoFactorTable).set({
      ...(matchedStep === undefined ? {} : { lastAcceptedStep: matchedStep }),
      recoveryCodeHashes: recoveryHashes,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    }).where(eq(collaboratorTwoFactorTable.id, factor.id));
    await tx.insert(activityLogsTable).values({
      collaboratorId: collaborator.id,
      entityType: "collaborator_security",
      entityId: collaborator.id,
      action: "two_factor_login_verified",
      details: { method },
    });
    return { status: 200 as const, sessionToken, collaborator };
  });

  if (outcome.status === 401 && "retryable" in outcome && outcome.retryable) {
    res.status(401).json({ error: "Code incorrect ou déjà utilisé. Saisissez un nouveau code." });
    return;
  }
  res.clearCookie(CHALLENGE_COOKIE, sessionCookieOptions(req));
  if (outcome.status !== 200) {
    res.status(outcome.status).json({ error: outcome.status === 429
      ? "Trop de codes incorrects. Réessayez plus tard."
      : "Défi de connexion invalide, expiré ou code incorrect." });
    return;
  }
  res.cookie(COLLABORATOR_SESSION_COOKIE, outcome.sessionToken, {
    ...sessionCookieOptions(req),
    maxAge: SESSION_DURATION_MS,
  });
  res.json(VerifyCollaboratorTwoFactorResponse.parse({ profile: publicProfile(outcome.collaborator) }));
});

router.post("/auth/2fa/cancel", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const challengeToken = req.cookies?.[CHALLENGE_COOKIE];
  if (typeof challengeToken === "string") {
    await db.delete(collaboratorLoginChallengesTable)
      .where(eq(collaboratorLoginChallengesTable.tokenHash, tokenHash(challengeToken)));
  }
  res.clearCookie(CHALLENGE_COOKIE, sessionCookieOptions(req));
  res.status(204).end();
});

router.get("/auth/session", async (req, res): Promise<void> => {
  const collaborator = await getWorkspaceActor(req);
  if (!collaborator) {
    res.json({ profile: null });
    return;
  }
  res.json({ profile: publicProfile(collaborator) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.[COLLABORATOR_SESSION_COOKIE];
  if (typeof token === "string") {
    await db.delete(collaboratorSessionsTable)
      .where(eq(collaboratorSessionsTable.tokenHash, tokenHash(token)));
  }
  const challengeToken = req.cookies?.[CHALLENGE_COOKIE];
  if (typeof challengeToken === "string") {
    await db.delete(collaboratorLoginChallengesTable)
      .where(eq(collaboratorLoginChallengesTable.tokenHash, tokenHash(challengeToken)));
  }
  res.clearCookie(COLLABORATOR_SESSION_COOKIE, sessionCookieOptions(req));
  res.clearCookie(CHALLENGE_COOKIE, sessionCookieOptions(req));
  res.status(204).end();
});

export default router;