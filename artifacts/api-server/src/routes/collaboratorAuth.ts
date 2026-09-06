import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  collaboratorSessionsTable,
  collaboratorsTable,
  db,
} from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

const router: IRouter = Router();
const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "somiren_collaborator_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

const loginSchema = z.object({
  email: z.string().email().max(320).transform((value) => value.trim().toLowerCase()),
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
  const [result] = await db
    .select({ collaborator: collaboratorsTable })
    .from(collaboratorSessionsTable)
    .innerJoin(collaboratorsTable, eq(collaboratorSessionsTable.collaboratorId, collaboratorsTable.id))
    .where(and(
      eq(collaboratorSessionsTable.tokenHash, tokenHash(token)),
      gt(collaboratorSessionsTable.expiresAt, new Date()),
      eq(collaboratorsTable.isActive, true),
    ))
    .limit(1);
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
  const valid = collaborator?.passwordHash
    ? await verifyPassword(parsed.data.password, collaborator.passwordHash)
    : false;
  if (!collaborator || !valid) {
    res.status(401).json({ error: "Adresse e-mail ou mot de passe incorrect." });
    return;
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(collaboratorSessionsTable).values({
    collaboratorId: collaborator.id,
    tokenHash: tokenHash(token),
    expiresAt,
  });
  await db.update(collaboratorsTable)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(collaboratorsTable.id, collaborator.id));
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_MS,
    path: "/",
  });
  res.json({ profile: publicProfile(collaborator) });
});

router.get("/auth/session", async (req, res): Promise<void> => {
  const collaborator = await getWorkspaceActor(req);
  if (!collaborator) {
    res.status(401).json({ error: "Authentication required" });
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
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  res.status(204).end();
});

export default router;