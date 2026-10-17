// UI-only build: same contract as the real chat client, but replies come from scripted demo data instead of
// `/api/chat`. No backend, no credentials, nothing is ever bought.
export type ChatLink = {
  kind: "vault" | "approval" | "store_login" | "product"
  url: string
  expires_at: string | null
  store?: string | null
  title?: string
  price?: string | null
  product_id?: string
}

export type ChatProduct = { product_id: string; name: string; image_url: string | null; store: string | null }

export type StreamHandlers = {
  onProducts?: (products: ChatProduct[]) => void
  onText: (delta: string) => void
  onLink: (link: ChatLink) => void
  onDone: (reply: string) => void
  onError: (error: string) => void
}

type Script = { text: string; products?: ChatProduct[]; links?: ChatLink[]; error?: string }

const DEMO_URL = "https://opencommerce.sh"

function product(id: string, name: string, store: string, price: string): { product: ChatProduct; link: ChatLink } {
  return {
    product: { product_id: id, name, store, image_url: null },
    link: { kind: "product", url: `${DEMO_URL}/?demo-product=${id}`, expires_at: null, title: name, price, product_id: id },
  }
}

function action(kind: Exclude<ChatLink["kind"], "product">, store?: string): ChatLink {
  return { kind, url: `${DEMO_URL}/?demo-${kind}=${crypto.randomUUID()}`, expires_at: null, store }
}

function pick(message: string): Script {
  const m = message.toLowerCase()
  if (m.includes("error")) return { text: "", error: "Demo error: the store didn't answer in time. Try again." }
  if (m.startsWith("i'll take")) {
    return {
      text: "Done. Your cart is ready: 1 item, $13.49 with tax and free delivery. Approve the purchase and I'll place the order.",
      links: [action("approval")],
    }
  }
  if (/table|restaurant|dinner|reservation|book/.test(m)) {
    return {
      text: "Found a table for 2 at Flour + Water, 7:00pm tonight. They hold reservations with a card, so add one and I'll confirm it.",
      links: [action("vault"), action("store_login", "OpenTable")],
    }
  }
  const items = /cable|usb|charg/.test(m)
    ? [
        product("cable-1", "Anker USB-C to USB-C Cable, 6 ft, 100W", "Amazon", "$12.99"),
        product("cable-2", "Apple 240W USB-C Charge Cable (2 m)", "Best Buy", "$19.00"),
        product("cable-3", "Belkin BoostCharge USB-C Cable, 3.3 ft", "Target", "$14.99"),
      ]
    : [
        product("aa-1", "Amazon Basics AA Alkaline Batteries, 48 Pack", "Amazon", "$13.49"),
        product("aa-2", "Duracell Coppertop AA Batteries, 20 Count", "Amazon", "$17.99"),
        product("aa-3", "Energizer MAX AA Batteries, 24 Count", "Walmart", "$16.47"),
      ]
  return {
    text: "Here are three good options. Pick one and I'll put it in a cart for you to approve.",
    products: items.map((i) => i.product),
    links: items.map((i) => i.link),
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })

export async function streamChat(message: string, handlers: StreamHandlers, signal?: AbortSignal) {
  const script = pick(message)
  await sleep(900, signal)
  if (script.error) {
    handlers.onError(script.error)
    return
  }
  for (const word of script.text.split(/(?<= )/)) {
    handlers.onText(word)
    await sleep(35, signal)
  }
  if (script.products) handlers.onProducts?.(script.products)
  for (const link of script.links ?? []) {
    await sleep(150, signal)
    handlers.onLink(link)
  }
  handlers.onDone(script.text)
}
