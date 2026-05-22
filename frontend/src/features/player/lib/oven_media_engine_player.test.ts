import { describe, expect, it } from "vitest";
import {
  isNetworkInsufficientForPlayback,
  startVideoPlayback,
} from "./oven_media_engine_player";

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

describe("isNetworkInsufficientForPlayback", () => {
  it("受信パケットに対するロスが大きい場合はネットワーク不足にする", () => {
    expect(
      isNetworkInsufficientForPlayback(
        { packetsLost: 10, packetsReceived: 1000, timestamp: 1000 },
        { packetsLost: 30, packetsReceived: 1100, timestamp: 2000 },
      ),
    ).toBe(true);
  });

  it("ロスが少ない場合はネットワーク不足にしない", () => {
    expect(
      isNetworkInsufficientForPlayback(
        { packetsLost: 10, packetsReceived: 1000, timestamp: 1000 },
        { packetsLost: 12, packetsReceived: 1120, timestamp: 2000 },
      ),
    ).toBe(false);
  });

  it("サンプル量が少ない場合はネットワーク不足にしない", () => {
    expect(
      isNetworkInsufficientForPlayback(
        { packetsLost: 10, packetsReceived: 1000, timestamp: 1000 },
        { packetsLost: 20, packetsReceived: 1040, timestamp: 2000 },
      ),
    ).toBe(false);
  });
});

function createPlayableVideo(
  muted: boolean,
  play: () => Promise<void>,
): Pick<HTMLVideoElement, "muted" | "play"> {
  return { muted, play };
}
