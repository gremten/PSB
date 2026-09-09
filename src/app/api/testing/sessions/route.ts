import { NextResponse } from "next/server";
import { createParticipantSession } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { participantName?: string } | null;
    if (!body?.participantName?.trim()) {
      return NextResponse.json({ error: "Укажите имя или псевдоним" }, { status: 400 });
    }
    const session = await createParticipantSession(body.participantName);
    return NextResponse.json({ session }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать тест" }, { status: 400 });
  }
}
