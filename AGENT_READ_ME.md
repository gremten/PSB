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
- The liquid-glass back button follows Telegram-style touch behavior: the glass material blooms larger on hold, rubber-bands toward the finger, stretches along the pull direction, and springs back on release. The entire lens moves/deforms; the optical crop must never slide independently. Keep the icon visually crisp and near the shared `0.975` pressed scale while the glass body expands. A drag must not accidentally trigger navigation on release.
- The main-screen header toolbar (search + notifications) is also liquid glass. Keep its horizontal layout and `#242A33` at 75% tint. On hold, deform the real glass toolbar itself around the touched side with a smaller bounded rubber-band response and stronger pressed optics; do not add a separate fake overlay or move an optical crop inside the control.
- On the account screen, the action-button row and History block should stay at roughly the same proportional vertical position across viewport heights. If the card list becomes tall, content growth is allowed to push them lower naturally.
- In the account card group, the first row remains the add button plus the first card. Starting from the second row, fit two card badges per row where the viewport allows it.
- On the home screen, the accounts/cards scroller must keep side breathing room while scrolling so cards are not visually clipped by the viewport on the left or right.
- The home accounts container itself ends with visible `20px` bottom-left and bottom-right corners immediately before the four quick-action buttons. The rounding belongs to the accounts/card container, not to a fake background layer underneath it.

## Guardrails

- Keep changes visual and surgical unless explicitly asked otherwise.
- Do not change product logic, API/database behavior, sessions/research flows, Telegram integration logic, Cloudflare/deploy configuration, or tracking semantics for visual fixes.
- Do not rename or break existing `data-track` values.
- Reuse the existing project structure and CSS-module patterns.
- For Figma implementation work, inspect only the exact live nodes requested; do not open or use the `Итерации` group.
- Do not expose or use secrets from `.env.local`.
- Do not push to GitHub or deploy to Cloudflare unless explicitly requested.
