"use client";

import { useSyncExternalStore } from "react";
import type {
  AppState,
  ChatMessage,
  Product,
  RealtimeEvent,
  SessionStatus,
  Verdict,
} from "./types";
import { botChatter, botNames, makeSession, mockCreator } from "./mock-data";

const CHANNEL_NAME = "retail-live";

function initialState(): AppState {
  return {
    creator: mockCreator,
    session: makeSession(),
    products: [],
    currentProductId: null,
    chat: [],
  };
}

let state: AppState = initialState();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(next: AppState) {
  state = next;
  emit();
}

export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- Realtime channel (BroadcastChannel in browser; no-op on server) ---

let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<RealtimeEvent>) => {
    const event = e.data;
    if (event.type === "state.request") {
      // Respond with our snapshot so the newcomer catches up.
      channel?.postMessage({ type: "state.snapshot", state } as RealtimeEvent);
      return;
    }
    if (event.type === "state.snapshot") {
      // Only adopt a snapshot if we don't already have session data of our own.
      if (state.products.length === 0 && state.session.status === "idle") {
        setState(event.state);
      }
      return;
    }
    apply(event);
  };
  return channel;
}

/** Apply an event to local state. Pure reducer — no broadcasting. */
function apply(event: RealtimeEvent) {
  switch (event.type) {
    case "chat.new": {
      setState({ ...state, chat: [...state.chat, event.message].slice(-200) });
      break;
    }
    case "product.set": {
      const exists = state.products.some((p) => p.id === event.product.id);
      const products = exists
        ? state.products.map((p) => (p.id === event.product.id ? event.product : p))
        : [...state.products, event.product];
      setState({ ...state, products, currentProductId: event.product.id });
      break;
    }
    case "product.update": {
      setState({
        ...state,
        products: state.products.map((p) =>
          p.id === event.product.id ? event.product : p,
        ),
      });
      break;
    }
    case "product.current": {
      setState({ ...state, currentProductId: event.productId });
      break;
    }
    case "vote.cast": {
      setState({
        ...state,
        products: state.products.map((p) =>
          p.id === event.productId
            ? {
                ...p,
                votes: {
                  buy: p.votes.buy + (event.choice === "buy" ? 1 : 0),
                  skip: p.votes.skip + (event.choice === "skip" ? 1 : 0),
                },
              }
            : p,
        ),
      });
      break;
    }
    case "click.product": {
      setState({
        ...state,
        products: state.products.map((p) =>
          p.id === event.productId ? { ...p, clicks: p.clicks + 1 } : p,
        ),
      });
      break;
    }
    case "stream.status": {
      setState({
        ...state,
        session: {
          ...state.session,
          status: event.status,
          startedAt: event.startedAt,
          endedAt: event.endedAt,
          recordingUrl:
            event.status === "ended" ? "mock://recording/session_1" : null,
        },
      });
      break;
    }
  }
}

/** Apply locally and broadcast to other tabs. */
function dispatch(event: RealtimeEvent) {
  apply(event);
  ensureChannel()?.postMessage(event);
}

// --- Store subscription (useSyncExternalStore) ---

function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureChannel();
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Ask other tabs for a snapshot (call once on mount in each view). */
export function requestSync() {
  ensureChannel()?.postMessage({ type: "state.request" } as RealtimeEvent);
}

// --- Actions ---

export function sendChat(user: string, text: string, isBot = false) {
  const message: ChatMessage = {
    id: uid("msg"),
    user,
    text,
    ts: Date.now(),
    isBot,
  };
  dispatch({ type: "chat.new", message });
}

export function addProduct(product: Product) {
  dispatch({ type: "product.set", product });
}

export function updateProduct(product: Product) {
  dispatch({ type: "product.update", product });
}

export function setCurrentProduct(productId: string | null) {
  dispatch({ type: "product.current", productId });
}

export function castVote(productId: string, choice: "buy" | "skip") {
  dispatch({ type: "vote.cast", productId, choice });
}

export function recordClick(productId: string) {
  dispatch({ type: "click.product", productId });
}

export function setStreamStatus(status: SessionStatus) {
  const now = Date.now();
  if (status === "live") {
    dispatch({ type: "stream.status", status, startedAt: now, endedAt: null });
    startBots();
  } else if (status === "ended") {
    stopBots();
    dispatch({
      type: "stream.status",
      status,
      startedAt: state.session.startedAt,
      endedAt: now,
    });
  } else {
    stopBots();
    dispatch({ type: "stream.status", status, startedAt: null, endedAt: null });
  }
}

export function setVerdict(productId: string, verdict: Verdict) {
  const product = state.products.find((p) => p.id === productId);
  if (product) updateProduct({ ...product, verdict });
}

export function togglePin(productId: string) {
  const product = state.products.find((p) => p.id === productId);
  if (product) updateProduct({ ...product, pinned: !product.pinned });
}

export function setNote(productId: string, note: string) {
  const product = state.products.find((p) => p.id === productId);
  if (product) updateProduct({ ...product, note });
}

// --- Bot chatter (runs only in the tab that started the stream) ---

let botTimer: ReturnType<typeof setInterval> | null = null;

function startBots() {
  if (botTimer) return;
  botTimer = setInterval(
    () => {
      const name = botNames[Math.floor(Math.random() * botNames.length)];
      const text = botChatter[Math.floor(Math.random() * botChatter.length)];
      sendChat(name, text, true);
    },
    2500 + Math.random() * 2500,
  );
}

function stopBots() {
  if (botTimer) {
    clearInterval(botTimer);
    botTimer = null;
  }
}
