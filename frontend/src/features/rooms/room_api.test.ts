import { describe, expect, it } from "vitest";
import { isCommentMessage, isRoom } from "./room_api";

describe("isRoom", () => {
  it("ルーム形式の値だけを受け入れる", () => {
    expect(
      isRoom({
        id: "room-1",
        title: "配信",
        createdAt: "2026-05-09T00:00:00Z",
      }),
    ).toBe(true);
    expect(isRoom({ id: "room-1", title: "配信" })).toBe(false);
  });
});

describe("isCommentMessage", () => {
  it("コメント形式の値だけを受け入れる", () => {
    expect(
      isCommentMessage({
        type: "comment",
        commentId: "comment-1",
        roomId: "room-1",
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
