import { describe, expect, it } from "vitest";
import {
  commentLimit,
  horizontalLaneTop,
  verticalLaneLeft,
} from "./comment_layout";

describe("commentLimit", () => {
  it("画面幅ごとのコメント上限を返す", () => {
    expect(commentLimit(390)).toBe(45);
    expect(commentLimit(800)).toBe(80);
    expect(commentLimit(1280)).toBe(120);
  });
});

describe("horizontalLaneTop", () => {
  it("横移動コメントを動画レイヤー内の行に配置する", () => {
    expect(horizontalLaneTop(0, 180)).toEqual({
      property: "top",
      value: "0px",
    });
    expect(horizontalLaneTop(4, 180)).toEqual({
      property: "top",
      value: "136px",
    });
    expect(horizontalLaneTop(5, 180)).toEqual({
      property: "top",
      value: "0px",
    });
  });
});

describe("verticalLaneLeft", () => {
  it("縦移動コメントを動画レイヤー内の列に配置する", () => {
    expect(verticalLaneLeft(0, 160)).toEqual({
      property: "left",
      value: "0px",
    });
    expect(verticalLaneLeft(3, 160)).toEqual({
      property: "left",
      value: "120px",
    });
    expect(verticalLaneLeft(4, 160)).toEqual({
      property: "left",
      value: "0px",
    });
  });
});
