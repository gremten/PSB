import { getResearchState } from "@/lib/db/queries";
import { eventBus } from "@/lib/events";
import type { ResearchSessionState } from "@/lib/testing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const initialState = await getResearchState();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (state: ResearchSessionState) => controller.enqueue(encoder.encode(`event: control\ndata: ${JSON.stringify(state)}\n\n`));
      send(initialState);
      const listener = (state: ResearchSessionState) => send(state);
      eventBus.on("control", listener);
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(": keepalive\n\n")); } catch {}
      }, 20_000);
      cleanup = () => { clearInterval(heartbeat); eventBus.off("control", listener); };
      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
