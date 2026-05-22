import { describe, expect, it } from "vitest";
import { isCommentSubmitShortcut } from "./comment_shortcuts";

describe("isCommentSubmitShortcut", () => {
  it("Command+EnterとCtrl+Enterを送信ショートカットとして扱う", () => {
    expect(
      isCommentSubmitShortcut({ key: "Enter", metaKey: true, ctrlKey: false }),
    ).toBe(true);
    expect(
      isCommentSubmitShortcut({ key: "Enter", metaKey: false, ctrlKey: true }),
    ).toBe(true);
    expect(
      isCommentSubmitShortcut({ key: "Enter", metaKey: false, ctrlKey: false }),
    ).toBe(false);
    expect(
      isCommentSubmitShortcut({ key: "a", metaKey: true, ctrlKey: false }),
    ).toBe(false);
  });
});
