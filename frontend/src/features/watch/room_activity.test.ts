import { describe, expect, it } from "vitest";
import {
  commentLogNumber,
  formatElapsedTime,
  isCommentLogScrolledToBottom,
} from "./room_activity";

describe("formatElapsedTime", () => {
  it("秒数を時間分秒表示にする", () => {
    expect(formatElapsedTime(0)).toBe("0:00");
    expect(formatElapsedTime(65)).toBe("1:05");
    expect(formatElapsedTime(80611)).toBe("22:23:31");
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

describe("isCommentLogScrolledToBottom", () => {
  it("コメント一覧が下端付近にあるか判定する", () => {
    expect(isCommentLogScrolledToBottom(692, 300, 1000)).toBe(true);
    expect(isCommentLogScrolledToBottom(691, 300, 1000)).toBe(false);
  });
});
