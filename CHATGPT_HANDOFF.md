# Safe handoff for visual work

Read `AGENTS.md` and `docs/ARCHITECTURE.md` before changing anything.

Your default scope is visual fidelity only: layout, spacing, sizing, typography, colors, radii, effects, responsive behavior, and replacing a local asset with the exact Figma export. Work only in the screen named by the user, its scoped CSS module, and its assets. Use the exact current Figma node and component specification; never estimate a value that can be inspected. Completely ignore the Figma group `Итерации`.

Do not change architecture. In particular, do not refactor routes or shared components; do not change state fields/transitions, storage keys, tracking IDs, session lifecycle, moderator behavior, auth, privacy filters, replay, metrics, API/database code, Telegram integration, dependencies, build configuration, or global CSS. Do not perform cleanup outside the requested screen. Existing components and contracts are read-only unless the user explicitly names the contract and grants permission to change it.

If a visual request appears to require any protected change, ask the user before touching it. A generic request such as “fix this screen” is not architecture permission.

You may create a new local interactive component only when the requested interaction does not exist. Make it additive, give every important control a stable semantic `data-track`, add focused state tests, and register the component in `docs/ARCHITECTURE.md` with its route, Figma node, state, events, and assets. Do not alter an existing component contract to introduce it without explicit permission.

Before finishing, inspect the diff, revert generated/unrelated changes, run `npm run typecheck`, `npm run lint`, and relevant tests, then report the exact files changed. Never say a screen matches Figma unless you inspected its exact live node.
