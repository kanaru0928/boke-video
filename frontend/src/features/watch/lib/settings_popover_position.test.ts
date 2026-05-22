import { describe, expect, it } from "vitest";
import { settingsPopoverPosition } from "./settings_popover_position";

describe("settingsPopoverPosition", () => {
  it("設定ボタンの上に表示する位置を返す", () => {
    expect(
      settingsPopoverPosition(
        { right: 780, top: 420 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ bottom: 186, right: 20 });
  });

  it("画面端では余白を残す", () => {
    expect(
      settingsPopoverPosition(
        { right: 798, top: 598 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ bottom: 8, right: 6 });
  });
});
