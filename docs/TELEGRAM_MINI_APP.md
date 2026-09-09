# Telegram Mini App setup

The production URL is `https://psb.gremten.workers.dev`.

## BotFather

1. Create or select the research bot in `@BotFather`.
2. Open **Bot Settings → Configure Mini App** and enable the Main Mini App.
3. Set the Mini App URL to `https://psb.gremten.workers.dev`.
4. Configure the bot menu button to open the same URL.
5. Use the generated `t.me` Mini App link when inviting participants.

No Telegram bot token is required in the browser bundle. Never place a bot token in `NEXT_PUBLIC_*`, client code, Git, or Cloudflare static assets.

## Runtime behavior

- The official Telegram WebApp script is loaded before the application code.
- The app calls `ready()` and `expand()` on launch.
- Telegram clients with Bot API 8.0 or newer are asked to enter fullscreen.
- Telegram safe-area and content-safe-area insets are applied to the interface.
- The Telegram header, page, and bottom bar colors match the prototype.
- Vertical swipes that minimize or close the Mini App are disabled during the usability test on Bot API 7.7 or newer.
- Opening the same URL in a normal browser continues to use the existing browser layout.

Participant identity from `initDataUnsafe` is deliberately not stored or added to research events. If authenticated Telegram identity is needed later, send `initData` to the server and validate it there before use.
