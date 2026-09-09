# Cloudflare deployment

The application is prepared for Cloudflare Workers with vinext. Local development continues to use SQLite; the deployed Worker uses the `PSB_DB` D1 binding and the same research/session schema.

## One-time account setup

1. Authenticate Wrangler: `npx wrangler login`.
2. The production database `psb-usability-db` is already bound as `PSB_DB` in `wrangler.jsonc`.
3. Add `MODERATOR_SECRET` as an encrypted Worker secret in Cloudflare. Do not commit its value.

## Git integration settings

- Repository: `gremten/PSB`
- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build`
- Production deploy command: `npx wrangler deploy`
- Non-production deploy command: `npx wrangler versions upload --config dist/server/wrangler.json`

Every production deployment first applies pending D1 migrations and then deploys the Worker. Cloudflare should build on every push to `main`.

## Manual verification

```powershell
npm install
npm run typecheck
npm test
npm run build
npm run deploy:cloudflare
```

After deployment, verify `/`, `/moderator`, and session creation through the moderator UI.
