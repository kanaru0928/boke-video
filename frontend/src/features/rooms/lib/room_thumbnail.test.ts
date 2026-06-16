import { describe, expect, it } from "vitest";
import type { AppConfig } from "../../../shared/config/config";
import type { Room } from "../api/room_api";
import {
  roomThumbnail,
  roomThumbnailRefreshMilliseconds,
} from "./room_thumbnail";

describe("roomThumbnailRefreshMilliseconds", () => {
  it("枠一覧の最短更新間隔をミリ秒で返す", () => {
    expect(
      roomThumbnailRefreshMilliseconds([
        createRoom({
          id: "room-1",
          title: "配信",
          thumbnailUrl: "",
          thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
          thumbnailRefreshSeconds: 30,
        }),
        createRoom({
          id: "room-2",
          title: "配信2",
          thumbnailUrl: "",
          thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
          thumbnailRefreshSeconds: 15,
        }),
      ]),
    ).toBe(15000);
    expect(roomThumbnailRefreshMilliseconds([])).toBeNull();
  });
});

describe("roomThumbnail", () => {
  it("thumbnailUrlがあれば画像サムネイルとして扱う", () => {
    const thumbnail = roomThumbnail(
      createRoom({
        id: "room-1",
        title: "配信",
        thumbnailUrl: "/api/rooms/room-1/thumbnail",
        thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
        thumbnailRefreshSeconds: 30,
      }),
      testConfig,
    );
    expect(thumbnail.isPending).toBe(false);
    expect(thumbnail.crossOrigin).toBe("use-credentials");
    expect(thumbnail.url).toBe(
      "http://localhost:8080/api/rooms/room-1/thumbnail?updated=2026-05-20T10%3A00%3A00Z",
    );
  });

  it("thumbnailUrlが空ならサムネイル待ちとして扱う", () => {
    const thumbnail = roomThumbnail(
      createRoom({
        id: "room-1",
        title: "配信",
        thumbnailUrl: "",
        thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
        thumbnailRefreshSeconds: 30,
      }),
      testConfig,
    );
    expect(thumbnail.isPending).toBe(true);
    expect(thumbnail.crossOrigin).toBeUndefined();
    expect(thumbnail.url).toBeNull();
    expect(thumbnail.toneClassName).toContain("linear-gradient");
  });
});

const testConfig: AppConfig = {
  apiBaseUrl: "http://localhost:8080",
  commentWsUrl: "ws://localhost:8080",
  ingestBaseUrl: "http://localhost:8080",
  accessEnabled: true,
};

function createRoom(room: Partial<Room> & Pick<Room, "id" | "title">): Room {
  return {
    thumbnailUrl: "",
    thumbnailUpdatedAt: "2026-05-20T10:00:00Z",
    thumbnailRefreshSeconds: 15,
    streamStatus: "waiting",
    streamStartedAt: null,
    streamLastSeenAt: null,
    streamEndedAt: null,
    createdAt: "2026-05-20T10:00:00Z",
    hasPassword: false,
    ...room,
  };
}
