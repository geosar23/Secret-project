import { createHash, randomBytes, randomInt } from "crypto";

/** 256 bits of randomness, URL-safe. */
export const generateRawToken = (): string => randomBytes(32).toString("base64url");

export const hashToken = (raw: string): string => createHash("sha256").update(raw).digest("hex");

// No look-alike characters (0/O, 1/l/I) because the user may have to type it.
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "@#$%&*?";

/** 16-character random password with at least one of each class. */
export function generateTemporaryPassword(): string {
    const all = LOWER + UPPER + DIGITS + SYMBOLS;
    const pick = (set: string) => set[randomInt(set.length)];
    const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
    while (chars.length < 16) {
        chars.push(pick(all));
    }
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}
