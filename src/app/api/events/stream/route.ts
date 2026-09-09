import { NextRequest } from "next/server";
import { getSessionSnapshot } from "@/lib/db/queries";
import { eventBus } from "@/lib/events";
import { requireModeratorResponse } from "@/lib/moderator-api";
import type { TrackedEvent } from "@/lib/testing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId || !(await getSessionSnapshot(sessionId, 1))) return new Response("Session not found", { status: 404 });
  const initialEvents = (await getSessionSnapshot(sessionId, 100))?.events ?? [];
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (name: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
      send("ready", { sessionId });
      for (const event of initialEvents) send("tracked", event);
      const listener = (event: TrackedEvent) => send("tracked", event);
      eventBus.on(`session:${sessionId}`, listener);
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(": keepalive\n\n")); } catch {}
      }, 20_000);
      cleanup = () => { clearInterval(heartbeat); eventBus.off(`session:${sessionId}`, listener); };
      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
