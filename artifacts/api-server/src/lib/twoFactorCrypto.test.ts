import assert from "node:assert/strict";
import test from "node:test";
import {
  createRecoveryCodes,
  decryptTotpSecret,
  encryptTotpSecret,
  hashRecoveryCode,
  matchFreshTotp,
  matchTotp,
  matchingRecoveryHash,
  totpCodeForFixture,
  totpEncryptionKey,
} from "./twoFactorCrypto";

const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("TOTP generation follows the RFC 6238 SHA-1 six-digit vectors", () => {
  assert.equal(totpCodeForFixture(RFC_SECRET, 59_000), "287082");
  assert.equal(totpCodeForFixture(RFC_SECRET, 1_111_111_109_000), "081804");
  assert.equal(totpCodeForFixture(RFC_SECRET, 1_234_567_890_000), "005924");
});

test("TOTP validation accepts the current step and reports the matched step", () => {
  const timestamp = 1_700_000_000_000;
  const code = totpCodeForFixture(RFC_SECRET, timestamp);
  const matched = matchTotp(RFC_SECRET, code, timestamp);
  assert.ok(matched);
  assert.equal(matched.step, Math.floor(timestamp / 30_000));
  assert.equal(matchFreshTotp(RFC_SECRET, code, matched.step, timestamp), undefined);
  assert.deepEqual(matchFreshTotp(RFC_SECRET, code, matched.step - 1, timestamp), matched);
  assert.equal(matchTotp(RFC_SECRET, "not-a-code", timestamp), undefined);
});

test("recovery codes are random, normalized for hashing, and matched as a consumable hash", () => {
  const [first, second] = createRecoveryCodes(2);
  assert.notEqual(first, second);
  const hash = hashRecoveryCode(first);
  assert.equal(matchingRecoveryHash(first.toLowerCase(), [hash]), hash);
  assert.equal(matchingRecoveryHash(first, []), undefined);
  assert.equal(matchingRecoveryHash("WRONG-CODE", [hash]), undefined);
});

test("AES-GCM round trips, detects tampering, and requires SESSION_SECRET", () => {
  const previousSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "totp-crypto-test-session-secret";
  try {
    assert.equal(totpEncryptionKey()?.length, 32);
    const encrypted = encryptTotpSecret(RFC_SECRET);
    assert.equal(decryptTotpSecret(encrypted), RFC_SECRET);
    const pieces = encrypted.split(".");
    pieces[2] = `${pieces[2].startsWith("A") ? "B" : "A"}${pieces[2].slice(1)}`;
    assert.throws(() => decryptTotpSecret(pieces.join(".")));

    delete process.env.SESSION_SECRET;
    assert.equal(totpEncryptionKey(), undefined);
    assert.throws(() => encryptTotpSecret(RFC_SECRET), /unavailable/);
    assert.throws(() => decryptTotpSecret(encrypted), /unavailable/);
  } finally {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});