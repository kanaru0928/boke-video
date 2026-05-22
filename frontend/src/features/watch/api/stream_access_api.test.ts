import { describe, expect, it } from "vitest";
import { isStreamAccess } from "./stream_access_api";

describe("isStreamAccess", () => {
  it("署名済み再生URLを含むレスポンスを受け入れる", () => {
    expect(
      isStreamAccess({
        playbackUrl:
          "wss://rtc.example.com:443/live/main/master?policy=p&signature=s",
        playbackVariants: [
          {
            id: "source",
            label: "元画質",
            playbackUrl:
              "wss://rtc.example.com:443/live/main?policy=p&signature=s",
          },
        ],
      }),
    ).toBe(true);
  });

  it("再生URLが空のレスポンスを拒否する", () => {
    expect(isStreamAccess({ playbackUrl: "" })).toBe(false);
  });

  it("画質選択肢のURLが空のレスポンスを拒否する", () => {
    expect(
      isStreamAccess({
        playbackUrl:
          "wss://rtc.example.com:443/live/main/master?policy=p&signature=s",
        playbackVariants: [
          {
            id: "source",
            label: "元画質",
            playbackUrl: "",
          },
        ],
      }),
    ).toBe(false);
  });
});
