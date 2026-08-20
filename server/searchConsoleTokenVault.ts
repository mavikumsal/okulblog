import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function encryptionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET Search Console token kasası için gereklidir.");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  if (!value.trim()) throw new Error("Şifrelenecek secret boş olamaz.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string) {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");
  if (version !== VERSION || !ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Şifreli entegrasyon verisi geçersiz.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export function encryptSearchConsoleToken(value: string) {
  if (!value.trim()) throw new Error("Şifrelenecek token boş olamaz.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSearchConsoleToken(payload: string) {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");
  if (version !== VERSION || !ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Search Console token kasası verisi geçersiz.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export function maskSearchConsoleToken(value?: string | null) {
  if (!value) return null;
  return value.length <= 8 ? "••••••••" : `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
