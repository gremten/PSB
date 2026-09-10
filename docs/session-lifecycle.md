# Session lifecycle

Each named participant owns a UUID stored in that tab's sessionStorage. Skip creates no database session. Product state remains separate. Replay produces neither presence heartbeats nor tracking requests.

Visible participants POST presence every 15 seconds. After 90 seconds without a signal (closed, crashed, or background client), the session is considered ended. Expiration is persisted on the next moderator read or client request; it does not require an in-memory Worker timer. `ended_at` is the last presence timestamp, not the time the moderator opened the table. A short reload can reconnect. An expired/manually ended/deleted session cannot be reopened by a late heartbeat.

- Participant: `POST /api/testing/sessions/[id]/heartbeat` returns only `{ active }`.
- Moderator (authenticated): `PATCH /api/moderator/sessions/[id]` with `{ action: "end" }` preserves the recording and freezes its time.
- Moderator (authenticated): `DELETE /api/moderator/sessions/[id]` removes that session's events and task runs atomically. The UI requires confirmation and explains that deletion is permanent. Export first to preserve a copy.
- Unfinished task runs are marked corrupted when a session ends, not falsely counted as task success/failure.
- Dashboard polls durable D1 data every 4 seconds, including the selected snapshot/status. It does not rely on a process-local EventEmitter to deliver events across Cloudflare isolates. Hidden dashboards pause polling.

Migration `0002_session_presence.sql` backfills old records from their last event. Historical disconnected sessions therefore stop accumulating time after deployment. No recordings are deleted automatically.

Verification: `src/lib/db/session-lifecycle.test.ts` covers independent clients, reconnection, expiration, manual completion, rejection of late events, and scoped deletion with foreign keys enabled.
