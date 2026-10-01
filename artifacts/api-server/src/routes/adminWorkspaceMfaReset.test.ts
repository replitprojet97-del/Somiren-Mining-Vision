import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import cookieParser from "cookie-parser";
import express from "express";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
function parseTestPostgresUrl(value: string): URL {
  const withUrlHost = value.replace(/^(postgres(?:ql)?:\/\/[^/]*@)\//, "$1localhost/");
  return new URL(withUrlHost);
}

const localTestDatabase = (() => {
  if (!testDatabaseUrl) return false;
  const url = parseTestPostgresUrl(testDatabaseUrl);
  const host = url.searchParams.get("host") || url.hostname;
  const localHost = host === "" || host.startsWith("/") || ["localhost", "127.0.0.1", "::1"].includes(host);
  return localHost && url.pathname === "/postgres";
})();

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

test("MFA retries retain challenges until success/exhaustion; reset and access changes invalidate stored challenges", {
  skip: !localTestDatabase && "Requires TEST_DATABASE_URL for a disposable local PostgreSQL cluster",
}, async t => {
  const adminUrl = parseTestPostgresUrl(testDatabaseUrl!);
  const schemaName = `mfa_reset_${randomBytes(8).toString("hex")}`;
  adminUrl.searchParams.set("options", `-csearch_path=${schemaName}`);
  let appPool: typeof import("@workspace/db")["pool"] | undefined;
  let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  let appDbModule: typeof import("@workspace/db") | undefined;

  try {
    process.env.SESSION_SECRET = "disposable-mfa-route-regression-secret";
    const twoFactorCrypto = await import("../lib/twoFactorCrypto");
    const fixtureTotpSecret = twoFactorCrypto.generateTotpSecret();
    const encryptedFixtureTotpSecret = twoFactorCrypto.encryptTotpSecret(fixtureTotpSecret);
    process.env.DATABASE_URL = adminUrl.toString();
    appDbModule = await import("@workspace/db");
    appPool = appDbModule.pool;
    await appPool.query(`CREATE SCHEMA "${schemaName}"`);
    await appPool.query(`
      CREATE TABLE collaborators (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at TIMESTAMPTZ,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        profile_photo_asset_id UUID,
        profile_photo_removed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE collaborator_sessions (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        browser_name TEXT,
        os_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE collaborator_two_factor (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL UNIQUE,
        secret_ciphertext TEXT,
        pending_secret_ciphertext TEXT,
        pending_expires_at TIMESTAMPTZ,
        recovery_code_hashes JSONB NOT NULL DEFAULT '[]'::jsonb,
        last_accepted_step INTEGER,
        factor_version INTEGER NOT NULL DEFAULT 0,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        enrollment_attempts INTEGER NOT NULL DEFAULT 0,
        enrollment_window_started_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE collaborator_login_challenges (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        factor_version INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE workspace_activity_logs (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await appPool.query(`
      INSERT INTO collaborators (id, email, full_name, role, permissions, is_active)
      VALUES
        (1, 'security-admin@example.test', 'Fixture Administrator', 'ADMIN', '["MANAGE_USERS"]', TRUE),
        (2, 'reset-target@example.test', 'Fixture Collaborator', 'COLLABORATOR', '["workspace:read"]', TRUE);
    `);
    await appPool.query(
      `INSERT INTO collaborator_two_factor (
         collaborator_id, secret_ciphertext, pending_secret_ciphertext, pending_expires_at,
         recovery_code_hashes, last_accepted_step, factor_version
       ) VALUES (
         2, $1, 'sealed-pending-enrollment', NOW() + INTERVAL '10 minutes',
         '["fixture-recovery-hash"]'::jsonb, 42, 1
       )`,
      [encryptedFixtureTotpSecret],
    );

    const { default: adminWorkspaceRouter } = await import("./adminWorkspace");
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    const { default: collaboratorAuthRouter, hashCollaboratorPassword } = await import("./collaboratorAuth");
    await appPool.query(
      `UPDATE collaborators SET password_hash = $1 WHERE id = 2`,
      [await hashCollaboratorPassword("fixture-login-password")],
    );
    app.use(collaboratorAuthRouter);
    app.use(adminWorkspaceRouter);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const loginUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";
    const mfaLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": loginUserAgent,
      },
      body: JSON.stringify({ email: "reset-target@example.test", password: "fixture-login-password" }),
    });
    assert.equal(mfaLogin.status, 200);
    assert.deepEqual(await mfaLogin.json(), { requiresTwoFactor: true });
    const challengeCookieMatch = mfaLogin.headers.get("set-cookie")
      ?.match(/(?:^|,\s*)somiren_collaborator_2fa_challenge=([^;,\s]+)/);
    assert.ok(challengeCookieMatch);
    const retryChallengeToken = challengeCookieMatch[1];
    const retryChallengeCookie = `somiren_collaborator_2fa_challenge=${retryChallengeToken}`;
    const beforeSecondFactor = await appPool.query(
      `SELECT count(*)::int AS sessions FROM collaborator_sessions WHERE collaborator_id = 2`,
    );
    assert.equal(beforeSecondFactor.rows[0].sessions, 0);
    const codeNow = Date.now();
    const nearbyCodes = new Set(
      Array.from({ length: 21 }, (_, index) =>
        twoFactorCrypto.totpCodeForFixture(fixtureTotpSecret, codeNow + (index - 10) * 30_000)),
    );
    let wrongCode = "000000";
    while (nearbyCodes.has(wrongCode)) {
      wrongCode = String((Number(wrongCode) + 1) % 1_000_000).padStart(6, "0");
    }
    const incorrectAttempt = await fetch(`${baseUrl}/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: retryChallengeCookie,
        "User-Agent": loginUserAgent,
      },
      body: JSON.stringify({ code: wrongCode }),
    });
    assert.equal(incorrectAttempt.status, 401);
    const incorrectBody = await incorrectAttempt.json() as { error: string };
    assert.match(incorrectBody.error, /incorrect ou déjà utilisé/i);
    assert.doesNotMatch(incorrectBody.error, /expir/i);
    assert.equal(incorrectAttempt.headers.get("set-cookie"), null);
    const retryState = await appPool.query(
      `SELECT attempts FROM collaborator_login_challenges WHERE token_hash = $1`,
      [hashToken(retryChallengeToken)],
    );
    assert.equal(retryState.rows[0].attempts, 1);
    const sessionsAfterInvalidCode = await appPool.query(
      `SELECT count(*)::int AS sessions FROM collaborator_sessions WHERE collaborator_id = 2`,
    );
    assert.equal(sessionsAfterInvalidCode.rows[0].sessions, 0);

    const freshTotp = twoFactorCrypto.totpCodeForFixture(fixtureTotpSecret, Date.now());
    const successfulRetry = await fetch(`${baseUrl}/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: retryChallengeCookie,
        "User-Agent": loginUserAgent,
      },
      body: JSON.stringify({ code: freshTotp }),
    });
    assert.equal(successfulRetry.status, 200);
    assert.match(successfulRetry.headers.get("set-cookie") ?? "", /somiren_collaborator_2fa_challenge=/);
    const consumedRetry = await appPool.query(
      `SELECT count(*)::int AS challenges FROM collaborator_login_challenges
       WHERE token_hash = $1`,
      [hashToken(retryChallengeToken)],
    );
    assert.equal(consumedRetry.rows[0].challenges, 0);
    const mfaSession = await appPool.query(
      `SELECT browser_name, os_name FROM collaborator_sessions WHERE collaborator_id = 2`,
    );
    assert.deepEqual(mfaSession.rows, [{ browser_name: "Microsoft Edge", os_name: "Windows" }]);

    const legacySessionToken = randomBytes(32).toString("base64url");
    const legacySessionHash = hashToken(legacySessionToken);
    const otherSessionHash = hashToken(randomBytes(32).toString("base64url"));
    await appPool.query(
      `INSERT INTO collaborator_sessions (
         collaborator_id, token_hash, expires_at, last_active_at, browser_name, os_name
       ) VALUES
         (2, $1, NOW() + INTERVAL '1 hour', NOW(), NULL, NULL),
         (2, $2, NOW() + INTERVAL '1 hour', NOW(), 'Firefox', 'Linux')`,
      [legacySessionHash, otherSessionHash],
    );
    const legacySessionRequest = await fetch(`${baseUrl}/auth/session`, {
      headers: {
        Cookie: `somiren_collaborator_session=${legacySessionToken}`,
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
      },
    });
    assert.equal(legacySessionRequest.status, 200);
    const backfilledSessions = await appPool.query(
      `SELECT token_hash, browser_name, os_name FROM collaborator_sessions
       WHERE token_hash = ANY($1::text[])`,
      [[legacySessionHash, otherSessionHash]],
    );
    assert.deepEqual(
      Object.fromEntries(backfilledSessions.rows.map((session) => [
        session.token_hash,
        { browser_name: session.browser_name, os_name: session.os_name },
      ])),
      {
        [legacySessionHash]: { browser_name: "Chrome", os_name: "Android" },
        [otherSessionHash]: { browser_name: "Firefox", os_name: "Linux" },
      },
    );

    const exhaustedChallengeToken = randomBytes(32).toString("base64url");
    await appPool.query(
      `INSERT INTO collaborator_login_challenges (collaborator_id, token_hash, factor_version, expires_at)
       VALUES (2, $1, 1, NOW() + INTERVAL '5 minutes')`,
      [hashToken(exhaustedChallengeToken)],
    );
    const exhaustedCookie = `somiren_collaborator_2fa_challenge=${exhaustedChallengeToken}`;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const exhaustedResponse = await fetch(`${baseUrl}/auth/2fa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: exhaustedCookie,
        },
        body: JSON.stringify({ code: wrongCode }),
      });
      if (attempt < 5) {
        assert.equal(exhaustedResponse.status, 401);
        assert.equal(exhaustedResponse.headers.get("set-cookie"), null);
      } else {
        assert.equal(exhaustedResponse.status, 429);
        assert.match(
          exhaustedResponse.headers.get("set-cookie") ?? "",
          /somiren_collaborator_2fa_challenge=;/,
        );
      }
    }
    const exhaustedState = await appPool.query(
      `SELECT count(*)::int AS challenges FROM collaborator_login_challenges
       WHERE token_hash = $1`,
      [hashToken(exhaustedChallengeToken)],
    );
    assert.equal(exhaustedState.rows[0].challenges, 0);

    const adminSessionToken = randomBytes(32).toString("base64url");
    const adminSessionHash = createHash("sha256").update(adminSessionToken).digest("hex");
    await appPool.query(
      `INSERT INTO collaborator_sessions (collaborator_id, token_hash, expires_at, last_active_at)
       VALUES (1, $1, NOW() + INTERVAL '1 hour', NOW())`,
      [adminSessionHash],
    );
    const headers = {
      "Content-Type": "application/json",
      Cookie: `somiren_collaborator_session=${adminSessionToken}`,
    };

    const resetChallengeToken = randomBytes(32).toString("base64url");
    await appPool.query(
      `INSERT INTO collaborator_sessions (collaborator_id, token_hash, expires_at, last_active_at)
       VALUES (2, 'target-session-reset', NOW() + INTERVAL '1 hour', NOW())`,
    );
    await appPool.query(
      `INSERT INTO collaborator_login_challenges (collaborator_id, token_hash, factor_version, expires_at)
       VALUES (2, $1, 1, NOW() + INTERVAL '5 minutes')`,
      [hashToken(resetChallengeToken)],
    );
    const passwordReset = await fetch(`${baseUrl}/admin/collaborators/2`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ newPassword: "fixture-new-password-123" }),
    });
    assert.equal(passwordReset.status, 200);
    const afterReset = await appPool.query(
      `SELECT
         (SELECT count(*)::int FROM collaborator_sessions WHERE collaborator_id = 2) AS sessions,
         (SELECT count(*)::int FROM collaborator_login_challenges WHERE collaborator_id = 2) AS challenges,
         secret_ciphertext, pending_secret_ciphertext, pending_expires_at, recovery_code_hashes
       FROM collaborator_two_factor WHERE collaborator_id = 2`,
    );
    assert.equal(afterReset.rows[0].sessions, 0);
    assert.equal(afterReset.rows[0].challenges, 0);
    assert.equal(afterReset.rows[0].secret_ciphertext, encryptedFixtureTotpSecret);
    assert.equal(afterReset.rows[0].pending_secret_ciphertext, null);
    assert.equal(afterReset.rows[0].pending_expires_at, null);
    assert.deepEqual(afterReset.rows[0].recovery_code_hashes, ["fixture-recovery-hash"]);
    const resetChallengeUse = await fetch(`${baseUrl}/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `somiren_collaborator_2fa_challenge=${resetChallengeToken}`,
      },
      body: JSON.stringify({ code: "123456" }),
    });
    assert.equal(resetChallengeUse.status, 401);

    const suspensionChallengeToken = randomBytes(32).toString("base64url");
    await appPool.query(`
      UPDATE collaborator_two_factor
      SET pending_secret_ciphertext = 'sealed-pending-before-suspension',
          pending_expires_at = NOW() + INTERVAL '10 minutes'
      WHERE collaborator_id = 2;
      INSERT INTO collaborator_sessions (collaborator_id, token_hash, expires_at, last_active_at)
      VALUES (2, 'target-session-suspension', NOW() + INTERVAL '1 hour', NOW());
    `);
    await appPool.query(
      `INSERT INTO collaborator_login_challenges (collaborator_id, token_hash, factor_version, expires_at)
       VALUES (2, $1, 1, NOW() + INTERVAL '5 minutes')`,
      [hashToken(suspensionChallengeToken)],
    );
    const suspension = await fetch(`${baseUrl}/admin/collaborators/2`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(suspension.status, 200);
    const afterSuspension = await appPool.query(
      `SELECT
         (SELECT count(*)::int FROM collaborator_sessions WHERE collaborator_id = 2) AS sessions,
         (SELECT count(*)::int FROM collaborator_login_challenges WHERE collaborator_id = 2) AS challenges,
         secret_ciphertext, pending_secret_ciphertext, pending_expires_at, recovery_code_hashes
       FROM collaborator_two_factor WHERE collaborator_id = 2`,
    );
    assert.equal(afterSuspension.rows[0].sessions, 0);
    assert.equal(afterSuspension.rows[0].challenges, 0);
    assert.equal(afterSuspension.rows[0].secret_ciphertext, encryptedFixtureTotpSecret);
    assert.equal(afterSuspension.rows[0].pending_secret_ciphertext, null);
    assert.equal(afterSuspension.rows[0].pending_expires_at, null);
    assert.deepEqual(afterSuspension.rows[0].recovery_code_hashes, ["fixture-recovery-hash"]);
    const suspensionChallengeUse = await fetch(`${baseUrl}/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `somiren_collaborator_2fa_challenge=${suspensionChallengeToken}`,
      },
      body: JSON.stringify({ code: "123456" }),
    });
    assert.equal(suspensionChallengeUse.status, 401);

    const staleChallengeToken = randomBytes(32).toString("base64url");
    await appPool.query(
      `INSERT INTO collaborator_login_challenges (collaborator_id, token_hash, factor_version, expires_at)
       VALUES (2, $1, 1, NOW() + INTERVAL '5 minutes')`,
      [hashToken(staleChallengeToken)],
    );
    const restoration = await fetch(`${baseUrl}/admin/collaborators/2/restore-access`, {
      method: "POST",
      headers,
    });
    assert.equal(restoration.status, 200);
    const afterRestoration = await appPool.query(
      `SELECT
         (SELECT count(*)::int FROM collaborator_login_challenges WHERE collaborator_id = 2) AS challenges,
         secret_ciphertext, pending_secret_ciphertext, recovery_code_hashes
       FROM collaborator_two_factor WHERE collaborator_id = 2`,
    );
    assert.equal(afterRestoration.rows[0].challenges, 0);
    assert.equal(afterRestoration.rows[0].secret_ciphertext, encryptedFixtureTotpSecret);
    assert.equal(afterRestoration.rows[0].pending_secret_ciphertext, null);
    assert.deepEqual(afterRestoration.rows[0].recovery_code_hashes, ["fixture-recovery-hash"]);
    const staleChallengeUse = await fetch(`${baseUrl}/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `somiren_collaborator_2fa_challenge=${staleChallengeToken}`,
      },
      body: JSON.stringify({ code: "123456" }),
    });
    assert.equal(staleChallengeUse.status, 401);

    const secondSuspension = await fetch(`${baseUrl}/admin/collaborators/2`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(secondSuspension.status, 200);
    const patchReactivationChallengeToken = randomBytes(32).toString("base64url");
    await appPool.query(
      `INSERT INTO collaborator_login_challenges (collaborator_id, token_hash, factor_version, expires_at)
       VALUES (2, $1, 1, NOW() + INTERVAL '5 minutes')`,
      [hashToken(patchReactivationChallengeToken)],
    );
    const patchReactivation = await fetch(`${baseUrl}/admin/collaborators/2`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isActive: true }),
    });
    assert.equal(patchReactivation.status, 200);
    const afterPatchReactivation = await appPool.query(
      `SELECT count(*)::int AS challenges
       FROM collaborator_login_challenges WHERE collaborator_id = 2`,
    );
    assert.equal(afterPatchReactivation.rows[0].challenges, 0);
    const patchReactivationChallengeUse = await fetch(`${baseUrl}/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `somiren_collaborator_2fa_challenge=${patchReactivationChallengeToken}`,
      },
      body: JSON.stringify({ code: "123456" }),
    });
    assert.equal(patchReactivationChallengeUse.status, 401);
  } finally {
    if (server) {
      server.close();
      await once(server, "close");
    }
    await appPool?.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => undefined);
    await appDbModule?.pool.end();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  }
});