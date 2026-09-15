# ChatGPT handoff: safe visual work in PSB

This file is the operating manual for a general ChatGPT or coding assistant working on the repository. Read it completely before editing. Then read `AGENTS.md`, `docs/ARCHITECTURE.md`, and `AGENT_READ_ME.md`. The latter records approved visual decisions but does not authorize architecture changes. `AGENTS.md` and `docs/ARCHITECTURE.md` are authoritative if this summary ever differs from them.

## Mission

The application logic, research instrumentation, session lifecycle, moderator access, participant state, Telegram bridge, routes, persistence, and deployment contracts already exist. The default job is to correct visual fidelity screen by screen without changing those contracts.

A request such as “move this”, “match Figma”, “fix the color”, “replace the image”, “make this responsive”, or “repair this screen” authorizes presentation work only. It does not authorize a refactor or a product-logic change.

## Mandatory startup checklist

Before every task:

1. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `AGENT_READ_ME.md`, and this file.
2. Run `git status --short`. Existing changes belong to the user; do not overwrite or reformat them.
3. Identify one named route, component, or visual defect from the request.
4. Inspect its current implementation before proposing a change.
5. If a Figma node is relevant, inspect the exact live node and its component dependencies before writing code.
6. Completely ignore the Figma group `Итерации`: do not open it or use it as reference material.
7. Keep the diff limited to the named screen, its route-specific selectors, and its exact local assets.

Do not guess dimensions, spacing, colors, effects, typography, assets, component variants, or behavior that can be read from live Figma. If live Figma is genuinely ambiguous or contradicts the request, ask one concise question before editing.

## Source priority

Use sources in this order:

1. The user's latest explicit instruction and supplied screenshot/video.
2. The exact current live Figma frame or component.
3. The current live Figma UI Kit and variables.
4. Existing project components and tokens that already match the design.
5. Saved documents for research logic and historical context only.

Never merge a historical snapshot with the current live file as if they were one design version. Do not “improve” or reinterpret the design.

## Repository map

### Participant screens

| Screen | Route file | Presentation owner | Assets | Live Figma source |
|---|---|---|---|---|
| Home | `src/app/(participant)/page.tsx` | `src/features/bank/bank.module.css`, selectors local to home | `public/figma/home/**` | Header `825:4490`, promo `2072:15897`, hidden accounts `2125:27356` |
| Account | `src/app/(participant)/account/page.tsx` | `src/features/bank/bank.module.css`, `.account*` selectors | `public/figma/account/**` | Screen `2125:27685`, background `2125:27688`, animation component `1123:2108` |
| Card | `src/app/(participant)/card/page.tsx` | route-specific card selectors in `src/features/bank/bank.module.css` | `public/figma/card/**` | Flip components `2224:7924`, `2224:7960`, `2224:7931`, `2224:7965` |
| Cashback | `src/app/(participant)/cashback/page.tsx` | route-specific cashback selectors in `src/features/bank/bank.module.css` | `public/figma/cashback/partner-*.svg`, existing shared/category assets | Disconnected live frame `2072:16263`, connected `2125:27598` |
| Category selection | `src/app/(participant)/cashback/categories/page.tsx` | route-specific category selectors in `src/features/bank/bank.module.css` | `public/figma/categories/**` | Inspect the exact live screen/component before editing |
| Empty demo routes | `payment`, `chat`, `more` route files | no product content by design | none unless explicitly requested | These routes must remain unavailable |

`src/features/bank/bank.module.css` is shared by several screens. Editing that file is allowed only through selectors belonging to the requested route. Do not modify a generic/shared selector merely because it is convenient; add or refine a route-scoped selector instead.

### Shared participant UI

- `src/features/bank/bank-ui.tsx`: shared `BankHeader` renders the existing profile/detail wrappers, one sticky progressive-blur substrate, toolbar and back control; also contains tabbar, transactions, and cards. Treat its public component props, tracking, and behavior as read-only during screen-level visual work. In fullscreen Telegram, every participant route uses the same unpadded stage and the shared header alone reserves `--app-tg-safe-top`; do not add route-level top padding or header blur. The Figma 123 px blur measurement includes the native status area.
- `src/components/ui/**`: shared primitives. Do not redesign or refactor them for one screen.
- `src/app/globals.css`: global viewport, reset, and application-shell behavior. Do not use it for a local visual fix.
- `src/app/(participant)/layout.tsx`: participant shell ownership. Do not change it for a local screen fix.
- `src/features/telegram/telegram-mini-app.tsx`: Telegram fullscreen, safe-area, and bridge behavior. Protected unless the user explicitly requests Telegram behavior.

### Moderator and research system

- Moderator pages: `src/app/moderator/**`.
- Moderator visual styles: `src/app/moderator/moderator.module.css`.
- Session/replay UI: `src/features/usability/**`.
- Tracking and participant state: `src/lib/testing/**`.
- Database and lifecycle: `src/lib/db/**`.
- API routes: `src/app/api/**`.
- Scenario registry: `src/config/test-scenarios.ts`.

These are protected during ordinary visual work. The moderator reads, exports, replays, ends, deletes, and assigns one of three interactive scenarios to a participant-created pending session. It does not create participant sessions. Participant sessions and product state must remain separate. See the scenario lifecycle in `docs/ARCHITECTURE.md` before touching gates, tracking, task runs, or replay.

## What may be changed without architecture permission

For the specifically named screen only:

- layout, spacing, sizing, alignment, wrapping, overflow, and scrolling;
- route-scoped colors, typography, borders, radii, shadows, blur, glass, opacity, and animation styling;
- responsive CSS for the same screen;
- replacing an asset with the exact current Figma export;
- markup changes strictly required for visual layout, provided semantics, interactions, state transitions, and `data-track` values remain unchanged;
- accessibility improvements that do not change product behavior.

Prefer CSS changes. Preserve the current DOM and component interface whenever possible.

## What is frozen without explicit user permission

Never change, rename, move, delete, merge, or reinterpret:

- routes or route ownership;
- shared component props or contracts;
- participant product-state fields, migrations, storage keys, or transitions;
- research/session state, identity, heartbeat, timeout, end/delete behavior;
- moderator permissions, authentication, cookies, or secrets;
- event names, `data-track` values, metadata sanitization, metrics, replay semantics, or privacy guards;
- API endpoints, database schema, migrations, D1 bindings, Wrangler/Vinext configuration, or dependencies;
- Telegram bridge behavior or global safe-area rules;
- demo guards or deliberately empty Payments, Chat, and More routes;
- architecture-contract tests.

Do not perform broad cleanup, file moves, dependency upgrades, abstraction work, or unrelated formatting. A visual task is not permission to fix a known scenario gap.

If the requested result truly requires one of these changes, stop and ask the user to approve that exact contract change. Do not silently work around the freeze.

## Existing behavior that visual work must preserve

- Important controls retain stable semantic `data-track` identifiers.
- Unavailable controls return demo feedback and do not navigate into forbidden flows.
- Home promos can be dismissed and content moves into the released space.
- Account values can be hidden and restored.
- Home sections collapse and expand with their existing state.
- Account background uses its six-state 39-second animation.
- Card selection uses horizontal swipe; card details flip on tap/keyboard and use fake values only.
- Cashback current-month and next-month states remain separate. Next-month progression is `locked → available → draft → confirmed`; confirmation requires exactly three categories.
- Replay mode (`?replay=1`) does not emit participant events or heartbeat writes.
- Active sessions emit throttled `scroll` / `screen.scroll` samples containing only `scrollY` and viewport height. They are replay-only continuity data: never count them as actions, steps, or errors. Replay reconstructs success sheets and the card-copy toast from events, runs at fixed 1×, and interpolates scroll between samples.
- Timing analytics and STARL/CSV exports use only each task run's `startedAt → endedAt` interval. Session-level timestamps are audit context only; never count waiting for moderator assignment, explanation, or the next `Старт` as completion time.
- Tracking is best-effort and must never block a participant action.
- Entering a pseudonym through the orange `Начать тест` action creates an unrecorded pending session. Only the subdued top-right `Без сессии` control on that first screen enters the unrecorded demo; scenario waiting/assignment/end gates have no such escape. Only `Старт` after moderator assignment starts a task run and recording. Card copy finishes when its upper toast disappears; first and next-month cashback finish on a valid sheet dismissal. The client locks instrumentation on that terminal action and uses the event response for the next gate instead of waiting for polling. The third flow is unavailable until first cashback connection; all three completions end the session. Preserve server-classified `scenarioVerdict` on taps: correct/recovery is green, errors red, and category help or Cashback month/year exploration is yellow `info` rather than a missclick. Opening the savings account during card copy is red/error because it has no card data and cannot advance the scenario. Scroll is not an error.
- Never record payment values, card/clipboard data, passwords, contact data, or participant names in event metadata.
- The moderator JSON download is the canonical AI-analysis artifact (`psb.usability.starl.v3`): preserve raw `session`/`taskRuns`/`events`, STARL evidence records, the embedded Russian analysis prompt, ordered interaction narratives, schema version, event citations, and the observation/inference/recommendation boundary. CSV is a flat event interchange and must retain its legacy first eight columns. Never silently cap export events; moderator live views may remain bounded.

If a layout edit changes an interactive element, verify that its existing handler, keyboard semantics, disabled state, and tracking ID are still attached.

## Responsive and Telegram rules

- Mobile and Telegram participant content is limited to 440 px width and 980 px height where the existing shell defines those bounds.
- Desktop uses the full browser viewport without a fake device frame, border, or maximum dimensions.
- Telegram participant mode remains fullscreen on phones and windowed on desktop.
- Respect Telegram and browser safe-area insets. Do not hardcode a replacement for the existing bridge calculations.
- The fixed tabbar must visually merge with the bottom system area and keep equal-width items.
- Do not change global overscroll, fullscreen, close-swipe prevention, header, or tabbar behavior unless the user explicitly asks for that shared behavior.

## Asset rules

- Use the real local/Figma asset rather than approximating it with a random icon, emoji, gradient, or placeholder.
- Figma asset download is pre-approved; save it under the matching `public/figma/<screen>/` directory.
- Never leave temporary Figma MCP URLs or files from a system temp directory in application code.
- Preserve vector assets when practical. Use WebP for raster imagery and appropriately encoded WebM/MP4 only when motion cannot be represented efficiently in CSS/SVG.
- Size raster assets close to their rendered requirement; do not ship a 1200×1200 avatar for a 40×40 frame.
- Do not alter an asset's geometry, crop, filter canvas, or aspect ratio without comparing the rendered result to the target frame.

## Safe implementation workflow

1. Locate the exact route markup and route-scoped CSS selectors with `rg`.
2. Inspect the exact Figma node and required component variants; note the node ids used.
3. Compare current code to the target and list concrete mismatches.
4. Make the smallest patch possible. Do not touch protected modules.
5. Preserve every existing handler, state call, semantic element, and `data-track` value.
6. Review `git diff` for unrelated or generated changes.
7. Run the required checks:

   ```text
   npm run typecheck
   npm run lint
   npm test
   git diff --check
   ```

8. If a build modifies `next-env.d.ts`, restore it to the tracked version unless the user explicitly requested that generated change.
9. Report the exact files changed, the exact Figma nodes inspected, checks run, and any remaining visual uncertainty. Never claim “1:1 with Figma” without inspecting the exact live node.

## New interactive components

Create one only if the requested interaction does not already exist. It must be additive and local, use existing tokens/primitives, preserve privacy rules, give important controls stable semantic tracking IDs, and include focused tests for its state transitions. Register it in `docs/ARCHITECTURE.md` with owner route, Figma node, state, emitted events, and assets. If it changes an existing contract, obtain explicit permission first.

## Git and Cloudflare handoff

- Do not commit, push, migrate, or deploy unless the user asks for it or the current conversation already grants that authority.
- Commit only the reviewed task files; never include secrets, `.env*`, build output, or unrelated changes.
- `npm run build` uses Vinext. A successful Git push does not prove that Cloudflare deployed.
- For a visual-only production update, do not run database migrations. Build and deploy with `npm run deploy:vinext` only when deployment is authorized.
- Verify production by requesting the public route or changed asset with a cache-busting query and comparing its content/hash to the local artifact.
- Telegram may cache assets after production is updated; verify the public response first, then advise reopening the Mini App.

## Required final response

Keep it factual and short. State:

- what changed;
- which files changed;
- which checks passed;
- whether GitHub and Cloudflare were actually updated;
- anything still requiring the user's visual review.

Do not hide failures, claim deployment from a Git push alone, or claim fidelity without evidence.
