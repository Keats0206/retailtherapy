import GoLiveClient from "./go-live-client";

/**
 * Creator-side flow for /ui-proto: preshow prep (camera, store tabs, viewer
 * preview) then a mock live studio. No LiveKit — same in-memory state as
 * /prototype's creator pane.
 */
export default function UiProtoGoLivePage() {
  return <GoLiveClient />;
}
