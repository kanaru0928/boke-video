import { describe, expect, it } from "vitest";
import { isFullscreenShortcut } from "./fullscreen_shortcuts";

describe("isFullscreenShortcut", () => {
  const textareaTarget = Object.assign(new EventTarget(), {
    nodeName: "TEXTAREA",
  });

  it("fキーを全画面ショートカットとして扱う", () => {
    expect(
      isFullscreenShortcut({
        key: "f",
        metaKey: false,
        ctrlKey: false,
        target: null,
      }),
    ).toBe(true);
    expect(
      isFullscreenShortcut({
        key: "F",
        metaKey: false,
        ctrlKey: false,
        target: null,
      }),
    ).toBe(true);
  });

  it("入力中と修飾キー付き入力では反応しない", () => {
    expect(
      isFullscreenShortcut({
        key: "f",
        metaKey: true,
        ctrlKey: false,
        target: null,
      }),
    ).toBe(false);
    expect(
      isFullscreenShortcut({
        key: "f",
        metaKey: false,
        ctrlKey: false,
        target: textareaTarget,
      }),
    ).toBe(false);
  });
});
