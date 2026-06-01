import { randomBytes } from "crypto";

export function generateTemporaryPassword(length = 12): string {
  const chars =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}
