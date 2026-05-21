import { describe, expect, it } from "vitest";
import { streamStatusMessage } from "./watch_stream";

describe("streamStatusMessage", () => {
  it("配信準備中の表示文言を返す", () => {
    expect(streamStatusMessage("waiting")).toBe("配信を準備しています");
  });

  it("配信終了の表示文言を返す", () => {
    expect(streamStatusMessage("ended")).toBe("配信は終了しました");
  });
});
