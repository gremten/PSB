# PSB architecture contract

Status: frozen baseline, 2026-09-10. This document describes the implementation that future visual work must preserve. `AGENTS.md` is the enforcement policy; this file is the map of what exists.

## System boundaries

The application has three deliberately separate layers:

1. **Participant product UI** — bank screens and fake product state in the participant browser.
2. **Research instrumentation** — participant identity token, semantic events, session presence, metrics, and replay.
3. **Moderator UI and persistence** — authenticated read/export/replay plus explicit end/delete operations over SQLite locally or D1 in Cloudflare.

Product state must never acquire moderator/session fields. Research state must never become the source of banking UI state. A visual edit must not cross these boundaries.

Runtime dependency direction:

`app routes → feature/components → lib contracts → database/runtime adapter`

UI modules may call the published helpers. They must not query the database directly. Participant client code never imports moderator auth or database modules.

## Stable storage and identity contracts

| Contract | Owner | Meaning |
|---|---|---|
| `psb-entry-role-v1` | `participant-shell.tsx` | Session-scoped participant gate; replay bypasses it. |
| `psb-participant-session-v1` | `tracking.ts` | UUID of a named participant session. Skip removes it and creates no DB record. |
| `psb-participant-product-state-v1` | `participant-state.ts` | Local fake banking/product state. It is reset for a new participant. |
| `psb_moderator` | `moderator-auth.ts` | HttpOnly moderator token derived from `MODERATOR_SECRET`. |
| D1/SQLite `sessions`, `task_runs`, `events` | `schema.ts` + migrations | Durable research data. |
| D1/SQLite `research_control` | `schema.ts` | Existing legacy task-control record; do not connect it to participant product state or remove it without permission. |

These names and meanings are migration-sensitive and cannot be renamed by a visual task.

## Route registry

| Route | Surface | Contract |
|---|---|---|
| `/` | Participant home | Main bank overview, horizontal promos/accounts, hide accounts, quick actions, collapsible history/currency, tabbar. |
| `/account` | Participant account | Payment account overview, card badges, actions, history, settings, animated background; tabbar hidden. |
| `/card` | Participant card | Two-card carousel, swipe selection, tap/keyboard flip, fake card-data copy; tabbar hidden. |
| `/cashback` | Participant cashback | Disconnected benefit view or connected statistics/current and next-period view. |
| `/cashback/categories` | Participant cashback | Three-category selection for current or next month; tabbar hidden. |
| `/payment`, `/chat`, `/more` | Deliberate empty routes | Tabbar prevents navigation and shows demo feedback. Do not add content without explicit scope. |
| `/moderator` | Moderator | Authenticated session table, generic interaction metrics, live event list, end/delete. |
| `/moderator/sessions/[id]` | Moderator | Authenticated metrics, export links, event log, semantic replay with timed click marks. |

API route ownership:

- Participant writes: `POST /api/testing/sessions`, `POST /api/testing/sessions/[id]/heartbeat`, `POST /api/events`.
- Moderator authenticated reads/mutations: `/api/moderator/**`.
- Existing `/api/testing/state` and stream routes expose legacy research-control state. Do not expand or repurpose them without an architecture request.

## Figma screen and component registry

The live file `liWo1Xcsx04YGTZx3OqZNV` and live UI Kit are authoritative. The group `Итерации` is excluded and must never be used.

| Code owner | Live Figma source | State/interactions | Local assets | Tracking namespace |
|---|---|---|---|---|
| Home route + `ProfileHeader` + `Tabbar` | Header `825:4490`; promo `2072:15897`; hidden-account reference `2125:27356` | Promo dismissal, horizontal scrolling, account hiding, block collapse, currency segment, tab demo guards | `public/figma/home/**` | `home.*`, `header.*`, `tab.*`, `cashback.tab.open` |
| Account route + `DetailHeader`, `Transaction`, `SettingsRow` | Screen `2125:27685`; background instance `2125:27688`; live variant set `1123:2108` | Card navigation only; unavailable controls emit demo feedback; 39 s six-state background loop | `public/figma/account/**` | `account.*`, `navigation.back` |
| Card route + card-flip pieces | Flip components `2224:7924`, `2224:7960`, `2224:7931`, `2224:7965` | Swipe/tap card selection, front/back flip, fake detail copy, hide details | `public/figma/card/**` | `card.*`, `navigation.back` |
| Cashback disconnected | Screen `2125:27312` | Benefit reading, start category connection, FAQ | shared icon/category assets | `cashback.connect.*`, `cashback.faq.*` |
| Cashback connected | Screen `2125:27598` | Current/annual segment, next-month state and category entry | shared category assets | `cashback.period.*`, `cashback.next_month.*` |
| Category selection | Exact live screen/component must be read before visual edits | Up to three choices, invalid confirmation feedback, current/next-month branch | `public/figma/categories/**` | `cashback.category.*`, `cashback.categories.*`, `cashback.next_month.*` |
| Cashback success state | Exact live screen/component must be read before visual edits | Dismiss success state | `public/figma/success/**` | `cashback.success.*` |

Do not reuse a node id for a different screen. If a missing exact node is needed, retrieve it from the live file and add it to this table before claiming fidelity.

## Participant product state machine

Canonical type: `ParticipantProductState` in `src/lib/testing/types.ts`. Persistence and legacy normalization: `participant-state.ts`.

- `cashbackConnected`: connection for the current month.
- `selectedCashbackCategories`: confirmed current-month categories.
- `nextMonthCashbackCategories`: draft or confirmed next-month values.
- `nextMonthCashbackSelectionStatus`: `locked → available → draft → confirmed`.
- `cardDetailsRevealed`: persisted card disclosure state.
- `cashbackSuccessVisible`: connection success overlay/sheet visibility.
- `accountsHidden`: sensitive home values hidden.
- `dismissedHomePromos`: dismissed promo ids; account content moves into released space.
- `homeHistoryCollapsed`, `homeCurrencyCollapsed`: home block presentation states.

Invariants:

- Disconnected cashback always means next-month status `locked` and no next-month categories.
- Connecting current cashback makes next-month selection `available`.
- One to three unconfirmed next-month categories are `draft`.
- `confirmed` requires exactly three categories and an explicit confirmation action; a non-empty array is not confirmation.
- Loading old local data repairs contradictory combinations instead of leaking impossible UI state.

See `docs/cashback-product-state.md` for event names and migration behavior.

## Research session lifecycle

A participant who enters a pseudonym creates and starts one independent session. Skip creates no session. A visible client sends a heartbeat every 15 seconds. After 90 seconds without presence, the session ends at its last presence time. Replay sends neither heartbeat nor events. The moderator may view/export, explicitly end, or explicitly delete a session; the moderator does not create participant sessions.

Details and tests are in `docs/session-lifecycle.md` and `src/lib/db/session-lifecycle.test.ts`.

## Instrumentation and replay contracts

- Every important control has a stable semantic `data-track` value.
- A capture listener records tap coordinates, viewport, target box, and scroll position.
- `track()` is best-effort and must never block the participant flow.
- Replay query `?replay=1` disables participant writes and presence.
- `sanitizeMetadata()` rejects values, clipboard/card fields, contact/name/password fields, and other sensitive keys.
- Card values are fake. They may be copied for the task but must never be added to metadata.
- Moderator replay is semantic reconstruction against current routes with red timed tap markers. It is not a video recording and does not reconstruct every historical DOM/product-state frame.

Stable event families: `screen_view`, `tap`, `action`, `navigation`, `product_state_change`, `card_selection`, `session_started`, `session_ended`, `task_started`, and `task_finished`. Existing action/target strings are analytics keys and cannot be renamed for presentation cleanup.

## Scenario map and current readiness

The source protocol is `docs/psb-usability-protocol.md`; executable task metadata is `src/config/test-scenarios.ts`.

| Scenario | Expected path/state | Current architectural support |
|---|---|---|
| A1/B1 Card details | Home → account → card → flip → copy fake number/expiry/CVV | Card discovery, flip, copy, and click tracking exist. The protocol's final payment-form validation does not: `/payment` is deliberately unavailable per current product instruction. Do not invent it. |
| A2 Understand cashback | Home/tab → disconnected cashback benefits | Route and semantic events exist. Verbal comprehension remains moderator observation. |
| A3 Connect cashback | Cashback → categories → choose three → confirm → success | Product transition and success state exist. |
| A4 Current categories | Select and explicitly confirm exactly three | Selection limit, invalid confirm feedback, persistence, and events exist. |
| B2 Current selection | Connected cashback view exposes current categories | State exists; visual fidelity/content still needs screen-level review against live Figma. |
| B3 New period | Connected cashback → next-month selection → draft → confirm | Explicit lifecycle and interpretable events exist. |
| B4 Annual cashback | Connected cashback → `Весь год` | Segment state and event exist. Verbal amount remains moderator observation. |
| B5 Recent payment | Home history | History and interaction tracking exist. |

Known intentional gaps are contracts, not invitations for silent implementation:

1. Payment-form validation for A1/B1 is absent because Payments must remain unavailable until the user changes that instruction.
2. `goldenStepCount` values remain `null`; do not fabricate them without an approved golden-path definition.
3. Generic session metrics and event replay work. Task start/finish/ease-score controls are not exposed in the current moderator UI, so task aggregates may remain empty.
4. Replay is not audiovisual recording.
5. Visual fidelity is still screen-specific work. Architecture completeness does not imply that every screen already matches Figma.

## Change protocol

For a visual request, change only the named page/component, its scoped CSS, and exact assets. Preserve state, events, routes, and APIs. For a new interaction, add it locally, document it in the Figma/component registry and state/event sections, and test its transitions. Any change to an existing contract requires explicit user permission and a synchronized update to this document plus relevant tests/migrations.

Minimum verification for code: `npm run typecheck`, `npm run lint`, `npm test`, then inspect `git diff --check`. Build/deploy only after those pass.
