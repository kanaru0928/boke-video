import { describe, expect, it } from "vitest";
import { playerControlsIdleDelayMs } from "../model/usePlayerControlsVisibility";
import {
  playerControlsClassName,
  playerControlsVisibleClassName,
} from "./PlayerControls";
import { settingsChipClassName } from "./PlayerSettingsPopover";
import {
  preventPlayerContextMenu,
  shouldHideControlsOnPointerLeave,
  stageClassName,
  videoElementClassName,
} from "./WatchPlayer";

describe("WatchPlayer", () => {
  it("動画領域を16:9にする", () => {
    expect(stageClassName).toContain("aspect-video");
    expect(stageClassName).not.toContain("sticky");
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
    expect(playerControlsClassName).not.toContain(
      "[@media(pointer:coarse)]:opacity-100",
    );
    expect(playerControlsClassName).not.toContain("max-[520px]:hidden");
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

  it("タッチのpointerleaveではコントロールを即時非表示にしない", () => {
    expect(shouldHideControlsOnPointerLeave("mouse")).toBe(true);
    expect(shouldHideControlsOnPointerLeave("touch")).toBe(false);
    expect(shouldHideControlsOnPointerLeave("pen")).toBe(false);
  });

  it("設定チップはプレイヤー内に重ねて表示する", () => {
    expect(settingsChipClassName).toContain("fixed");
    expect(settingsChipClassName).toContain("z-[80]");
    expect(settingsChipClassName).toContain("border-[#666666]");
    expect(settingsChipClassName).not.toContain("border-[#e00000]");
  });
});
