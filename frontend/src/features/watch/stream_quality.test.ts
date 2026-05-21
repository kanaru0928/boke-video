import { describe, expect, it } from "vitest";
import {
  autoQualityId,
  playbackQualityOptions,
  selectedPlaybackQuality,
} from "./stream_quality";

describe("playbackQualityOptions", () => {
  it("署名済み再生URLから自動画質とAPI由来の選択肢を返す", () => {
    const options = playbackQualityOptions(
      "wss://example.com/live/main/master",
      [
        {
          id: "source",
          label: "元画質",
          playbackUrl: "wss://example.com/live/main",
        },
      ],
    );

    expect(options).toEqual([
      {
        id: autoQualityId,
        label: "自動",
        playbackUrl: "wss://example.com/live/main/master",
      },
      {
        id: "source",
        label: "元画質",
        playbackUrl: "wss://example.com/live/main",
      },
    ]);
  });

  it("選択中の画質が消えた場合は自動画質を使う", () => {
    const options = playbackQualityOptions(
      "wss://example.com/live/main/master",
      [],
    );

    expect(selectedPlaybackQuality(options, "source")).toEqual({
      id: autoQualityId,
      label: "自動",
      playbackUrl: "wss://example.com/live/main/master",
    });
  });
});
