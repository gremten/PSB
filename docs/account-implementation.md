# Account implementation — live Figma, 2026-09-10

Source: file `liWo1Xcsx04YGTZx3OqZNV`, frame `2125:27685` (`t-account`). No content from `Итерации` was used.

- Reference width 402. System status bar 54 px is omitted in the browser; Telegram safe areas are provided by the shell.
- Header 61 px after status-bar removal, 44 px controls. Progressive backdrop blur: start 4, end 2; backdrop extends to 69 px.
- Content begins at Figma y=163, or browser y=109. Header-to-content gap: 48.
- Balance 32/40, bold 700; label 12/16; gap 4. Horizontal padding 20.
- Card badges: wrap, gap 8, height 44, radius 12, padding 12/10/12/12. Miniatures 26×18. Name max-width 72, ellipsis, ending gap 4.
- Main section includes 148 px bottom padding. Following section gap 24. Action buttons 52 high, radius 16, gap 8. Buttons-to-history gap 16. History-to-settings gap 24.
- History 306 px at the reference content size; separator starts after the 32 px merchant icon + 12 px gap. Positive amounts and cashback use #11C44C.
- Card links select the corresponding night/orange card. Unavailable actions retain demo feedback and semantic tracking IDs.

## Background

Instance `2125:27688` uses `1148:576` (frame 3) of `1123:2108` (`bg_animation`). The timeline API returned no tracks because motion is authored as prototype CHANGE_TO reactions. Exact reactions were read from these six variants: 3 → 4 → 5 → 6 → 1 → 2 → 3; each SMART_ANIMATE is LINEAR, 6.5 seconds, with a 0.001 second after-timeout trigger.

CSS implements the 39-second loop using the live node positions, rotations and relative sizes. `public/figma/account/background-blob.svg` is the exact 619×634 SVG supplied by the user; CSS scales it to the live variant bounds without introducing a raster/video dependency. Motion stops under prefers-reduced-motion. Timing was recovered from the live component.
