# E2E test plan (ChromeDriver)

Status: groups B, C and D are implemented in `e2e/card-copy.e2e.ts` and `e2e/cashback.e2e.ts` and run green; groups A, E and F are still specifications.

The suite drives a real Chrome through ChromeDriver against the Docker Compose dev stack, so it exercises the participant UI, the instrumentation, and the SQLite-backed research data in one pass. It is a black-box check of the contracts in [`ARCHITECTURE.md`](ARCHITECTURE.md): it must never reach into React state, and it must not become a second source of truth for visual fidelity.

## Environment

| Item | Value |
|---|---|
| App under test | `docker compose up`, `http://localhost:3000` |
| Participant viewport | 440 × 980 (mobile/Telegram contract) |
| Moderator viewport | 1440 × 900 |
| Moderator secret | `MODERATOR_SECRET` from `.env.local`, default `change-this-local-secret` |
| Research data | `data/psb-research.sqlite`; each run starts from a database the suite created |
| Element selectors | `[data-track="…"]` only — these are the stable semantic IDs the project already guarantees |

Rules for every case: reset the database and browser profile before the run (fresh `sessionStorage` per case, since `psb-entry-role-v1` and `psb-participant-session-v1` are session-scoped), never assert on pixel values, and never type real personal data — participant codes are `E2E-…` pseudonyms.

## A. Gate and session lifecycle

| ID | Case | Steps | Expected |
|---|---|---|---|
| A1 | Participant session is created | Open `/`, type `E2E-01`, tap `participant.session.create` | Gate is replaced by the scenario gate; `psb-participant-session-v1` holds a UUID; the session appears in the moderator table |
| A2 | Empty pseudonym is rejected | Open `/`, leave the field empty | The submit control stays disabled; no session row is created |
| A3 | Skip records nothing | Open `/`, tap `participant.session.skip` | The bank UI opens, `psb-participant-session-v1` is absent, and no session row is created |
| A4 | Waiting for an assignment | Create a session, do not assign anything | The gate says a task is awaited; no `Старт` control is offered |
| A5 | Moderator login | Open `/moderator`, submit the wrong secret, then the right one | Wrong secret shows an error and no dashboard; the right one reloads into the dashboard; the `psb_moderator` cookie is HttpOnly |
| A6 | Assign and start | Assign `moderator.scenario.card_copy.assign`, then tap `participant.scenario.start` | The participant lands on `/`; a task run is open; the start tap itself is not recorded as a scenario event |
| A7 | Ease score after completion | Finish any scenario | The gate asks the SEQ question; tapping `participant.seq.score.6` stores the score and returns to waiting |
| A8 | All three scenarios end the session | Complete CARD_COPY → CASHBACK_CONNECT → CASHBACK_NEXT | After the third, the session is ended with reason `all_scenarios_completed` and the participant sees the finished state |
| A9 | Next-month is gated | Try to assign `CASHBACK_NEXT` first | The control is disabled/refused until `CASHBACK_CONNECT` is complete |

## B. Scenario 1 — CARD_COPY

Golden path: `home.account.open` → `account.card.*.open` → `card.*.flip` → `card.*.<field>.copy`.

| ID | Case | Steps | Expected |
|---|---|---|---|
| B1 | Golden path completes ✅ | Walk the four taps, copying the card number | The run ends as `unaided` at the copy tap; all four taps are `correct`; the SEQ question appears |
| B2 | **Completion happens on the copy tap** (regression) ✅ | Copy a field and watch the run result | The run is complete well inside the 3 s toast lifetime, so hiding the details early can never leave it unfinished |
| B3 | **Any field completes, not only the number** (regression) ✅ | Copy the expiry as the first copy, then repeat with the CVV | Each completes the scenario and is recorded `correct`; no `error` appears in the run |
| B4 | **Any card completes** (regression) ✅ | Switch to another card, flip it, copy a field there | The copy is `correct` and completes the run regardless of which card it came from |
| B5 | Repeated copies are never errors | Covered by unit tests in `scenario-progress.test.ts`: the live flow ends at the first copy, so a second copy is only reachable after the run is closed | Any later copy classifies as `correct` |
| B6 | Removed savings event stays backward-readable ✅ | Covered by the legacy-event unit test in `scenario-progress.test.ts` | Old `home.savings.open` recordings remain `error`; the current home UI cannot emit the event |
| B7 | Back from a detour is recovery ✅ | Open the cashback tab, then return with `tab.home.open` | The detour is `error`, the return is `recovery` |
| B8 | Clipboard holds fake data only ✅ | Copy the number and read the recorded events | No card value and no clipboard field appear anywhere in the session events |

## C. Scenario 2 — CASHBACK_CONNECT

Golden path: `home.cashback.open` / `cashback.tab.open` → `cashback.connect.start` → three `cashback.category.*.toggle` → `cashback.categories.confirm` → dismiss the success sheet.

| ID | Case | Steps | Expected |
|---|---|---|---|
| C1 | Entry by the balance badge, closed by the button ✅ | `home.cashback.open` → `cashback.connect.start` → three categories → `cashback.categories.confirm` → home sheet → `cashback.success.close` | The run ends as `unaided` with exactly the seven golden taps, no error, and the ease-score question |
| C2 | Entry by the tabbar, closed by a drag ✅ | Same flow through `cashback.tab.open`, dismissed by dragging the handle ≥ 80 px | The run ends as `unaided`, the sheet is gone, and the ease-score question is offered |
| C3 | Short drag does not dismiss ✅ | Drag the handle 30 px and release | The sheet stays, the run stays open, and the button still finishes it |
| C4 | Confirming fewer than three fails ✅ | Select two categories, confirm | The tap is `error`, the screen does not navigate, and the run stays open |
| C5 | Fourth category is disabled and explored ✅ | Select three categories, then tap a fourth | Unchecked rows are `aria-disabled`, the tap is informational `info`, exactly three rows stay selected, and clearing one re-enables the rest |
| C6 | **Scrolling to study a screen is not a wrong click** ✅ | Scroll home, the offer screen and the category list during the flow | Scrolls are recorded as `scroll` events, never as taps; the run completes with no error verdict |
| C7 | FAQ is informational | Tap a category `…faq.open` | The tap is `info` and the selection does not change |
| C8 | Benefit tiles are demo-only | Tap a `cashback.benefit.*.open` tile | Demo feedback appears; no navigation, no product-state change |

## D. Scenario 3 — CASHBACK_NEXT

Golden path: open cashback → `cashback.next_month.categories.open` → three toggles → `cashback.categories.confirm` → dismiss the confirmation sheet.

| ID | Case | Steps | Expected |
|---|---|---|---|
| D1 | Entry by the tabbar, closed by the button ✅ | `cashback.tab.open` → `cashback.next_month.categories.open` → three categories → confirm → `cashback.next_month.success.close` | The run ends as `unaided` with exactly the seven golden taps, no error, and the ease-score question |
| D2 | Entry by the balance badge, closed by a drag ✅ | Same flow through `home.cashback.open`, dismissed by dragging the handle ≥ 80 px | The run ends as `unaided` and the sheet is gone |
| D3 | Confirmed selection is display-only | Tap the confirmed next-month banner afterwards | The picker does not reopen; no entry action is emitted |
| D4 | Sheet appears once | Reload `/cashback` after dismissing | The confirmation sheet does not return; the URL marker is cleared |
| D5 | Period segment is informational | Tap `cashback.period.year`, then `cashback.period.month` | Both are `info`; the annual chart opens at its rightmost scroll position |
| D6 | Tabbar stubs are guarded | Tap the `/payment`, `/chat`, `/more` tabs mid-scenario | Demo feedback appears, the route does not change, and the scenario is not disturbed |

Note on the flow description: confirming next-month categories returns to `/cashback` with its own confirmation overlay, not to home. Home only owns the connection success sheet from scenario 2.

## E. Moderator surface

| ID | Case | Steps | Expected |
|---|---|---|---|
| E1 | Live timeline | Keep the dashboard open while the participant taps | Events stream in over SSE within a couple of seconds, colour-coded by verdict |
| E2 | Metrics reflect the run | Complete a scenario, open the session page | Completion, error-free and direct-path figures match what the run actually did |
| E3 | Replay | Open the session replay | Taps replay in order with their marks on the recorded screens; the gate tap is excluded |
| E4 | Export | Use `moderator.session.export.md.quick` and the JSON/CSV links | Files download, are non-empty, and carry the same event IDs as the session |
| E5 | End session | `moderator.session.end` | The participant surface moves to the ended state; recorded data is preserved |
| E6 | Delete session | `moderator.session.delete` | That session, its runs and events are gone; a second session is untouched |
| E7 | Auth is enforced | Call a `/api/moderator/**` route without the cookie | 401/403, and no data in the body |

## F. Cross-cutting

| ID | Case | Expected |
|---|---|---|
| F1 | Participant viewport | At 440 × 980 nothing scrolls horizontally; the header and tabbar stay fixed while content scrolls |
| F2 | Desktop viewport | At 1440 × 900 the participant app fills the viewport with no simulated device frame |
| F3 | No console errors | No uncaught errors or React warnings in the console across a full three-scenario run |
| F4 | No third-party requests | Every network request goes to localhost: no Figma asset URLs, no font CDN, no telemetry |
| F5 | Reload mid-scenario | Reloading the page keeps the session, the active scenario and the product state |
| F6 | Offline blip | With the network briefly stopped, a terminal tap does not lock the participant out: the completion lock is released and the flow stays usable |

## Harness

```powershell
docker compose up -d      # the app under test
npm run test:e2e          # ChromeDriver against http://localhost:3000
```

- `selenium-webdriver` drives local Chrome; ChromeDriver itself is resolved by Selenium Manager, so nothing has to be installed by hand.
- `e2e/support/driver.ts` builds the browser (headless unless `PSB_E2E_HEADED=1`), taps `[data-track]` controls, and waits on routes — the shared tabbar means navigation must be awaited by URL, never by the presence of a control.
- `e2e/support/app.ts` talks to the moderator API for the parts a participant cannot do: log in, assign a scenario, read the session snapshot, wait for a recorded tap or a run result, delete the session afterwards.
- `vitest.e2e.config.ts` keeps these cases out of `npm test`; one browser at a time, since the cases share the dev stack and its research database.
- Each case creates its own `E2E-…` participant and deletes it when the file finishes. `PSB_E2E_KEEP=1` keeps the sessions for debugging in the dashboard.
- Assertions read the recorded research data through the moderator API rather than the DOM, so a case proves the instrumentation contract and not just the pixels.

Each case above maps to exactly one test, named by its ID, so a failure names the contract that broke.
