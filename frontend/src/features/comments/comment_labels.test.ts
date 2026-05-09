import { describe, expect, it } from "vitest";
import { directionLabel } from "./comment_labels";

describe("directionLabel", () => {
  it("コメント方向を表示文言に変換する", () => {
    expect(directionLabel("rightToLeft")).toBe("右から左");
    expect(directionLabel("bottomToTop")).toBe("下から上");
  });
});
