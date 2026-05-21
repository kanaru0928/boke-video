import { describe, expect, it } from "vitest";
import { playerControlsIdleDelayMs } from "./usePlayerControlsVisibility";
import { preventPlayerContextMenu } from "./WatchPlayer";
import {
  playerControlsClassName,
  playerControlsVisibleClassName,
  settingsChipClassName,
  stageClassName,
  videoElementClassName,
} from "./watchStyles";

describe("WatchPlayer", () => {
  it("動画領域を16:9にする", () => {
    expect(stageClassName).toContain("aspect-video");
    expect(stageClassName).toContain("[&:fullscreen]:aspect-auto");
    expect(stageClassName).not.toContain("border-[5px]");
    expect(videoElementClassName).toContain("aspect-video");
    expect(videoElementClassName).toContain("object-cover");
  });

  it("コントロールを通常は隠し、操作時に表示する", () => {
    expect(playerControlsClassName).toContain("opacity-0");
    expect(playerControlsClassName).toContain("pointer-events-none");
    expect(playerControlsClassName).toContain("items-center");
    expect(playerControlsClassName).toContain("bg-[linear-gradient");
    expect(playerControlsClassName).not.toContain("bg-[#050505]");
    expect(playerControlsClassName).not.toContain("group-hover:opacity-100");
    expect(playerControlsClassName).toContain("group-focus-within:opacity-100");
    expect(playerControlsVisibleClassName).toContain("opacity-100");
    expect(playerControlsIdleDelayMs).toBeGreaterThan(0);
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

  it("設定チップはプレイヤー内に重ねて表示する", () => {
    expect(settingsChipClassName).toContain("absolute");
    expect(settingsChipClassName).toContain("bottom-[46px]");
    expect(settingsChipClassName).toContain("border-[#666666]");
    expect(settingsChipClassName).not.toContain("border-[#e00000]");
  });
});
