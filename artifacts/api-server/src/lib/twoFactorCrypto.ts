import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import * as OTPAuth from "otpauth";

const TOTP_PERIOD_SECONDS = 30;
const TOTP_WINDOW = 1;
const ENCRYPTION_SALT = Buffer.from("somiren:collaborator-totp:v1", "utf8");
const ENCRYPTION_INFO = Buffer.from("aes-256-gcm:secret-encryption", "utf8");

export class TwoFactorUnavailableError extends Error {
  constructor() {
    super("Second-factor secret encryption is unavailable");
    this.name = "TwoFactorUnavailableError";
  }
}

export function totpEncryptionKey(): Buffer | undefined {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) return undefined;
  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(sessionSecret, "utf8"),
    ENCRYPTION_SALT,
    ENCRYPTION_INFO,
    32,
  ));
}

export function encryptTotpSecret(secret: string): string {
  const key = totpEncryptionKey();
  if (!key) throw new TwoFactorUnavailableError();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(ENCRYPTION_SALT);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptTotpSecret(encrypted: string): string {
  const key = totpEncryptionKey();
  if (!key) throw new TwoFactorUnavailableError();
  const [version, ivText, tagText, ciphertextText] = encrypted.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) {
    throw new Error("Stored second-factor secret has an unsupported format");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
  decipher.setAAD(ENCRYPTION_SALT);
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function createTotp(secret: string, label = "Collaborator"): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: "Somiren",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: TOTP_PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function createTotpProvisioningUri(secret: string, email: string): string {
  return createTotp(secret, email).toString();
}

export function matchTotp(
  secret: string,
  code: string,
  timestamp = Date.now(),
): { step: number } | undefined {
  if (!/^\d{6}$/.test(code)) return undefined;
  const delta = createTotp(secret).validate({
    token: code,
    window: TOTP_WINDOW,
    timestamp,
  });
  if (delta === null) return undefined;
  return {
    step: Math.floor(timestamp / (TOTP_PERIOD_SECONDS * 1000)) + delta,
  };
}

export function matchFreshTotp(
  secret: string,
  code: string,
  lastAcceptedStep: number | null,
  timestamp = Date.now(),
): { step: number } | undefined {
  const matched = matchTotp(secret, code, timestamp);
  return matched && (lastAcceptedStep === null || matched.step > lastAcceptedStep)
    ? matched
    : undefined;
}

/** Deterministic RFC 6238 fixture helper for tests; never used to issue credentials. */
export function totpCodeForFixture(secret: string, timestamp: number): string {
  return createTotp(secret).generate({ timestamp });
}

export function createRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const value = randomBytes(9).toString("hex").toUpperCase();
    return `${value.slice(0, 6)}-${value.slice(6, 12)}-${value.slice(12)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/-/g, "").toUpperCase();
  return createHash("sha256").update("somiren:recovery-code:v1:").update(normalized).digest("hex");
}

export function matchingRecoveryHash(code: string, hashes: string[]): string | undefined {
  const candidate = Buffer.from(hashRecoveryCode(code), "hex");
  let match: string | undefined;
  for (const hash of hashes) {
    const stored = Buffer.from(hash, "hex");
    if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) match = hash;
  }
  return match;
}