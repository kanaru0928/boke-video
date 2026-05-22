import { describe, expect, it } from "vitest";
import { audioToggleLabel, mutedAutoplayNotice } from "./autoplay_audio";

describe("mutedAutoplayNotice", () => {
  it("ミュート自動再生中だけ自動再生制限として表示する", () => {
    const notice = mutedAutoplayNotice(true);

    expect(notice).not.toBeNull();
    expect(notice?.message).toContain("自動再生制限");
    expect(notice?.message).toContain("音声なし");
    expect(notice?.message).not.toContain("権限");
    expect(notice?.message).not.toContain("許可");
    expect(notice?.actionLabel).toBe("音声をオン");
  });

  it("通常再生中は表示しない", () => {
    expect(mutedAutoplayNotice(false)).toBeNull();
  });
});

describe("audioToggleLabel", () => {
  it("ミュート自動再生中は解除操作を示す", () => {
    expect(audioToggleLabel({ isMuted: true, isMutedAutoplay: true })).toBe(
      "自動再生制限で音声なし。音声をオン",
    );
  });

  it("通常ミュート中は音声をオンにする操作を示す", () => {
    expect(audioToggleLabel({ isMuted: true, isMutedAutoplay: false })).toBe(
      "音声をオン",
    );
  });

  it("音声あり再生中は音声をオフにする操作を示す", () => {
    expect(audioToggleLabel({ isMuted: false, isMutedAutoplay: false })).toBe(
      "音声をオフ",
    );
  });
});
