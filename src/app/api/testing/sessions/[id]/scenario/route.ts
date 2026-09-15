import { NextResponse } from "next/server";
import { beginParticipantScenario, getParticipantScenarioStatus, leaveParticipantScenario, recordParticipantEaseScore } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const status = await getParticipantScenarioStatus(id);
  return status ? NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { clientTimeMs?: number } | null;
    return NextResponse.json({ status: await beginParticipantScenario(id, body?.clientTimeMs) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать сценарий" }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { easeScore?: number } | null;
    if (!body || typeof body.easeScore !== "number") throw new Error("Укажите оценку от 1 до 7");
    const taskRun = await recordParticipantEaseScore(id, body.easeScore);
    return NextResponse.json({ taskRun }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось сохранить оценку" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await leaveParticipantScenario(id);
  return NextResponse.json({ skipped: true }, { headers: { "Cache-Control": "no-store" } });
}
