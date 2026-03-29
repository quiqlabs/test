import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(":");

  if (!salt || !hashHex) {
    return false;
  }

  const hashBuffer = Buffer.from(hashHex, "hex");
  const candidate = (await scryptAsync(password, salt, 64)) as Buffer;

  if (candidate.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidate, hashBuffer);
}
