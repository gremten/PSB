import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const MODERATOR_COOKIE = "psb_moderator";

export function moderatorToken(secret = process.env.MODERATOR_SECRET) {
  return secret ? createHash("sha256").update(secret).digest("hex") : null;
}

export function isValidModeratorToken(token: string | undefined) {
  const expected = moderatorToken();
  if (!token || !expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function isModerator(request: NextRequest) {
  return isValidModeratorToken(request.cookies.get(MODERATOR_COOKIE)?.value);
}
