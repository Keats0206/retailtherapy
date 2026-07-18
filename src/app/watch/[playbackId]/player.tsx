"use client";

import MuxPlayer from "@mux/mux-player-react";

export default function Player({ playbackId }: { playbackId: string }) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      streamType="live"
      autoPlay="muted"
      accentColor="#18181b"
      className="aspect-video w-full overflow-hidden rounded-xl bg-black"
      metadata={{ video_title: `Live stream ${playbackId}` }}
    />
  );
}
