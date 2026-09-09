# Cloudflare deployment

The application is prepared for Cloudflare Workers with vinext. Local development continues to use SQLite; the deployed Worker uses the `PSB_DB` D1 binding and the same research/session schema.

## One-time account setup

1. Authenticate Wrangler: `npx wrangler login`.
2. Create the database: `npx wrangler d1 create psb-usability-db`.
3. Copy the returned database ID into `wrangler.jsonc` in place of `REPLACE_WITH_D1_DATABASE_ID`.
4. Add `MODERATOR_SECRET` as an encrypted Worker secret in Cloudflare. Do not commit its value.

## Git integration settings

- Repository: `gremten/PSB`
- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build:vinext`
- Production deploy command: `npm run deploy:cloudflare`
- Non-production deploy command: `npx wrangler versions upload --config dist/server/wrangler.json`

Every production deployment first applies pending D1 migrations and then deploys the Worker. Cloudflare should build on every push to `main`.

## Manual verification

```powershell
npm install
npm run typecheck
npm test
npm run build:vinext
npm run deploy:cloudflare
```

After deployment, verify `/`, `/moderator`, and session creation through the moderator UI.
