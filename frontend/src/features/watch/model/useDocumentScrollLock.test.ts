import { describe, expect, it } from "vitest";
import { lockedBodyStyle } from "./useDocumentScrollLock";

describe("useDocumentScrollLock", () => {
  it("現在のスクロール位置を維持したままbodyを固定するstyleを返す", () => {
    expect(lockedBodyStyle(12, 34)).toEqual({
      left: "-12px",
      overflow: "hidden",
      position: "fixed",
      top: "-34px",
      width: "100%",
    });
  });
});
