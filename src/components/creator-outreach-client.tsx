"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Mail,
  MailX,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  OUTREACH_STATUSES,
  OUTREACH_STATUS_LABELS,
  gmailComposeUrl,
  type OutreachCounts as Counts,
  type OutreachStatus,
  type ProspectView as Prospect,
} from "@/lib/outreach-status";
import { readResponseJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return String(count);
}

const STATUS_STYLES: Record<OutreachStatus, string> = {
  new: "bg-muted text-muted-foreground",
  drafted: "bg-primary/10 text-primary",
  contacted: "bg-primary text-primary-foreground",
  replied: "bg-live/15 text-live",
  onboarded: "bg-live text-live-foreground",
  passed: "bg-muted text-muted-foreground line-through",
};

export function CreatorOutreachClient({
  initialProspects,
  initialCounts,
}: {
  initialProspects: Prospect[];
  initialCounts: Counts;
}) {
  const [prospects, setProspects] = useState(initialProspects);
  const [counts, setCounts] = useState(initialCounts);
  const [keyword, setKeyword] = useState("");
  const [angle, setAngle] = useState("");
  const [filter, setFilter] = useState<OutreachStatus | "all">("all");
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "all"
        ? prospects
        : prospects.filter((p) => p.status === filter),
    [prospects, filter],
  );

  function recount(next: Prospect[]) {
    const tally = Object.fromEntries(
      OUTREACH_STATUSES.map((status) => [status, 0]),
    ) as Counts;
    for (const prospect of next) tally[prospect.status] += 1;
    setCounts(tally);
  }

  function replaceProspect(updated: Prospect) {
    setProspects((current) => {
      const next = current.map((p) => (p.id === updated.id ? updated : p));
      recount(next);
      return next;
    });
  }

  function setRowBusy(id: string, value: boolean) {
    setBusy((current) => {
      const next = new Set(current);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function runSearch() {
    const trimmed = keyword.trim();
    if (!trimmed || searching) return;

    setSearching(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/creator-outreach/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: trimmed }),
      });
      const data = await readResponseJson<{
        error?: string;
        imported?: number;
        withEmail?: number;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Search failed");

      setMessage(
        `Found ${data.imported ?? 0} creators for "${trimmed}" · ${data.withEmail ?? 0} with a public email.`,
      );
      // The search wrote straight to the database, so pull the merged list back
      // rather than trying to reconcile new and existing rows on the client.
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function reload() {
    const res = await fetch("/api/admin/creator-outreach", {
      cache: "no-store",
    });
    if (!res.ok) return;
    try {
      const data = await readResponseJson<{ prospects?: Prospect[] }>(res);
      if (data.prospects) {
        setProspects(data.prospects);
        recount(data.prospects);
      }
    } catch {
      // Keep the list already on screen if the refresh body is empty.
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setRowBusy(id, true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/creator-outreach/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readResponseJson<{
        error?: string;
        prospect?: Prospect;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      if (data.prospect) replaceProspect(data.prospect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setRowBusy(id, false);
    }
  }

  async function writeDraft(id: string) {
    setRowBusy(id, true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/creator-outreach/${id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle: angle.trim() || undefined }),
      });
      const data = await readResponseJson<{
        error?: string;
        prospect?: Prospect;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Couldn't write the draft");
      if (data.prospect) replaceProspect(data.prospect);
      setExpanded(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't write the draft");
    } finally {
      setRowBusy(id, false);
    }
  }

  /** Confirms an email the admin sent by hand from Gmail. */
  async function markSent(id: string) {
    setRowBusy(id, true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/creator-outreach/${id}/sent`, {
        method: "POST",
      });
      const data = await readResponseJson<{
        error?: string;
        prospect?: Prospect;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Couldn't record the send");
      if (data.prospect) replaceProspect(data.prospect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record the send");
    } finally {
      setRowBusy(id, false);
    }
  }

  async function remove(id: string) {
    setRowBusy(id, true);
    try {
      await fetch(`/api/admin/creator-outreach/${id}`, { method: "DELETE" });
      setProspects((current) => {
        const next = current.filter((p) => p.id !== id);
        recount(next);
        return next;
      });
    } finally {
      setRowBusy(id, false);
    }
  }

  const ready = visible.filter(
    (p) => p.email && !p.contactedAt && p.draftSubject && p.draftBody,
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Search */}
      <section className="flex flex-col gap-3 border-t border-border pt-8">
        <h2 className="micro text-muted-foreground">Find creators</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void runSearch();
            }}
            placeholder="thrift haul, sneaker reseller, skincare routine…"
            aria-label="Search TikTok creators by keyword"
            disabled={searching}
          />
          <Button
            type="button"
            onClick={() => void runSearch()}
            disabled={searching || !keyword.trim()}
            className="shrink-0"
          >
            {searching ? (
              <>
                <Loader2 className="animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <Search />
                Search TikTok
              </>
            )}
          </Button>
        </div>
        <Input
          value={angle}
          onChange={(event) => setAngle(event.target.value)}
          placeholder="Optional angle for drafts — e.g. “mention the March cohort”"
          aria-label="Optional angle to work into drafts"
        />
      </section>

      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {/* Pipeline filters */}
      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label={`All ${prospects.length}`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {OUTREACH_STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={`${OUTREACH_STATUS_LABELS[status]} ${counts[status] ?? 0}`}
              active={filter === status}
              onClick={() => setFilter(status)}
            />
          ))}
        </div>

        {ready.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {ready.length} drafted and ready to send from Gmail.
          </p>
        ) : null}

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {prospects.length === 0
              ? "No creators yet. Search a niche above to start building the list."
              : "Nothing in this stage."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((prospect) => (
              <ProspectRow
                key={prospect.id}
                prospect={prospect}
                busy={busy.has(prospect.id)}
                expanded={expanded === prospect.id}
                onToggleExpand={() =>
                  setExpanded(expanded === prospect.id ? null : prospect.id)
                }
                onDraft={() => void writeDraft(prospect.id)}
                onMarkSent={() => void markSent(prospect.id)}
                onPatch={(body) => void patch(prospect.id, body)}
                onRemove={() => void remove(prospect.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "micro rounded-full border px-3 py-1.5 transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ProspectRow({
  prospect,
  busy,
  expanded,
  onToggleExpand,
  onDraft,
  onMarkSent,
  onPatch,
  onRemove,
}: {
  prospect: Prospect;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onDraft: () => void;
  onMarkSent: () => void;
  onPatch: (body: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const [email, setEmail] = useState(prospect.email ?? "");
  const [subject, setSubject] = useState(prospect.draftSubject ?? "");
  const [body, setBody] = useState(prospect.draftBody ?? "");
  // Flips once the composer has been opened, so "mark as sent" only appears
  // after there was actually something to send.
  const [opened, setOpened] = useState(false);

  const hasDraft = Boolean(subject.trim() && body.trim());
  const canSend = Boolean(email.trim()) && !prospect.contactedAt && hasDraft;

  // Built from the live field values, not the saved row, so an edit in the
  // textarea is what lands in Gmail even before the blur-save round-trips.
  const composeUrl = canSend
    ? gmailComposeUrl({ to: email.trim(), subject, body })
    : null;

  return (
    <Card className="py-0 ring-foreground/8 transition-colors hover:ring-foreground/15">
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <div className="flex items-start gap-3">
          {prospect.avatarUrl ? (
            // Remote TikTok CDN avatars with signed, expiring URLs — not worth
            // routing through next/image's optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prospect.avatarUrl}
              alt=""
              className="size-10 shrink-0 rounded-full bg-muted object-cover"
              loading="lazy"
            />
          ) : (
            <span className="size-10 shrink-0 rounded-full bg-muted" />
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-base font-normal">
                {prospect.displayName ?? `@${prospect.handle}`}
              </span>
              <Badge
                size="micro"
                className={cn("shrink-0", STATUS_STYLES[prospect.status])}
              >
                {OUTREACH_STATUS_LABELS[prospect.status]}
              </Badge>
              {prospect.verified ? (
                <Badge size="micro" variant="outline" className="shrink-0">
                  Verified
                </Badge>
              ) : null}
            </div>

            <p className="truncate text-sm text-muted-foreground">
              @{prospect.handle} · {formatFollowers(prospect.followerCount)}{" "}
              followers
              {prospect.discoveredVia ? ` · “${prospect.discoveredVia}”` : null}
            </p>

            {prospect.bio ? (
              <p className="line-clamp-2 text-sm text-muted-foreground/80">
                {prospect.bio}
              </p>
            ) : null}

            <p className="flex items-center gap-1.5 text-sm">
              {prospect.email ? (
                <>
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{prospect.email}</span>
                </>
              ) : (
                <>
                  <MailX className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    No public email in bio
                  </span>
                </>
              )}
            </p>

            {prospect.contactedAt ? (
              <p className="text-xs text-muted-foreground">
                Emailed{" "}
                {new Date(prospect.contactedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <a
              href={`https://www.tiktok.com/@${prospect.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Open @${prospect.handle} on TikTok`}
            >
              <ExternalLink className="size-4" />
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onDraft}
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {hasDraft ? "Rewrite" : "Draft"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleExpand}
            >
              {expanded ? "Close" : "Edit"}
            </Button>
          </div>
        </div>

        {expanded ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <label className="flex flex-col gap-1.5">
              <span className="micro text-muted-foreground">Email address</span>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => {
                  if (email.trim() !== (prospect.email ?? "")) {
                    onPatch({ email: email.trim() });
                  }
                }}
                placeholder="them@example.com"
                type="email"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="micro text-muted-foreground">Subject</span>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                onBlur={() => {
                  if (subject !== (prospect.draftSubject ?? "")) {
                    onPatch({ draftSubject: subject });
                  }
                }}
                placeholder="Write a draft, or type your own"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="micro text-muted-foreground">Body</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onBlur={() => {
                  if (body !== (prospect.draftBody ?? "")) {
                    onPatch({ draftBody: body });
                  }
                }}
                rows={9}
                placeholder="Hit Draft to have a first version written for you."
                className="w-full rounded-2xl border border-input bg-transparent px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2">
                <span className="micro text-muted-foreground">Status</span>
                <select
                  value={prospect.status}
                  onChange={(event) => onPatch({ status: event.target.value })}
                  className="rounded-full border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:border-ring"
                >
                  {OUTREACH_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {OUTREACH_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={onRemove}
                  aria-label={`Remove @${prospect.handle}`}
                >
                  <Trash2 />
                </Button>

                {prospect.contactedAt ? (
                  <span className="micro text-muted-foreground">
                    Already sent
                  </span>
                ) : (
                  <>
                    {opened ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={onMarkSent}
                      >
                        <Check />
                        Mark as sent
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      disabled={!composeUrl}
                      render={
                        composeUrl ? (
                          <a
                            href={composeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpened(true)}
                          />
                        ) : undefined
                      }
                    >
                      <Send />
                      Open in Gmail
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
