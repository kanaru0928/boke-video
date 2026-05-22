import { describe, expect, it } from "vitest";
import { startVideoPlayback } from "./oven_media_engine_player";

describe("startVideoPlayback", () => {
  it("音ありで再生を開始する", async () => {
    const video = createPlayableVideo(false, () => Promise.resolve());

    await expect(startVideoPlayback(video, { sound: "unmute" })).resolves.toBe(
      "playing",
    );

    expect(video.muted).toBe(false);
  });

  it("自動再生が拒否されてもミュート再生へ切り替えない", async () => {
    const video = createPlayableVideo(false, () =>
      Promise.reject(new DOMException("blocked", "NotAllowedError")),
    );

    await expect(startVideoPlayback(video, { sound: "unmute" })).resolves.toBe(
      "manualPlaybackRequired",
    );

    expect(video.muted).toBe(false);
  });

  it("手動操作時はミュート状態を解除してから再生する", async () => {
    const video = createPlayableVideo(true, () => Promise.resolve());

    await expect(startVideoPlayback(video, { sound: "unmute" })).resolves.toBe(
      "playing",
    );

    expect(video.muted).toBe(false);
  });
});

function createPlayableVideo(
  muted: boolean,
  play: () => Promise<void>,
): Pick<HTMLVideoElement, "muted" | "play"> {
  return { muted, play };
}
