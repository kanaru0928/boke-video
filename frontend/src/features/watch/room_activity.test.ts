import { describe, expect, it } from "vitest";
import type { CommentMessage } from "../comments/types";
import {
  appendRecentComment,
  commentLogNumber,
  formatElapsedTime,
} from "./room_activity";

describe("formatElapsedTime", () => {
  it("秒数を分秒表示にする", () => {
    expect(formatElapsedTime(0)).toBe("0:00");
    expect(formatElapsedTime(65)).toBe("1:05");
    expect(formatElapsedTime(-1)).toBe("0:00");
  });
});

describe("commentLogNumber", () => {
  it("総コメント数をもとに表示番号を計算する", () => {
    expect(commentLogNumber(0, 3, 10)).toBe(8);
    expect(commentLogNumber(2, 3, 10)).toBe(10);
    expect(commentLogNumber(0, 3, 2)).toBe(1);
  });
});

describe("appendRecentComment", () => {
  it("新しいコメントを追加し最大件数に丸める", () => {
    const comments: CommentMessage[] = [
      createComment("1", "one"),
      createComment("2", "two"),
    ];
    expect(
      appendRecentComment(comments, createComment("3", "three"), 2),
    ).toEqual([createComment("2", "two"), createComment("3", "three")]);
  });
});

function createComment(commentId: string, body: string): CommentMessage {
  return {
    type: "comment",
    roomId: "room-1",
    commentId,
    body,
    direction: "rightToLeft",
    color: "#ffffff",
    fontSize: "medium",
    sentAt: "2026-05-09T00:00:00Z",
  };
}
