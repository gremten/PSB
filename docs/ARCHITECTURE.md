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
| D1/SQLite `sessions`, `task_runs`, `events` | `schema.ts` + migrations | Durable research data. `sessions.assigned_scenario` is a moderator-assigned, per-session pending task; active/completed runs remain in `task_runs`. |
| D1/SQLite `research_control` | `schema.ts` | Existing legacy task-control record; do not connect it to participant product state or remove it without permission. |

These names and meanings are migration-sensitive and cannot be renamed by a visual task.

## Route registry

| Route | Surface | Contract |
|---|---|---|
| `/` | Participant home | Main bank overview, horizontal promos/accounts, hide accounts, quick actions, collapsible history/currency, tabbar. |
| `/account` | Participant account | Payment account overview, card badges, actions, history, settings, animated background; tabbar hidden. |
| `/card` | Participant card | Three-card carousel, swipe selection, tap/keyboard flip, fake card-data copy; tabbar hidden. |
| `/cashback` | Participant cashback | Disconnected benefit view or connected statistics/current and next-period view. |
| `/cashback/categories` | Participant cashback | Three-category selection for current or next month; tabbar hidden. |
| `/payment`, `/chat`, `/more` | Deliberate empty routes | Tabbar prevents navigation and shows demo feedback. Do not add content without explicit scope. |
| `/moderator` | Moderator | Authenticated session table, generic interaction metrics, live event list, end/delete. |
| `/moderator/sessions/[id]` | Moderator | Authenticated metrics, export links, event log, continuous action replay with timed tap marks. |

API route ownership:

- Participant writes: `POST /api/testing/sessions`, `POST /api/testing/sessions/[id]/heartbeat`, `GET/POST/DELETE /api/testing/sessions/[id]/scenario`, `POST /api/events`. The scenario GET exposes only status/codes to the UUID-bearing participant; POST starts the moderator-assigned flow; DELETE exits to unrecorded demo.
- Moderator authenticated reads/mutations: `/api/moderator/**`.
  `PATCH /api/moderator/sessions/[id]` with `assign_scenario` assigns one of the three approved flows without starting its recording.
  `GET /api/moderator/metrics` also returns an on-demand cross-session case-study summary. Its percentages count distinct recorded sessions/participants, with explicit denominators; the cashback-entry discovery split uses only participants who started a cashback scenario and their first badge/tab entry.
- Existing `/api/testing/state` and stream routes expose legacy research-control state. Do not expand or repurpose them without an architecture request.

## Figma screen and component registry

The live file `liWo1Xcsx04YGTZx3OqZNV` and live UI Kit are authoritative. The group `Итерации` is excluded and must never be used.

| Code owner | Live Figma source | State/interactions | Local assets | Tracking namespace |
|---|---|---|---|---|
| Home route + `ProfileHeader` + `Tabbar` | Header `825:4490`; toolbar `1488:4615`; promo `2072:15897`; hidden-account reference `2125:27356`; live UI Kit tabbar `1338:4518` | Promo dismissal, horizontal scrolling, account hiding, block collapse, currency segment, tab demo guards; header toolbar uses optical glass; tabbar's five 24 px icon silhouettes follow the live UI Kit | `public/figma/home/**` | `home.*`, `header.*`, `tab.*`, `cashback.tab.open` |
| Account route + `DetailHeader`, `Transaction`, `SettingsRow` | Screen `2125:27685`; card badge `2125:27698`; back control `1488:4222`; background instance `2125:27688`; live variant set `1123:2108` | All three card badges navigate to their matching card, including salary `*3451` without demo feedback. The salary miniature is purple per the user's instruction, overriding the orange miniature in the current account frame. Other unavailable controls emit demo feedback; 39 s six-state background loop; shared back control has bounded gel-pull interaction with no new analytics event | `public/figma/account/**` | `account.*`, `navigation.back` |
| Card route + card-flip pieces | Flip components `2224:7924`, `2224:7960`, `2224:7931`, `2224:7965` | Sticky detail header; three cards follow a horizontal drag and switch one adjacent card after a 64 px gesture; shorter drags snap back. Salary `*3451` reuses the Figma purple/night front/back variant with its own fake data and stable `card.salary.*` events; there is no distinct salary flip variant in these source nodes. Switching cards closes revealed details and returns all three to their fronts. Card-surface touch gestures stay within the carousel rather than scrolling the viewport; only transforms animate on release. Tap/keyboard flip and fake detail copy remain unchanged. Replay stores three flip sides and card indexes `0–2`. | Existing `public/figma/card/**` purple/night assets | `card.*`, `navigation.back` |
| Cashback disconnected | Live screen `2072:16263` | Four full-tile demo-only controls in the two-row bento (no navigation or product-state change), start category connection, FAQ | `public/figma/cashback/partner-*.svg` | `cashback.benefit.*`, `cashback.connect.*`, `cashback.faq.*` |
| Cashback connected | Screen `2125:27598`; new-period live variant `2072:24153`; confirmed next-month variant `2159:15752`; annual chart `1923:15118` | Current/annual segment, next-month state and category entry; confirmed next-month banner names October and shows the saved three category icons with Figma tile backdrops and rate labels for any selection. Once confirmed it is display-only: only an available/draft selection has the `cashback.next_month.categories.open` entry action, and tapping the confirmed banner cannot reopen the picker. The unconfirmed banner description keeps the generic next-month wording. Annual chart shows a May–April historical year, with April at the right edge and older months only to its left. May–October have deterministic fake values. The chart starts at its rightmost scroll position and keeps native horizontal scrolling with scroll-linked column scale (0.88–1) based on visible width. | Existing `public/figma/home/banner-new-bg.svg`, exact selected-icon exports `public/figma/cashback/next-month-*.png` (Figma `2167:7206`, `2167:7205`, `2167:7204`), and transparent `public/figma/categories/asset-*.webp` icons over their Figma tile colors | `cashback.period.*`, `cashback.next_month.*`, `cashback.year_chart.scroll` |
| Category selection | Live connecting screen `2072:16481`; next-month variant `2159:14600` | Up to three choices, invalid confirmation feedback, current/next-month branch. Each row except its separate centered 44×44 FAQ hit area toggles the checkbox; FAQ keeps the original 24 px glyph, emits demo-unavailable feedback, and does not change selection. Only the checkbox or FAQ glyph scales on press. The live branch is fixed on entering the screen, so current-month confirmation cannot briefly turn the open selection sheet into October while navigating; moderator replay still follows its recorded product state. Next-month selection names October in its title and confirms with `Выбрать`, then returns to `/cashback?next-month-success=1`. Fixed single-action bottom bar with 32 px top corners and 46 px button bottom spacing, small card scroll parallax, account SVG geometry/filter with the 39 s purple loop and a category-only shallower position path; Telegram fullscreen header/stage use page color and account-style safe-top layout | `public/figma/categories/**` | `cashback.category.*`, `cashback.categories.*`, `cashback.next_month.*` |
| Cashback success state | Live screen `2072:17190` | Home-owned bottom sheet overlays the tabbar in the participant viewport; route-local title spacing places the copy nearer the fixed-height confirmation button without moving the button or changing the next-month sheet. Dismiss by the existing `Хорошо!` button or a deliberate downward handle drag (80 px), with a 200 ms fade. Both use the existing `cashback.success.dismissed` product-state transition; short drags snap back. No new banking or research state. | `public/figma/success/**` | `cashback.success.close`, `cashback.success.drag`, `cashback.success.dismissed` |
| Next-month confirmation sheet | Live screen `2159:15362` | Additive local `/cashback` overlay appears only after a confirmed next-month choice and the one-time `next-month-success=1` URL marker. The existing 200 ms fade, 80 px handle-dismiss gesture, and 164 px artwork are reused; dismissal clears the marker without changing the confirmed product state. | Existing `public/figma/success/asset-14.webp` | `cashback.next_month.success.close`, `cashback.next_month.success.drag`, `cashback.next_month.success.dismissed` |

The shared `ParticipantShell` owns one fullscreen Telegram viewport for every participant route. In fullscreen mode the stage has no top padding: page backgrounds can extend behind native chrome, while the shared `BankHeader` reserves `--app-tg-safe-top` in the normal document flow. The header's `ProfileHeader` and `DetailHeader` variants retain their props/tracking and share one sticky progressive-blur substrate spanning the native inset, 61 px web header, and 8 px fade tail. This keeps scrolling content behind a blurred header instead of exposing it above the Telegram controls. Figma header `825:4490` includes the native status area in its 123 px layer; do not add a second route-level blur. Cashback's `#161a20` top page surface from `2072:16263` extends through the inset, but the header itself has no opaque gray substrate. Account and category backgrounds retain their own full-bleed animation/color. No route may override stage top padding or the header's Telegram safe-top geometry.

The four disconnected cashback benefit controls are owned by `/cashback` and sourced from `2072:16263`. They preserve the bento content and local partner SVG assets, emit their stable `cashback.benefit.*.open` tap target followed by `demo.unavailable`, and do not mutate cashback state or navigate.

Do not reuse a node id for a different screen. If a missing exact node is needed, retrieve it from the live file and add it to this table before claiming fidelity.

## Participant product state machine

Canonical type: `ParticipantProductState` in `src/lib/testing/types.ts`. Persistence and legacy normalization: `participant-state.ts`.

- `cashbackConnected`: connection for the current month.
- `selectedCashbackCategories`: confirmed current-month categories.
- `nextMonthCashbackCategories`: draft or confirmed next-month values.
- `nextMonthCashbackSelectionStatus`: `locked → available → draft → confirmed`.
- `cardDetailsRevealed`: persisted card disclosure state. A card selection closes any revealed card, clears this flag, and records `card_selection.metadata.closedDetails`; replay applies the flag only to new events so earlier recordings retain their historical behavior.
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

A participant who enters a pseudonym creates one **pending**, unrecorded session. The moderator chooses a scenario for that session; the participant sees its text prompt and presses `Старт`. Only then does `started_at` become non-null, a `task_run` begin, and events acquire that run ID. Between flows, the participant returns to a waiting gate and no product interaction is recorded. The only unrecorded-demo escape is the subdued top-right `Без сессии` control on the original name gate; it creates no database session. Waiting, assigned, completed, and ended scenario gates do not expose that control. The name gate submits through the orange `Начать тест` primary action. The gate is an additive component owned by `ParticipantShell`, with no Figma node (user-supplied text-only brief), local `scenario-gate.module.css`, stable `participant.session.create/skip` and `participant.scenario.start` IDs, and no new banking state or assets.

There are exactly three interactive flows: `CARD_COPY` (home account → account card badge → card flip → copy any fake card field → copied toast disappears), `CASHBACK_CONNECT` (home badge/tab → disconnected offer → three current categories → confirm → dismiss home success sheet), and `CASHBACK_NEXT` (home badge/tab → next-month banner on the Cashback page → three October categories → confirm → dismiss Cashback success sheet). Both `Хорошо!` and the existing successful sheet swipe count as valid dismissal. The next-month flow is assignable only after first cashback connection. The moderator can choose card/connection in either order, shows a check mark on completed flows, and never creates a participant session. After all three runs finish, the session ends with `all_scenarios_completed` but recordings are retained.

Success-sheet dismissal tracking is tolerant of network reordering: the dismissal action may reach the server before the capture-phase tap by a few milliseconds. A late `cashback.success.close|drag` or `cashback.next_month.success.close|drag` tap remains correct after the scenario reaches its completed stage, and replay/metrics reclassify matching historical taps as correct even if their stored legacy verdict was `error`.

A visible client sends a heartbeat every 15 seconds. After 90 seconds without presence, even a pending session ends at its last presence time. Replay sends neither heartbeat nor events. The moderator may still view/export, explicitly end, or explicitly delete a session.

Details and tests are in `docs/session-lifecycle.md` and `src/lib/db/session-lifecycle.test.ts`.

## Instrumentation and replay contracts

- Every important control has a stable semantic `data-track` value.
- A capture listener records tap coordinates, viewport, target box, and scroll position.
- `track()` is best-effort and must never block the participant flow.
- Replay query `?replay=1` disables participant writes and presence.
- `sanitizeMetadata()` rejects values, clipboard/card fields, contact/name/password fields, and other sensitive keys.
- Card values are fake. They may be copied for the task but must never be added to metadata.
- Moderator replay derives a read-only visual state from recorded semantic events and sends it to the `?replay=1` participant iframe over a same-origin parent/child message bridge. It restores supported product and local UI states (card selection/flip, home visibility/promos/sections/currency, cashback connection/categories/period/FAQ) at each timeline position, including backward seeking, without writing participant storage, sessions, or events. Screen transitions use client-side route replacement inside the same iframe, avoiding a full reload. The iframe acknowledges its rendered state before tap geometry is remeasured.
- Playback preserves event order but caps idle gaps at 1200 ms, gives ordinary consecutive events at least 100 ms, and preserves consecutive scroll samples down to 16 ms; original wall-clock timestamps remain visible in the timeline. New events also carry a non-sensitive client timestamp to prevent network arrival order from displacing taps. The timeline list is memoized and tap geometry is measured on action/state boundaries, not on every playback tick.
- Each tap pulse is anchored to the same `data-track` target using its recorded hit position within the target, rather than scaling absolute viewport coordinates; this avoids Telegram safe-area offsets. Interactive-flow taps carry a server-classified `scenarioVerdict`: green for a relevant step or recovery from a wrong section, red for an unrelated control, and yellow `info` for deliberate interface exploration. Category `?` controls and the Cashback month/year chart segment are informational: they add time/steps and a separate exploration count but never add a missclick; the demo-feedback action paired with a category `?` is also excluded from missclicks. The gate-level `participant.scenario.start` tap is excluded server-side because recording begins after it; metrics and replay also ignore historical copies created by request-order races. Scrolls are not taps or errors. Wrong navigation remains recorded even after a return. If the historical target never appears, no inaccurate marker is invented. Replay is not a screen video or a complete historical DOM reconstruction; unrecorded animations, scroll between events, and arbitrary input cannot be reproduced.
- Unavailable participant controls retain their existing semantic `tap` event and additionally emit `action: demo.unavailable` with only the control's stable `data-track` target. This records a missclick without input values. Moderator `missclickCount` counts those actions; legacy taps whose IDs contain `unavailable` remain supported without double counting a paired action. Replay presents the orange unavailable toast for up to three seconds of its compressed timeline.
- Participant demo feedback and the card-copy confirmation use the additive `GlassToast` component (`src/features/usability/glass-toast.tsx`). Only the upper card-copy toast uses the existing `@samasante/liquid-glass` material; lower demo-feedback toasts use a solid orange surface. Owner surfaces: participant shell, `/card`, moderator live dashboard, and moderator replay; reference for the card-copy badge is Figma node `2072:14794`, while demo feedback has no claimed exact live Figma node. All auto-dismiss after three seconds idle, animate in/out over 200 ms, and follow a swipe toward their nearest viewport edge with proportional scaling. The toast hit area is at least 44 px high, and its pointer gesture stops before the card carousel. Dismiss controls use `demo.unavailable.toast.dismiss`, `card.copy.toast.dismiss`, `moderator.live.demo_toast.dismiss`, and `moderator.replay.demo_toast.dismiss`. The upper copy toast is 4 px lower than the prior implementation; lower demo toasts are unchanged. Its `card.copy.toast.closed` event finalizes the card flow without recording clipboard contents. The live dashboard shows a toast only for newly observed missclick events in the selected session. No new banking state is introduced.

Stable event families: `screen_view`, `tap`, `scroll`, `action`, `navigation`, `product_state_change`, `card_selection`, `session_started`, `session_ended`, `task_started`, and `task_finished`. `scroll` uses the stable `screen.scroll` action and records only a throttled `scrollY` plus viewport height; it is neither a meaningful step nor an error. Existing action/target strings are analytics keys and cannot be renamed for presentation cleanup.

The moderator dashboard's collapsible `Саммари по сессиям` is calculated on demand from durable sessions, task runs, and taps. It exposes first cashback entry via the money badge versus the Benefit tab, completion of all/individual scenarios, error-free sessions, recoveries, category-help discovery, and annual-chart discovery. Every tile shows `count / denominator / percent`; task completion uses participants who started that task, cashback-entry choice uses participants who started a cashback task, and global behaviors use all recorded sessions. Pending sessions that never started are excluded. A separate mutually exclusive journey-quality split always totals 100% of successful task runs: recovery detours take precedence, then other errors, then informational exploration, then ideal paths with none of those actions. Incomplete and corrupted runs are excluded from this quality denominator.

Participant route modules and the static assets needed by the three flows are prefetched and decoded asynchronously while the participant waits for or receives a scenario. Prefetching is refreshed when a new scenario is assigned. Session completion performs a one-time hard navigation to discard Next's in-memory Router Cache; immutable public Figma assets may remain in the browser's ordinary HTTP cache because they contain no participant or research data. Replay uses the same preloader inside its iframe. The replay detail reads the full ordered event stream rather than the bounded live-dashboard snapshot, runs only at 1×, paints its clock at animation-frame cadence, interpolates recorded scroll samples, restores copy toast/current-month/next-month success-sheet visibility from durable events, and visually separates task start and task finish boundaries.

Session JSON export is versioned as `psb.usability.starl.v2`. It remains backward-readable by retaining the raw `session`, `taskRuns`, and ordered `events`, while adding scenario coverage and one evidence-backed STARL record per task run. Situation and Task carry build/context and the approved participant prompt/success condition; Action carries chronological semantic events, elapsed milliseconds from that scenario's start, verdicts, and counts; Result carries completion, scenario duration, journey segment, and event-sequence confirmation; Learning deliberately contains cited evidence signals rather than an invented conclusion. Session timestamps remain audit context, but total session elapsed time is not an analytical field: waiting for assignment, moderator discussion, and time before `Старт` must never enter timing aggregates. Downstream automation must use only task-run timing, distinguish observation, inference, and recommendation, and cite event IDs. CSV retains its original first eight columns and appends schema, participant/build, scenario, task timing, semantic ID, and verdict columns. Exports use an unbounded ordered event query so they are never silently truncated; live moderator snapshots remain bounded. `participantCode` is the study pseudonym. Metadata has already passed the ingestion privacy sanitizer, and exports must not introduce banking values, clipboard contents, or other personal data.

## Scenario map and current readiness

The source protocol is `docs/psb-usability-protocol.md`; executable task metadata is `src/config/test-scenarios.ts`. The A/B rows below remain historical protocol references, not moderator-assignable interactive flows. Only `CARD_COPY`, `CASHBACK_CONNECT`, and `CASHBACK_NEXT` are assignable in the current three-flow test.

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
2. The approved interactive flows have golden tap counts `4 / 7 / 7`; completion-only lifecycle actions remain separate evidence and do not inflate those tap counts. Historical A/B protocol rows still have `goldenStepCount: null` and must not be fabricated.
3. The three interactive flows use automatic task start/finish and expose completion, correct/error/recovery tap counts, timing, and per-flow replay seek points. Legacy A/B ease-score controls remain unexposed; do not fabricate moderator assistance or ease ratings.
4. Replay is not audiovisual recording.
5. Visual fidelity is still screen-specific work. Architecture completeness does not imply that every screen already matches Figma.

## Change protocol

For a visual request, change only the named page/component, its scoped CSS, and exact assets. Preserve state, events, routes, and APIs. For a new interaction, add it locally, document it in the Figma/component registry and state/event sections, and test its transitions. Any change to an existing contract requires explicit user permission and a synchronized update to this document plus relevant tests/migrations.

Minimum verification for code: `npm run typecheck`, `npm run lint`, `npm test`, then inspect `git diff --check`. Build/deploy only after those pass.
