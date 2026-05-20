import { describe, expect, it } from "vitest";
import { streamStatusMessage } from "./watch_stream";

describe("streamStatusMessage", () => {
  it("配信準備中の表示文言を返す", () => {
    expect(streamStatusMessage()).toBe("配信を準備しています");
  });
});
