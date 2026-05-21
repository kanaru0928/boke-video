import { describe, expect, it } from "vitest";
import {
  CommentLaneAllocator,
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
  it("横移動コメントの行数を動画レイヤーの高さから返す", () => {
    expect(horizontalLaneCount(0)).toBe(1);
    expect(horizontalLaneCount(180)).toBe(5);
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

describe("verticalLaneCount", () => {
  it("縦移動コメントの列数を動画レイヤーの幅から返す", () => {
    expect(verticalLaneCount(0)).toBe(1);
    expect(verticalLaneCount(160)).toBe(4);
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
