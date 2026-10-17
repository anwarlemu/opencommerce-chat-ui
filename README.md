# opencommerce chat — UI only

The chat UI from [chat.opencommerce.sh](https://chat.opencommerce.sh) with the backend removed. Replies are scripted in `lib/chat-stream.ts`, so it runs with no API keys and never buys anything.

```bash
pnpm install
pnpm dev
```

Try the suggestion chips, or type anything with "table", "cable" or "error" in it to see the other states (action buttons, product cards, error bubble). Picking a product shows the approval step.

- `app/page.tsx` — the chat screen
- `components/ui/` — message, bubble, input and scroller primitives (shadcn, base-nova)
- `lib/chat-stream.ts` — demo replies; same `streamChat` contract as the real client
