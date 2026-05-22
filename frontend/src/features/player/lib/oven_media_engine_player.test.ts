import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isNetworkInsufficientForPlayback,
  isRecoverableVideoTrack,
  monitorVideoTrackRecovery,
  startVideoPlayback,
  videoTrackRecoveryDelayMs,
} from "./oven_media_engine_player";

afterEach(() => {
  vi.useRealTimers();
});

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

describe("isRecoverableVideoTrack", () => {
  it("映像トラックだけを復旧監視対象にする", () => {
    expect(isRecoverableVideoTrack({ kind: "video" })).toBe(true);
    expect(isRecoverableVideoTrack({ kind: "audio" })).toBe(false);
  });
});

describe("monitorVideoTrackRecovery", () => {
  it("映像トラックのmuteが続いたら接続終了として扱う", () => {
    vi.useFakeTimers();
    const track = createMediaStreamTrackEventTarget();
    const onConnectionClosed = vi.fn();

    monitorVideoTrackRecovery(track, onConnectionClosed);
    track.dispatchEvent(new Event("mute"));

    vi.advanceTimersByTime(videoTrackRecoveryDelayMs - 1);
    expect(onConnectionClosed).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onConnectionClosed).toHaveBeenCalledTimes(1);
  });

  it("映像トラックがunmuteしたら復旧待ちを取り消す", () => {
    vi.useFakeTimers();
    const track = createMediaStreamTrackEventTarget();
    const onConnectionClosed = vi.fn();

    monitorVideoTrackRecovery(track, onConnectionClosed);
    track.dispatchEvent(new Event("mute"));
    track.dispatchEvent(new Event("unmute"));
    vi.advanceTimersByTime(videoTrackRecoveryDelayMs);

    expect(onConnectionClosed).not.toHaveBeenCalled();
  });

  it("映像トラックがendedになったらすぐ接続終了として扱う", () => {
    const track = createMediaStreamTrackEventTarget();
    const onConnectionClosed = vi.fn();

    monitorVideoTrackRecovery(track, onConnectionClosed);
    track.dispatchEvent(new Event("ended"));

    expect(onConnectionClosed).toHaveBeenCalledTimes(1);
  });

  it("映像トラック復旧待ち時間を持つ", () => {
    expect(videoTrackRecoveryDelayMs).toBeGreaterThan(0);
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

function createMediaStreamTrackEventTarget(): Pick<
  MediaStreamTrack,
  "addEventListener" | "dispatchEvent" | "kind" | "removeEventListener"
> {
  const target = new EventTarget();
  return {
    addEventListener: target.addEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    kind: "video",
    removeEventListener: target.removeEventListener.bind(target),
  };
}
