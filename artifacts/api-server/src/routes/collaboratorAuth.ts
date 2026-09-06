import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  collaboratorSessionsTable,
  collaboratorsTable,
  db,
} from "@workspace/db";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

const router: IRouter = Router();
const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "somiren_collaborator_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;

function sessionCookieOptions(req: Request) {
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

const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1024),
});

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length < 32) return undefined;
  const hashedToken = tokenHash(token);
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  const [result] = await db
    .select({
      collaborator: collaboratorsTable,
      sessionId: collaboratorSessionsTable.id,
      lastActiveAt: collaboratorSessionsTable.lastActiveAt,
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

router.post("/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
}), async (req, res): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Identifiants invalides." });
    return;
  }
  const [collaborator] = await db.select().from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.email, parsed.data.email), eq(collaboratorsTable.isActive, true)))
    .limit(1);
  if (collaborator?.lockedUntil && collaborator.lockedUntil > new Date()) {
    res.status(429).json({ error: "Compte temporairement verrouillé. Réessayez plus tard." });
    return;
  }
  const valid = collaborator?.passwordHash
    ? await verifyPassword(parsed.data.password, collaborator.passwordHash)
    : false;
  if (!collaborator || !valid) {
    if (collaborator) {
      await db.update(collaboratorsTable).set({
        failedLoginAttempts: sql`${collaboratorsTable.failedLoginAttempts} + 1`,
        lockedUntil: sql`CASE
          WHEN ${collaboratorsTable.failedLoginAttempts} + 1 >= ${MAX_FAILED_ATTEMPTS}
          THEN NOW() + (${ACCOUNT_LOCK_MS} * INTERVAL '1 millisecond')
          ELSE ${collaboratorsTable.lockedUntil}
        END`,
        updatedAt: new Date(),
      }).where(eq(collaboratorsTable.id, collaborator.id));
    }
    res.status(401).json({ error: "Adresse e-mail ou mot de passe incorrect." });
    return;
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(collaboratorSessionsTable).values({
    collaboratorId: collaborator.id,
    tokenHash: tokenHash(token),
    expiresAt,
    lastActiveAt: new Date(),
  });
  await db.update(collaboratorsTable)
    .set({ lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(collaboratorsTable.id, collaborator.id));
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions(req),
    maxAge: SESSION_DURATION_MS,
  });
  res.json({ profile: publicProfile(collaborator) });
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
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string") {
    await db.delete(collaboratorSessionsTable)
      .where(eq(collaboratorSessionsTable.tokenHash, tokenHash(token)));
  }
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(req));
  res.status(204).end();
});

export default router;