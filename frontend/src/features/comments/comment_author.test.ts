import { describe, expect, it } from "vitest";
import { commentAuthorLabel } from "./comment_author";

describe("commentAuthorLabel", () => {
  it("表示名を優先する", () => {
    expect(
      commentAuthorLabel({
        subject: "subject-1",
        email: "user@example.test",
        displayName: "表示名",
      }),
    ).toBe("表示名");
  });

  it("表示名が空ならemailを使う", () => {
    expect(
      commentAuthorLabel({
        subject: "subject-1",
        email: "user@example.test",
        displayName: "",
      }),
    ).toBe("user@example.test");
  });

  it("表示名とemailが空ならsubjectを使う", () => {
    expect(
      commentAuthorLabel({
        subject: "subject-1",
        email: "",
        displayName: "",
      }),
    ).toBe("subject-1");
  });
});
