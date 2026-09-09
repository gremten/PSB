import { NextRequest, NextResponse } from "next/server";
import { isModerator } from "./moderator-auth";

export function requireModeratorResponse(request: NextRequest) {
  return isModerator(request)
    ? null
    : NextResponse.json({ error: "Moderator authentication required" }, { status: 401 });
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 400 });
}
