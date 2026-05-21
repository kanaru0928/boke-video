import { describe, expect, it } from "vitest";
import { preventPlayerContextMenu } from "./WatchPlayer";
import { playerControlsClassName, stageClassName } from "./watchStyles";

describe("WatchPlayer", () => {
  it("動画領域を16:9にする", () => {
    expect(stageClassName).toContain("aspect-video");
  });

  it("コントロールを通常は隠し、操作時に表示する", () => {
    expect(playerControlsClassName).toContain("opacity-0");
    expect(playerControlsClassName).toContain("pointer-events-none");
    expect(playerControlsClassName).toContain("group-hover:opacity-100");
    expect(playerControlsClassName).toContain("group-focus-within:opacity-100");
    expect(playerControlsClassName).toContain(
      "[@media(pointer:coarse)]:opacity-100",
    );
  });

  it("コンテキストメニューを抑止する", () => {
    let prevented = false;

    preventPlayerContextMenu({
      preventDefault: () => {
        prevented = true;
      },
    });

    expect(prevented).toBe(true);
  });
});
