import { describe, expect, it } from "vitest";
import { buildWhepUrl, streamStatusMessage } from "./watch_stream";

describe("buildWhepUrl", () => {
  it("MediaMTXのWHEP URLを組み立てる", () => {
    expect(buildWhepUrl("http://127.0.0.1:8889/", "obs-local")).toBe(
      "http://127.0.0.1:8889/live/obs-local/whep",
    );
  });
});

describe("streamStatusMessage", () => {
  it("WHEP接続待ちの表示文言を返す", () => {
    expect(streamStatusMessage()).toBe("配信を準備しています");
  });
});
