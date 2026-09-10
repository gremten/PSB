# PSB usability lab

Browser-ready moderated usability prototype of a PSB mobile-bank concept. The participant app reproduces the current Figma scenario flows for the home screen, account-to-card hierarchy, card details and copying, initial cashback connection, category renewal, and cashback history.

Mobile and Telegram participant viewports are limited to 440 × 980 px. Desktop uses the full browser viewport without a simulated-device frame or maximum dimensions. Longer screens scroll inside the viewport while the header and bottom navigation stay fixed. Required Figma assets are committed locally under `public/figma`; the runtime does not depend on temporary Figma asset URLs.

The same build is prepared for Telegram Mini Apps. Telegram launch and BotFather setup are documented in [`docs/TELEGRAM_MINI_APP.md`](docs/TELEGRAM_MINI_APP.md).

The project also contains persistent research sessions, a protected moderator dashboard, semantic instrumentation, SSE live events, session reset controls, and aggregate metrics.

Architecture boundaries, route/state/event contracts, Figma ownership, and known scenario gaps are frozen in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). A constrained prompt for continuing visual work with an ordinary ChatGPT chat is in [`CHATGPT_HANDOFF.md`](CHATGPT_HANDOFF.md).

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
npm run build:next
npm run build 
```

## Cloudflare Worker

The repository contains a vinext Worker build, Wrangler configuration, a provisioned D1 binding, and the initial migration. To deploy manually, run:

```powershell
npm run build:vinext
npm run deploy:cloudflare
```

Cloudflare Git integration can use its standard `npm run build` build command and `npx wrangler deploy` deploy command. Add `MODERATOR_SECRET` as an encrypted Worker secret. The full account-side setup is documented in `CLOUDFLARE.md`.

The prototype uses fake data and has no bank integration or third-party telemetry. Onest is bundled from the installed package and causes no runtime font request.
