import { describe, expect, it } from "vitest";
import { canPlayStream, streamStatusMessage } from "./watch_stream";

describe("canPlayStream", () => {
  it("DASHマニフェストがある状態だけ再生対象にする", () => {
    expect(
      canPlayStream({
        roomId: "room-1",
        stream: "ready",
        manifestPath: "/live/room-1/manifest.mpd",
        manifestAgeSec: 1,
      }),
    ).toBe(true);
    expect(
      canPlayStream({
        roomId: "room-1",
        stream: "stale",
        manifestPath: "/live/room-1/manifest.mpd",
        manifestAgeSec: 20,
      }),
    ).toBe(true);
    expect(
      canPlayStream({
        roomId: "room-1",
        stream: "missing",
        manifestPath: "",
        manifestAgeSec: 0,
      }),
    ).toBe(false);
    expect(canPlayStream(null)).toBe(false);
  });
});

describe("streamStatusMessage", () => {
  it("配信状態を視聴画面の表示文言に変換する", () => {
    expect(streamStatusMessage("ready")).toBe("");
    expect(streamStatusMessage("stale")).toBe("配信が停止しています");
    expect(streamStatusMessage("missing")).toBe("配信を準備しています");
    expect(streamStatusMessage("unknown")).toBe("配信を準備しています");
  });
});
