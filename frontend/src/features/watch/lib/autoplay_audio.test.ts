import { describe, expect, it } from "vitest";
import {
  audioToggleLabel,
  mutedAutoplayNotice,
  unmuteAutoplayButtonLabel,
} from "./autoplay_audio";

describe("mutedAutoplayNotice", () => {
  it("ミュート自動再生中だけ自動再生制限として表示する", () => {
    const notice = mutedAutoplayNotice(true);

    expect(notice).not.toBeNull();
    expect(notice?.message).toContain("自動再生制限");
    expect(notice?.message).toContain("音声なし");
    expect(notice?.message).not.toContain("権限");
    expect(notice?.message).not.toContain("許可");
  });

  it("通常再生中は表示しない", () => {
    expect(mutedAutoplayNotice(false)).toBeNull();
  });
});

describe("audioToggleLabel", () => {
  it("通常ミュート中は音声をオンにする操作を示す", () => {
    expect(audioToggleLabel(true)).toBe("音声をオン");
  });

  it("音声あり再生中は音声をオフにする操作を示す", () => {
    expect(audioToggleLabel(false)).toBe("音声をオフ");
  });
});

describe("unmuteAutoplayButtonLabel", () => {
  it("動画枠内の解除ボタン文言を返す", () => {
    expect(unmuteAutoplayButtonLabel).toBe("ミュートを解除");
  });
});
