import { describe, expect, it } from "vitest";
import {
  playerScrollTopAfterCommentFocus,
  shouldFocusTextareaWithoutScroll,
} from "./CommentForm";

const mobileDevice = {
  maxTouchPoints: 5,
  platform: "iPhone",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  userAgentDataMobile: null,
};

const desktopDevice = {
  maxTouchPoints: 0,
  platform: "MacIntel",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
  userAgentDataMobile: null,
};

describe("CommentForm", () => {
  it("未フォーカスのtextareaだけpreventScroll付きfocus対象にする", () => {
    const textarea = {} as HTMLTextAreaElement;
    const otherElement = {} as Element;

    expect(shouldFocusTextareaWithoutScroll(null, textarea, mobileDevice)).toBe(
      true,
    );
    expect(
      shouldFocusTextareaWithoutScroll(otherElement, textarea, mobileDevice),
    ).toBe(true);
    expect(
      shouldFocusTextareaWithoutScroll(textarea, textarea, mobileDevice),
    ).toBe(false);
  });

  it("PCではtextareaのスクロール制御を使わない", () => {
    const textarea = {} as HTMLTextAreaElement;

    expect(
      shouldFocusTextareaWithoutScroll(null, textarea, desktopDevice),
    ).toBe(false);
  });

  it("コメント入力時はプレイヤー上部に余白を残す位置へスクロールする", () => {
    expect(playerScrollTopAfterCommentFocus(120, 400)).toBe(510);
    expect(playerScrollTopAfterCommentFocus(4, 0)).toBe(0);
  });
});
