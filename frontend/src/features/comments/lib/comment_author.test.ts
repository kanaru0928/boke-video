import { describe, expect, it } from "vitest";
import { commentAuthorLabel } from "./comment_author";

describe("commentAuthorLabel", () => {
  it("表示名だけを使う", () => {
    expect(
      commentAuthorLabel({
        subject: "subject-1",
        displayName: "表示名",
      }),
    ).toBe("表示名");

    expect(
      commentAuthorLabel({
        subject: "subject-1",
        displayName: "",
      }),
    ).toBe("");
  });
});
