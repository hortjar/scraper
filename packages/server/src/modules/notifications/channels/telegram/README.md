# Telegram channel

## Setup

1. Message [@BotFather](https://t.me/BotFather), run `/newbot`, and copy the
   bot token it gives you into `botToken`.
2. Add the bot to the target chat/group/channel and find the chat id (for a
   private chat, message the bot and check
   `https://api.telegram.org/bot<token>/getUpdates`; for a channel, forward
   any message to [@JsonDumpBot](https://t.me/jsondumpbot)). Paste it into
   `chatId` — numeric ids for groups/channels are typically negative.
3. Use "Send test notification" to confirm the bot can post.

## Rendering

Telegram's Bot API uses **MarkdownV2**, which requires escaping a long list of
characters (`_ * [ ] ( ) ~ \` > # + - = | { } . !`) anywhere they appear in
untrusted data — `render.ts`'s `escapeMarkdownV2`does this for every field
label, value, and the title before they're interpolated into the message
text. Only the literal`_bold_`markers and the`[text](url)` link syntax we
add ourselves are left unescaped.

## Why classification is different here

Telegram's Bot API returns **HTTP 200 with `{ "ok": false, ... }`** for most
request errors (bad chat id, bot blocked, malformed markdown) — the HTTP
status alone doesn't tell you whether the send succeeded. `channel.ts` parses
the JSON body and only treats `ok: true` as success; an `ok: false` body is
terminal unless Telegram's own `error_code` is `429` (flood control), and an
HTTP-level `429` or `5xx` is always retryable regardless of body.
