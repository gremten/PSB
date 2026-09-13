# Agent Read Me

This file records only the final, approved UI changes and constraints from the current PSB redesign work. Do not log rejected attempts, debugging detours, or intermediate broken versions here.

## Approved changes

- Global pressed states use `scale(0.975)` with a smoother ~180 ms easing. Avoid stacking multiple active transforms on the same control.
- The home screen removes the extra 48 px vertical gap after the last promo/banner is closed. The 48 px spacing remains when promo content is visible.
- The account screen background continues behind the Telegram fullscreen chrome so there is no separate clipped gray/dark strip at the top.
- Preserve the existing animated SVG blob/background implementation on the account screen. Do not replace it with a rasterized background.
- The shared back button is a liquid-glass control everywhere it is used, not an account-only special case.
- Liquid glass is implemented with `@samasante/liquid-glass` rather than a CSS-only visual imitation.
- Back-button glass should be tuned toward the Figma material values: fill `#242A33` at 50%, Light `-45° / 80%`, Refraction `80`, Depth `20`, Dispersion `50`, Frost `4`, Splay `0`.
- The liquid-glass back button follows Telegram-style touch behavior: the glass material blooms larger on hold, rubber-bands toward the finger, stretches along the pull direction, and springs back on release. The entire lens moves/deforms; the optical crop must never slide independently. Keep the icon visually crisp at its normal visual size while the glass body expands; liquid-glass deformation must not shrink the glyph. A drag must not accidentally trigger navigation on release.
- The main-screen header toolbar (search + notifications) is also liquid glass. Keep its horizontal layout and `#242A33` at 75% tint. On hold, deform the real glass toolbar itself around the touched side with a smaller bounded rubber-band response and stronger pressed optics; keep both toolbar glyphs at their normal visual size and do not add a separate fake overlay or move an optical crop inside the control.
- On the account screen, the action-button row and History block should stay at roughly the same proportional vertical position across viewport heights. If the card list becomes tall, content growth is allowed to push them lower naturally.
- On the account screen, the `На счету` balance block together with its card badges is positioned 20 px higher than the surrounding flow; this offset must not pull the action row or History block upward.
- On the home History list, transaction amounts are top-aligned with the merchant title rather than vertically centered against the two-line title/meta block.
- In the account card group, the first row remains the add button plus the first card. Starting from the second row, fit two card badges per row where the viewport allows it.
- On the home screen, the accounts/cards scroller must keep side breathing room while scrolling so cards are not visually clipped by the viewport on the left or right.
- The home accounts container itself ends with visible `20px` bottom-left and bottom-right corners immediately before the four quick-action buttons. The rounding belongs to the accounts/card container, not to a fake background layer underneath it.
- The card carousel follows horizontal pointer movement and changes the active card after a 64 px drag; shorter drags animate back. Motion uses composited transforms, and touching a card must not scroll the viewport. Preserve tap/keyboard flip and `card.*` tracking. Draggable cards and home account-scroller cells must not shrink on press.
- The card screen header stays sticky while scrolling. Switching to another card by swipe, tap, or keyboard closes any revealed details and returns both cards to their front faces; the persisted state and replay must agree.
- The participant header is one shared `BankHeader` with profile and detail variants. Its progressive blur is sized to the web header plus an 8 px fade tail; Figma's 123 px layer already includes the native status area and must not be duplicated below Telegram chrome. The cashback top substrate stays `#161a20` in both product states, including while the bento scrolls behind the sticky header; only the 8 px lower tail fades. The bento starts at its existing 68 px position. Do not add route-specific header blur pseudo-elements.
- The home currency segmented control keeps a 44 px touch target but a 36 px visible active fill inside its outlined track; do not enlarge the fill to the touch area.
- In disconnected cashback, all four benefit bento tiles have full-tile tap targets. They only show the existing demo-unavailable feedback, keep their Figma layout and partner artwork, and retain separate `cashback.benefit.*.open` tracking IDs.
- The disconnected cashback bento keeps its Figma 402 px proportions but allocates width by content on narrower screens: the top partner tile keeps at least 220 px while the 1.5% tile yields space; the lower points tile fits both badges on one line while the 25% tile yields space. Below 380 px viewport width the pairs stack rather than clipping. The badge text is `до 5 000 ₽`.
- The cashback category-selection screen follows live node `2072:16481`: use the exact same soft SVG geometry/filter and 39 s background-position/rotation/size sequence as the working account screen, recolored with the category purple Figma stops `#8A38F5` and `#585892`. Do not reintroduce the separately exported noisy SVG or route-specific inset animation: it showed a hard diagonal edge in Telegram. The hero uses the exact local card export with a subtle scroll-linked vertical offset. The 24 px round FAQ glyphs and checkbox geometry remain within the existing category-row tap target. The bottom control is a fixed single-action bar, not the global navigation tabbar: it has the tabbar's 32 px top corners and 46 px from the button to the viewport bottom. In fullscreen Telegram this route uses `#0A0C0F` for native header, page, and stage and extends content under the system chrome like the account route, avoiding a gray strip. Preserve `cashback.categories.confirm` tracking and selection/confirmation logic.
- Lower demo-feedback toasts have a solid orange surface, not liquid glass. The upper card-copy toast keeps its liquid glass. Preserve the shared 3-second timeout, swipe dismissal, 200 ms motion, and stable tracking IDs.

- Participant pages keep 24 px of scroll-end spacing by default. If there is no tabbar and the final content block is a terminal full-width/elevated surface such as the account settings block, remove that final gap so the surface sits flush against the viewport bottom. When the tabbar is present, reserve the tabbar's full height plus the 24 px gap. Route-local wrappers must not add a second bottom gap.
- The bottom “Перейти к обмену” button in the home currency-exchange block uses a 16 px squircle/continuous-corner shape instead of a pill. Preserve `home.exchange.open` and its existing unavailable-demo behavior.
- Home-screen hidden balances use a lightweight animated bubble cloud matching the banking-app reference video: a roughly 30% denser field of small gray/white circles with varied size and opacity drift independently by a few pixels. Hidden values are replaced by the particles instead of being blurred. On history rows only the transaction amount/bonus is replaced; merchant icon, title, and metadata stay readable. Bubble bloom must not be clipped by content wrappers.

## Guardrails

- Keep changes visual and surgical unless explicitly asked otherwise.
- Do not change product logic, API/database behavior, sessions/research flows, Telegram integration logic, Cloudflare/deploy configuration, or tracking semantics for visual fixes.
- Do not rename or break existing `data-track` values.
- Reuse the existing project structure and CSS-module patterns.
- For Figma implementation work, inspect only the exact live nodes requested; do not open or use the `Итерации` group.
- Do not expose or use secrets from `.env.local`.
- Do not push to GitHub or deploy to Cloudflare unless explicitly requested.
