import { describe, expect, it } from "vitest";
import { streamStatusMessage } from "./watch_stream";

describe("streamStatusMessage", () => {
  it("WHEP接続待ちの表示文言を返す", () => {
    expect(streamStatusMessage()).toBe("配信を準備しています");
  });
});
