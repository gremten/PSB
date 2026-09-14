import { NextResponse } from "next/server";
import { beginParticipantScenario, getParticipantScenarioStatus, leaveParticipantScenario } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const status = await getParticipantScenarioStatus(id);
  return status ? NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ status: await beginParticipantScenario(id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать сценарий" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await leaveParticipantScenario(id);
  return NextResponse.json({ skipped: true }, { headers: { "Cache-Control": "no-store" } });
}
