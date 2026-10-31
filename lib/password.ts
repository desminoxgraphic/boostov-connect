/**
 * Easy-to-dictate strong password, e.g. "Kp7m-x9Qa-4tRb": three groups of four,
 * no look-alike characters (0/O, 1/l/I), always letters and digits.
 * Works in the browser and on the server.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generatePassword(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  chars[1] = String(2 + (bytes[1] % 8)); // guarantee a digit
  chars[6] = ALPHABET[bytes[6] % 23]; // guarantee a letter
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}
