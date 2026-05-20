import { describe, expect, it } from "vitest";
import { isStreamAccess } from "./stream_access_api";

describe("isStreamAccess", () => {
  it("署名済みWHEP URLを含むレスポンスを受け入れる", () => {
    expect(
      isStreamAccess({
        whepUrl:
          "https://rtc.example.com:443/live/main/whep?policy=p&signature=s",
      }),
    ).toBe(true);
  });

  it("WHEP URLが空のレスポンスを拒否する", () => {
    expect(isStreamAccess({ whepUrl: "" })).toBe(false);
  });
});
