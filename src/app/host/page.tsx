"use client";

import { useState } from "react";
import Link from "next/link";

type Stream = {
  id: string;
  streamKey: string | null;
  rtmpUrl: string;
  playbackId: string | null;
  status?: string;
};

function Field({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
          {value}
        </code>
        <button
          onClick={copy}
          className="shrink-0 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function HostPage() {
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createStream() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/streams", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create stream");
      setStream(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Go live
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Create a Mux live stream, then point your broadcast software (OBS,
          Streamlabs, etc.) at the RTMP server below.
        </p>
      </header>

      {!stream && (
        <button
          onClick={createStream}
          disabled={loading}
          className="w-fit rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Creating…" : "Create live stream"}
        </button>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {stream && (
        <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="flex flex-col gap-4">
            <Field label="RTMP server URL" value={stream.rtmpUrl} />
            {stream.streamKey && (
              <Field label="Stream key" value={stream.streamKey} />
            )}
          </div>

          <p className="text-sm text-zinc-500">
            In OBS: Settings → Stream → Service &ldquo;Custom&rdquo;, paste the
            server URL and stream key, then Start Streaming.
          </p>

          {stream.playbackId && (
            <Link
              href={`/watch/${stream.playbackId}`}
              className="w-fit rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Open viewer page →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
