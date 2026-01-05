// Generate a random 8-character alphanumeric code
// Uses only uppercase letters and numbers, excluding confusing characters (0, O, I, L, 1)
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}
