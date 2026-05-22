import { describe, expect, it } from "vitest";
import { streamStatusLabel, streamStatusMessage } from "./watch_stream";

describe("streamStatusMessage", () => {
  it("配信準備中の表示文言を返す", () => {
    expect(streamStatusMessage("waiting")).toBe("配信を準備しています");
  });

  it("配信終了の表示文言を返す", () => {
    expect(streamStatusMessage("ended")).toBe("配信は終了しました");
  });
});

describe("streamStatusLabel", () => {
  it("配信中の状態ラベルを返す", () => {
    expect(streamStatusLabel("live")).toBe("ON AIR");
  });

  it("配信終了の状態ラベルを返す", () => {
    expect(streamStatusLabel("ended")).toBe("配信終了");
  });
});
