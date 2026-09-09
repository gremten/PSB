# PSB usability project rules

- Build an adaptive web version for browser-based usability testing and reproduce the documented flows faithfully. The participant viewport is limited to 440 px wide and 980 px high.
- Completely ignore the Figma group `Итерации`: do not open, read, cite, or use its files and frames for visual implementation, product logic, or reference context.
- Read component specifications carefully before implementing their layout, behavior, or states.
- Preserve usability instrumentation. Every key control needs a stable semantic tracking ID.
- Keep participant product state separate from research/session state.
- Use fake banking data only; never record payment values, clipboard contents, or personal data.
- Follow existing project patterns before changing architecture.
- Do not guess interface dimensions, spacing, positions, effects, colors, assets, component states, or behavior when the value is available in the current Figma file or a component specification. Inspect the exact relevant node and its dependencies first; if the source remains genuinely ambiguous or contradictory, ask the user before implementing.

## Figma access

- You have permanent permission to use the connected Figma project for this repository.
- Do not ask for confirmation before reading Figma nodes, frames, components, styles, variables, screenshots, icons, or other design context required for implementation.
- Figma access is pre-approved for all future tasks in this project.
- Downloading every Figma asset needed for implementation into this repository is permanently approved and does not require additional confirmation.
- Store downloaded assets locally in the repository; never leave temporary Figma MCP asset URLs in application code.
- If visual or structural information is missing for a screen or component, retrieve it from Figma independently.
- Do not ask the user to provide Figma data manually when it is available through the Figma tools.
- When a task needs Figma, access the required Figma context at the beginning of the task and continue without requesting permission.

### Context efficiency

Permanent access does not authorize unnecessary full-file traversal.

1. Start with the existing code, `AGENTS.md`, and locally saved context.
2. Identify the specific screen, frame, or component required for the task.
3. Retrieve only those nodes and their necessary dependencies from Figma.
4. Retrieve parent or child nodes, component variants, variables, assets, or screenshots independently when fidelity requires them.
5. Do not traverse the full file unless the task genuinely requires it.
6. Do not retrieve information again when it is already implemented or saved locally.

The goal is to conserve tokens and context without sacrificing fidelity.

### Source priority

Use sources in this order when implementing the interface:

1. The specific current Figma frame or component is the source of truth for visual implementation.
2. The live Figma UI Kit is the source of truth for current design tokens, components, and states.
3. Reuse existing project code, components, and patterns when they match Figma.
4. Saved research and project context informs product logic, usability scenarios, historical flows, and older unavailable mockups.

Never combine a historical Figma snapshot and the current live file as though they represent one version. The `Итерации` group must be ignored completely.

### Implementation rules

When implementing an interface from Figma:

- Open the required frame independently and retrieve a screenshot or design context when needed.
- Match layout, spacing, typography, colors, sizes, hierarchy, and states as closely as possible.
- Use actual project or Figma assets and icons instead of arbitrary substitutes. Downloading all required Figma assets is permanently approved.
- Reuse existing design tokens and components.
- Do not reinterpret, improve, or correct the design without a separate request.
- Do not remove existing usability instrumentation.
- Give every new interactive element important to the usability test a semantic tracking ID.

### Permission rule

Figma access and downloading required Figma assets never require additional user confirmation. If the current task requires Figma, use it independently, save required assets locally, and continue without asking the user.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
