import { describe, expect, it } from "vitest";
import {
  roomThumbnail,
  roomThumbnailRefreshMilliseconds,
} from "./room_thumbnail";

describe("roomThumbnailRefreshMilliseconds", () => {
  it("枠一覧の最短更新間隔をミリ秒で返す", () => {
    expect(
      roomThumbnailRefreshMilliseconds([
        {
          id: "room-1",
          title: "配信",
          thumbnailUrl: "n/a",
          thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
          thumbnailRefreshSeconds: 30,
          createdAt: "2026-05-20T10:00:00Z",
        },
        {
          id: "room-2",
          title: "配信2",
          thumbnailUrl: "n/a",
          thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
          thumbnailRefreshSeconds: 15,
          createdAt: "2026-05-20T10:00:00Z",
        },
      ]),
    ).toBe(15000);
    expect(roomThumbnailRefreshMilliseconds([])).toBeNull();
  });
});

describe("roomThumbnail", () => {
  it("thumbnailUrlがあれば画像サムネイルとして扱う", () => {
    const thumbnail = roomThumbnail({
      id: "room-1",
      title: "配信",
      thumbnailUrl: "https://example.test/thumb.jpg",
      thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
      thumbnailRefreshSeconds: 30,
      createdAt: "2026-05-20T10:00:00Z",
    });
    expect(thumbnail.isGenerated).toBe(false);
    expect(thumbnail.url).toBe("https://example.test/thumb.jpg");
  });

  it("thumbnailUrlがn/aなら生成サムネイルとして扱う", () => {
    const thumbnail = roomThumbnail({
      id: "room-1",
      title: "配信",
      thumbnailUrl: "n/a",
      thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
      thumbnailRefreshSeconds: 30,
      createdAt: "2026-05-20T10:00:00Z",
    });
    expect(thumbnail.isGenerated).toBe(true);
    expect(thumbnail.url).toBeNull();
    expect(thumbnail.toneClassName).toContain("linear-gradient");
  });
});
