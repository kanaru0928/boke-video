import { describe, expect, it } from "vitest";
import { shouldFocusTextareaWithoutScroll } from "./CommentForm";

describe("CommentForm", () => {
  it("未フォーカスのtextareaだけpreventScroll付きfocus対象にする", () => {
    const textarea = {} as HTMLTextAreaElement;
    const otherElement = {} as Element;

    expect(shouldFocusTextareaWithoutScroll(null, textarea)).toBe(true);
    expect(shouldFocusTextareaWithoutScroll(otherElement, textarea)).toBe(true);
    expect(shouldFocusTextareaWithoutScroll(textarea, textarea)).toBe(false);
  });
});
