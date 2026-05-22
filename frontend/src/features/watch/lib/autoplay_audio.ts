type MutedAutoplayNotice = {
  message: string;
};

export type AutoplayNoticeDevice = {
  maxTouchPoints: number;
  platform: string;
  userAgent: string;
  userAgentDataMobile: boolean | null;
};

export function mutedAutoplayNotice(
  isMutedAutoplay: boolean,
  device: AutoplayNoticeDevice,
): MutedAutoplayNotice | null {
  if (!isMutedAutoplay || isMobileDevice(device)) {
    return null;
  }
  return {
    message:
      "音声なしで再生中です。次回から音声ありで自動再生したい場合は、アドレスバー左のサイト設定で音声を許可してください。",
  };
}

export const unmuteAutoplayButtonLabel = "ミュートを解除";

export function audioToggleLabel(isMuted: boolean): string {
  return isMuted ? "音声をオン" : "音声をオフ";
}

export function autoplayNoticeDevice(
  navigator: Navigator,
): AutoplayNoticeDevice {
  const userAgentData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  return {
    maxTouchPoints: navigator.maxTouchPoints,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    userAgentDataMobile:
      typeof userAgentData.userAgentData?.mobile === "boolean"
        ? userAgentData.userAgentData.mobile
        : null,
  };
}

export function isMobileDevice(device: AutoplayNoticeDevice): boolean {
  if (device.userAgentDataMobile !== null) {
    return device.userAgentDataMobile;
  }
  if (/iPhone|iPod|Android.*Mobile/.test(device.userAgent)) {
    return true;
  }
  return device.platform === "MacIntel" && device.maxTouchPoints > 1;
}
