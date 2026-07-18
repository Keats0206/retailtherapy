export type Verdict = "buy" | "maybe" | "skip";

export type SessionStatus = "idle" | "live" | "ended";

export interface Creator {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string;
  bio: string;
  followers: number;
  upcomingStreamAt: string; // ISO
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  currency: string;
  retailer: string;
  url: string;
  affiliateUrl: string;
  commissionRate: number; // percent, e.g. 8
  verdict: Verdict | null;
  note: string;
  pinned: boolean;
  clicks: number;
  votes: { buy: number; skip: number };
  addedAt: number; // epoch ms
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  ts: number;
  isBot?: boolean;
}

export interface Session {
  id: string;
  creatorId: string;
  title: string;
  status: SessionStatus;
  startedAt: number | null;
  endedAt: number | null;
  recordingUrl: string | null;
}

export interface AppState {
  creator: Creator;
  session: Session;
  products: Product[];
  currentProductId: string | null;
  chat: ChatMessage[];
}

/** Events broadcast across tabs (and, later, over Supabase Realtime). */
export type RealtimeEvent =
  | { type: "chat.new"; message: ChatMessage }
  | { type: "product.set"; product: Product } // add or replace, becomes current
  | { type: "product.update"; product: Product }
  | { type: "product.current"; productId: string | null }
  | { type: "vote.cast"; productId: string; choice: "buy" | "skip" }
  | { type: "click.product"; productId: string }
  | { type: "stream.status"; status: SessionStatus; startedAt: number | null; endedAt: number | null }
  | { type: "state.request" } // a newly opened tab asks for a snapshot
  | { type: "state.snapshot"; state: AppState };
