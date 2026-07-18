// Create a Mux live stream from the command line.
//   node --env-file=.env.local scripts/create-stream.mjs
// Reads MUX_TOKEN_ID / MUX_TOKEN_SECRET from the env file.
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

const stream = await mux.video.liveStreams.create({
  playback_policies: ["public"],
  new_asset_settings: { playback_policies: ["public"] },
});

const playbackId = stream.playback_ids?.[0]?.id ?? null;

console.log("\n✅ Live stream created\n");
console.log("Stream ID:      ", stream.id);
console.log("Status:         ", stream.status);
console.log("RTMP server URL: rtmps://global-live.mux.com:443/app");
console.log("Stream key:     ", stream.stream_key);
console.log("Playback ID:    ", playbackId);
console.log("\nWatch page:      /watch/" + playbackId);
console.log("Test with ffmpeg:\n  ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \\");
console.log("    -f lavfi -i sine=frequency=440 -c:v libx264 -preset veryfast \\");
console.log("    -b:v 2500k -c:a aac -f flv \\");
console.log("    rtmps://global-live.mux.com:443/app/" + stream.stream_key + "\n");
