import { describe, expect, it } from "vitest";
import {
  playerScrollTopAfterCommentFocus,
  shouldFocusTextareaWithoutScroll,
} from "./CommentForm";

describe("CommentForm", () => {
  it("未フォーカスのtextareaだけpreventScroll付きfocus対象にする", () => {
    const textarea = {} as HTMLTextAreaElement;
    const otherElement = {} as Element;

    expect(shouldFocusTextareaWithoutScroll(null, textarea)).toBe(true);
    expect(shouldFocusTextareaWithoutScroll(otherElement, textarea)).toBe(true);
    expect(shouldFocusTextareaWithoutScroll(textarea, textarea)).toBe(false);
  });

  it("コメント入力時はプレイヤー上部に余白を残す位置へスクロールする", () => {
    expect(playerScrollTopAfterCommentFocus(120, 400)).toBe(510);
    expect(playerScrollTopAfterCommentFocus(4, 0)).toBe(0);
  });
});
