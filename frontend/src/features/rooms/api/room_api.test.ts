import { describe, expect, it } from "vitest";
import {
  isCommentMessage,
  isPublicRoom,
  isRoom,
  isRoomStats,
} from "./room_api";

describe("isRoom", () => {
  it("ルーム形式の値だけを受け入れる", () => {
    expect(
      isRoom({
        id: "room-1",
        title: "配信",
        thumbnailUrl: "",
        thumbnailUpdatedAt: "2026-05-09T00:00:00Z",
        thumbnailRefreshSeconds: 15,
        streamStatus: "waiting",
        streamStartedAt: null,
        streamLastSeenAt: null,
        streamEndedAt: null,
        createdAt: "2026-05-09T00:00:00Z",
        hasPassword: false,
      }),
    ).toBe(true);
    expect(isRoom({ id: "room-1", title: "配信" })).toBe(false);
  });
});

describe("isPublicRoom", () => {
  it("公開ルーム一覧形式の値だけを受け入れる", () => {
    expect(
      isPublicRoom({
        id: "room-1",
        title: "配信",
        thumbnailUrl: "",
        thumbnailUpdatedAt: "2026-05-09T00:00:00Z",
        thumbnailRefreshSeconds: 15,
        streamStatus: "live",
        streamStartedAt: "2026-05-09T00:00:00Z",
        streamLastSeenAt: "2026-05-09T00:00:00Z",
        streamEndedAt: null,
        createdAt: "2026-05-09T00:00:00Z",
        hasPassword: false,
        ownerDisplayName: "配信者",
        currentViewerCount: 3,
        maxConcurrentViewerCount: 4,
        elapsedSeconds: 125,
      }),
    ).toBe(true);
    expect(
      isPublicRoom({
        id: "room-1",
        title: "配信",
        thumbnailUrl: "",
        thumbnailUpdatedAt: "2026-05-09T00:00:00Z",
        thumbnailRefreshSeconds: 15,
        streamStatus: "live",
        streamStartedAt: "2026-05-09T00:00:00Z",
        streamLastSeenAt: "2026-05-09T00:00:00Z",
        streamEndedAt: null,
        createdAt: "2026-05-09T00:00:00Z",
        hasPassword: false,
        ownerDisplayName: "配信者",
        currentViewerCount: "3",
        maxConcurrentViewerCount: 4,
        elapsedSeconds: 125,
      }),
    ).toBe(false);
  });
});

describe("isRoomStats", () => {
  it("ルーム統計形式の値だけを受け入れる", () => {
    expect(
      isRoomStats({
        roomId: "room-1",
        visitorCount: 12,
        commentCount: 34,
        currentViewerCount: 5,
        maxConcurrentViewerCount: 8,
        streamStatus: "live",
        startedAt: "2026-05-09T00:00:00Z",
        elapsedSeconds: 90,
      }),
    ).toBe(true);
    expect(
      isRoomStats({
        roomId: "room-1",
        visitorCount: "12",
        commentCount: 34,
        currentViewerCount: 5,
        maxConcurrentViewerCount: 8,
        streamStatus: "live",
        startedAt: "2026-05-09T00:00:00Z",
        elapsedSeconds: 90,
      }),
    ).toBe(false);
  });
});

describe("isCommentMessage", () => {
  it("コメント形式の値だけを受け入れる", () => {
    expect(
      isCommentMessage({
        type: "comment",
        commentId: "comment-1",
        roomId: "room-1",
        author: {
          subject: "user-1",
          displayName: "user-1",
        },
        body: "こんにちは",
        direction: "rightToLeft",
        color: "#ffffff",
        fontSize: "medium",
        sentAt: "2026-05-09T00:00:00Z",
      }),
    ).toBe(true);
    expect(
      isCommentMessage({ type: "error", roomId: "room-1", body: "こんにちは" }),
    ).toBe(false);
  });
});
