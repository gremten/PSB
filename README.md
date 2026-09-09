# PSB usability lab — iteration 2

Browser-ready moderated usability prototype of a PSB mobile-bank concept. The participant app reproduces the current Figma scenario flows for the home screen, account-to-card hierarchy, card details and copying, initial cashback connection, category renewal, cashback history, and the fake payment task.

The participant viewport is adaptive up to 480 × 1024 px. Longer screens scroll inside the viewport while the bottom navigation stays fixed. Required Figma assets are committed locally under `public/figma`; the runtime does not depend on temporary Figma asset URLs.

The project also contains persistent research sessions, a protected moderator dashboard, semantic instrumentation, SSE live events, session reset controls, and aggregate metrics.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
# Change MODERATOR_SECRET in .env.local
npm run dev
```

Open `http://localhost:3000` for the participant app and `http://localhost:3000/moderator` for the dashboard. Research data is stored in `data/psb-research.sqlite` and survives server restarts.

## Checks

```powershell
npm test
npm run typecheck
npm run build
```

The prototype uses fake data, has no bank integration or third-party telemetry, and must be deployed privately. Onest is bundled from the installed package and causes no runtime font request.
