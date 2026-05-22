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

  it("ミュート自動再生を許可しない場合は操作待ちにする", async () => {
    const video = createPlayableVideo(false, () =>
      Promise.reject(new DOMException("blocked", "NotAllowedError")),
    );

    await expect(startVideoPlayback(video, { sound: "unmute" })).resolves.toBe(
      "manualPlaybackRequired",
    );

    expect(video.muted).toBe(false);
  });

  it("音あり自動再生が拒否されたらミュート自動再生を試す", async () => {
    let playCount = 0;
    const video = createPlayableVideo(false, () => {
      playCount += 1;
      if (playCount === 1) {
        return Promise.reject(new DOMException("blocked", "NotAllowedError"));
      }
      return Promise.resolve();
    });

    await expect(
      startVideoPlayback(video, {
        allowMutedAutoplay: true,
        sound: "unmute",
      }),
    ).resolves.toBe("mutedPlaying");

    expect(playCount).toBe(2);
    expect(video.muted).toBe(true);
  });

  it("ミュート自動再生も拒否されたら操作待ちにする", async () => {
    const video = createPlayableVideo(false, () =>
      Promise.reject(new DOMException("blocked", "NotAllowedError")),
    );

    await expect(
      startVideoPlayback(video, {
        allowMutedAutoplay: true,
        sound: "unmute",
      }),
    ).resolves.toBe("manualPlaybackRequired");

    expect(video.muted).toBe(true);
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
