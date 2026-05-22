import { describe, expect, it } from "vitest";
import {
  CommentLaneAllocator,
  commentEdgeOffsetPixels,
  commentFontSizePixels,
  commentLimit,
  horizontalLaneCount,
  horizontalLaneTop,
  verticalLaneCount,
  verticalLaneLeft,
} from "./comment_layout";

describe("commentLimit", () => {
  it("画面幅ごとのコメント上限を返す", () => {
    expect(commentLimit(390)).toBe(45);
    expect(commentLimit(800)).toBe(80);
    expect(commentLimit(1280)).toBe(120);
  });
});

describe("CommentLaneAllocator", () => {
  it("横移動コメントで流れきった行を再利用する", () => {
    const allocator = new CommentLaneAllocator();

    expect(allocator.acquire("horizontal", 3)).toBe(0);
    expect(allocator.acquire("horizontal", 3)).toBe(1);

    allocator.release("horizontal", 0);

    expect(allocator.acquire("horizontal", 3)).toBe(0);
    expect(allocator.acquire("horizontal", 3)).toBe(2);
  });

  it("縦移動コメントで流れきった列を再利用する", () => {
    const allocator = new CommentLaneAllocator();

    expect(allocator.acquire("vertical", 2)).toBe(0);
    expect(allocator.acquire("vertical", 2)).toBe(1);

    allocator.release("vertical", 0);

    expect(allocator.acquire("vertical", 2)).toBe(0);
  });

  it("clearで使用中レーンを初期化する", () => {
    const allocator = new CommentLaneAllocator();

    expect(allocator.acquire("horizontal", 2)).toBe(0);
    expect(allocator.acquire("horizontal", 2)).toBe(1);

    allocator.clear();

    expect(allocator.acquire("horizontal", 2)).toBe(0);
  });

  it("満杯時に重なったレーンは全コメントが終わるまで空扱いしない", () => {
    const allocator = new CommentLaneAllocator();

    expect(allocator.acquire("horizontal", 1)).toBe(0);
    expect(allocator.acquire("horizontal", 1)).toBe(0);

    allocator.release("horizontal", 0);

    expect(allocator.acquire("horizontal", 2)).toBe(1);
    allocator.release("horizontal", 0);
    expect(allocator.acquire("horizontal", 2)).toBe(0);
  });
});

describe("horizontalLaneCount", () => {
  it("横移動コメントの行数をコメントサイズから返す", () => {
    expect(horizontalLaneCount(0)).toBe(1);
    expect(horizontalLaneCount(180)).toBe(14);
    expect(horizontalLaneCount(180, "small")).toBe(18);
    expect(horizontalLaneCount(180, "large")).toBe(11);
  });
});

describe("horizontalLaneTop", () => {
  it("横移動コメントを動画レイヤー内の比率で配置する", () => {
    expect(horizontalLaneTop(0, 180)).toEqual({
      property: "top",
      value: "0px",
    });
    expect(horizontalLaneTop(4, 180)).toEqual({
      property: "top",
      value: "51.429px",
    });
    expect(horizontalLaneTop(14, 180)).toEqual({
      property: "top",
      value: "0px",
    });
  });

  it("横移動コメントをコメントサイズごとの行に配置する", () => {
    expect(horizontalLaneTop(1, 180, "small")).toEqual({
      property: "top",
      value: "10px",
    });
    expect(horizontalLaneTop(1, 180, "large")).toEqual({
      property: "top",
      value: "16.364px",
    });
  });
});

describe("verticalLaneCount", () => {
  it("縦移動コメントの列数をコメントサイズから返す", () => {
    expect(verticalLaneCount(0)).toBe(1);
    expect(verticalLaneCount(160)).toBe(18);
    expect(verticalLaneCount(160, "small")).toBe(24);
    expect(verticalLaneCount(160, "large")).toBe(14);
  });
});

describe("verticalLaneLeft", () => {
  it("縦移動コメントを動画レイヤー内の比率で配置する", () => {
    expect(verticalLaneLeft(0, 160)).toEqual({
      property: "left",
      value: "0px",
    });
    expect(verticalLaneLeft(3, 160)).toEqual({
      property: "left",
      value: "26.667px",
    });
    expect(verticalLaneLeft(18, 160)).toEqual({
      property: "left",
      value: "0px",
    });
  });

  it("縦移動コメントをコメントサイズごとの列に配置する", () => {
    expect(verticalLaneLeft(1, 160, "small")).toEqual({
      property: "left",
      value: "6.667px",
    });
    expect(verticalLaneLeft(1, 160, "large")).toEqual({
      property: "left",
      value: "11.429px",
    });
  });
});

describe("commentFontSizePixels", () => {
  it("コメント文字サイズを動画レイヤーの高さに対する比率から返す", () => {
    expect(commentFontSizePixels(180, "small")).toBe(8);
    expect(commentFontSizePixels(180, "medium")).toBeCloseTo(10.286, 3);
    expect(commentFontSizePixels(180, "large")).toBeCloseTo(13.091, 3);
  });
});

describe("commentEdgeOffsetPixels", () => {
  it("固定コメントの上下余白を動画レイヤーの高さに対する比率から返す", () => {
    expect(commentEdgeOffsetPixels(180)).toBe(4.5);
    expect(commentEdgeOffsetPixels(480)).toBe(12);
  });
});
