"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  LogInIcon,
  RotateCwIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { streamChat, type ChatLink, type ChatProduct } from "@/lib/chat-stream"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Message, MessageContent, MessageFooter } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

type Turn = {
  id: string
  role: "user" | "assistant"
  text: string
  links: ChatLink[]
  products: Record<string, ChatProduct>
  chosen?: string
  error?: string
  pending?: boolean
  firstWordMs?: number
  totalMs?: number
}

const SUGGESTIONS = [
  "Find AA batteries on Amazon",
  "Book a table for 2 at an Italian place in SF tonight at 7pm",
  "Find a USB-C charging cable under $20",
]

const ACTION_LINKS: Record<Exclude<ChatLink["kind"], "product">, { label: string; icon: React.ReactNode }> = {
  vault: { label: "Add a card", icon: <CreditCardIcon /> },
  approval: { label: "Approve purchase", icon: <ShieldCheckIcon /> },
  store_login: { label: "Sign in to store", icon: <LogInIcon /> },
}

function demoShopperId() {
  return `shopper_demo_${crypto.randomUUID().slice(0, 8)}`
}

function seconds(ms?: number) {
  return ms === undefined ? "" : `${(ms / 1000).toFixed(1)}s`
}

export default function ChatPage() {
  const [shopperId, setShopperId] = React.useState<string | null>(null)
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [draft, setDraft] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  // UI-only build: a local demo shopper id stands in for the signed cookie the real app uses.
  React.useEffect(() => setShopperId(demoShopperId()), [])

  const update = (id: string, change: (turn: Turn) => Turn) =>
    setTurns((all) => all.map((turn) => (turn.id === id ? change(turn) : turn)))

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy || !shopperId) return
    setDraft("")
    setBusy(true)
    const replyId = crypto.randomUUID()
    setTurns((all) => [
      ...all,
      { id: crypto.randomUUID(), role: "user", text: message, links: [], products: {} },
      { id: replyId, role: "assistant", text: "", links: [], products: {}, pending: true },
    ])
    const started = performance.now()
    let firstWord: number | undefined
    try {
      await streamChat(message, {
        onText: (delta) => {
          firstWord ??= performance.now() - started
          update(replyId, (t) => ({ ...t, text: t.text + delta, firstWordMs: firstWord }))
        },
        onLink: (link) => update(replyId, (t) => ({ ...t, links: [...t.links, link] })),
        onProducts: (products) =>
          update(replyId, (t) => ({
            ...t,
            products: { ...t.products, ...Object.fromEntries(products.map((p) => [p.product_id, p])) },
          })),
        onDone: (reply) => update(replyId, (t) => ({ ...t, text: t.text || reply })),
        onError: (error) => update(replyId, (t) => ({ ...t, error })),
      })
    } catch (error) {
      update(replyId, (t) => ({ ...t, error: String(error) }))
    } finally {
      update(replyId, (t) => ({ ...t, pending: false, totalMs: performance.now() - started }))
      setBusy(false)
    }
  }

  function choose(turnId: string, link: ChatLink) {
    update(turnId, (t) => ({ ...t, chosen: link.url }))
    void send(`I'll take the ${link.title ?? "first one"}${link.price ? ` (${link.price})` : ""}`)
  }

  function reset() {
    setTurns([])
    setShopperId(demoShopperId())
  }

  return (
    <main className="mx-auto flex h-svh w-full max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/agentcard-trueblue-main.svg" alt="Agentcard" className="h-6 w-auto" />
          <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[11px] tracking-[0.12em] text-primary uppercase">
            Shopping agent
          </span>
        </div>
        <div className="flex items-center gap-3">
          <code className="hidden text-xs text-muted-foreground sm:block">{shopperId ?? "…"}</code>
          <Button variant="outline" size="icon" aria-label="New shopper" onClick={reset} disabled={busy}>
            <RotateCwIcon />
          </Button>
        </div>
      </header>

      <MessageScrollerProvider autoScroll>
        <div className="min-h-0 flex-1">
          {turns.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/agentcard-white-symbol.svg" alt="" className="size-6" />
                </div>
                <EmptyTitle className="text-lg">What should we buy?</EmptyTitle>
                <EmptyDescription>
                  Ask for a product, a restaurant table or a delivery. This is a UI-only demo: replies are scripted and
                  nothing is ever bought.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex w-full max-w-md flex-col gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    disabled={!shopperId}
                    className="w-full rounded-xl border bg-background px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-secondary disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </EmptyContent>
            </Empty>
          ) : (
            <MessageScroller className="h-full">
              <MessageScrollerViewport>
                <MessageScrollerContent aria-busy={busy} className="gap-6 px-6 pb-4">
                  {turns.map((turn) =>
                    turn.role === "user" ? (
                      <MessageScrollerItem key={turn.id} messageId={turn.id} scrollAnchor>
                        <Message align="end">
                          <MessageContent>
                            <Bubble align="end">
                              <BubbleContent>{turn.text}</BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ) : (
                      <MessageScrollerItem key={turn.id} messageId={turn.id}>
                        <AssistantTurn turn={turn} busy={busy} onChoose={(link) => choose(turn.id, link)} />
                      </MessageScrollerItem>
                    ),
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          )}
        </div>
      </MessageScrollerProvider>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(draft)
        }}
        className="px-6 pt-2 pb-6"
      >
        <InputGroup className="rounded-2xl">
          <InputGroupTextarea
            name="message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send(draft)
              }
            }}
            placeholder="Ask the agent to buy something…"
            rows={1}
            className="min-h-12"
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              className="ml-auto rounded-full"
              aria-label="Send"
              disabled={busy || !draft.trim()}
            >
              {busy ? <LoaderCircleIcon className="animate-spin" /> : <ArrowUpIcon />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </main>
  )
}

function AssistantTurn({ turn, busy, onChoose }: { turn: Turn; busy: boolean; onChoose: (link: ChatLink) => void }) {
  const products = turn.links.filter((l) => l.kind === "product")
  const actions = turn.links.filter((l) => l.kind !== "product")
  return (
    <Message>
      <MessageContent className="gap-3">
        {turn.pending && !turn.text ? (
          <Bubble variant="muted">
            <BubbleContent className="flex items-center gap-2 text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin text-primary" /> Working on it…
            </BubbleContent>
          </Bubble>
        ) : (
          turn.text && (
            <Bubble variant="muted">
              <BubbleContent className="whitespace-pre-wrap">{turn.text}</BubbleContent>
            </Bubble>
          )
        )}
        {turn.error && (
          <Bubble variant="destructive">
            <BubbleContent>{turn.error}</BubbleContent>
          </Bubble>
        )}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((link) => {
              const action = ACTION_LINKS[link.kind as keyof typeof ACTION_LINKS]
              return (
                <Button key={link.url} nativeButton={false} render={<a href={link.url} target="_blank" rel="noreferrer" />}>
                  {action.icon}
                  {action.label}
                  {link.kind === "store_login" && link.store ? ` · ${link.store}` : ""}
                </Button>
              )
            })}
          </div>
        )}
        {products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((link) => (
              <ProductCard
                key={link.url}
                link={link}
                product={link.product_id ? turn.products[link.product_id] : undefined}
                chosen={turn.chosen === link.url}
                disabled={busy || turn.chosen !== undefined}
                onChoose={() => onChoose(link)}
              />
            ))}
          </div>
        )}
        {!turn.pending && turn.totalMs !== undefined && (
          <MessageFooter className="px-0">
            {seconds(turn.totalMs)}
            {turn.firstWordMs !== undefined && turn.totalMs - turn.firstWordMs > 1000
              ? ` · first word at ${seconds(turn.firstWordMs)}`
              : ""}
            {turn.links.length > 0 ? ` · ${turn.links.length} link${turn.links.length === 1 ? "" : "s"}` : ""}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}

function ProductCard({
  link,
  product,
  chosen,
  disabled,
  onChoose,
}: {
  link: ChatLink
  product?: ChatProduct
  chosen: boolean
  disabled: boolean
  onChoose: () => void
}) {
  const [imageFailed, setImageFailed] = React.useState(false)
  const image = product?.image_url && !imageFailed ? product.image_url : null
  return (
    <div
      data-chosen={chosen}
      className="group/product flex flex-col overflow-hidden rounded-xl border bg-card transition-colors data-[chosen=true]:border-primary data-[chosen=true]:ring-2 data-[chosen=true]:ring-primary/20"
    >
      <button
        type="button"
        onClick={onChoose}
        disabled={disabled}
        className="flex flex-1 flex-col text-left disabled:cursor-default"
        aria-label={`Buy ${link.title ?? "this product"}`}
      >
        <div className="flex aspect-square items-center justify-center bg-muted p-3">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="size-full rounded-lg object-contain mix-blend-multiply"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/agentcard-trueblue-symbol.svg" alt="" className="size-8 opacity-20" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          {product?.store && (
            <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {product.store}
            </span>
          )}
          <span className="line-clamp-2 text-sm leading-snug font-medium">{link.title ?? link.url}</span>
          {link.price && <span className="text-sm font-semibold text-primary">{link.price}</span>}
        </div>
      </button>
      <div className="flex items-center gap-2 border-t p-2">
        <Button size="sm" className="flex-1" onClick={onChoose} disabled={disabled}>
          {chosen ? <CheckIcon /> : null}
          {chosen ? "Chosen" : "Buy this"}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Open at the store"
          nativeButton={false}
          render={<a href={link.url} target="_blank" rel="noreferrer" />}
        >
          <ExternalLinkIcon />
        </Button>
      </div>
    </div>
  )
}
