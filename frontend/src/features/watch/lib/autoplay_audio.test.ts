import { describe, expect, it } from "vitest";
import {
  type AutoplayNoticeDevice,
  audioToggleLabel,
  autoplayNoticeDevice,
  mutedAutoplayNotice,
  unmuteAutoplayButtonLabel,
} from "./autoplay_audio";

const desktopDevice: AutoplayNoticeDevice = {
  maxTouchPoints: 0,
  platform: "MacIntel",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
  userAgentDataMobile: null,
};

describe("mutedAutoplayNotice", () => {
  it("PCではミュート自動再生中だけ音声許可の案内を表示する", () => {
    const notice = mutedAutoplayNotice(true, desktopDevice);

    expect(notice).not.toBeNull();
    expect(notice?.message).toContain("音声を許可");
    expect(notice?.message).toContain("音声なし");
  });

  it("通常再生中は表示しない", () => {
    expect(mutedAutoplayNotice(false, desktopDevice)).toBeNull();
  });

  it("iPhoneでは外側の案内を表示しない", () => {
    expect(
      mutedAutoplayNotice(true, {
        maxTouchPoints: 5,
        platform: "iPhone",
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        userAgentDataMobile: null,
      }),
    ).toBeNull();
  });

  it("iPadOS Safariでは外側の案内を表示しない", () => {
    expect(
      mutedAutoplayNotice(true, {
        maxTouchPoints: 5,
        platform: "MacIntel",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
        userAgentDataMobile: null,
      }),
    ).toBeNull();
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

describe("autoplayNoticeDevice", () => {
  it("Navigatorから判定に必要な値を取り出す", () => {
    expect(autoplayNoticeDevice(navigator).userAgent).toBe(navigator.userAgent);
  });
});
