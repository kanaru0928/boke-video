type MutedAutoplayNotice = {
  message: string;
};

export function mutedAutoplayNotice(
  isMutedAutoplay: boolean,
): MutedAutoplayNotice | null {
  if (!isMutedAutoplay) {
    return null;
  }
  return {
    message:
      "ブラウザの自動再生制限により、音声なしで再生しています。音声を聞くにはボタンを押してください。",
  };
}

export const unmuteAutoplayButtonLabel = "ミュートを解除";

export function audioToggleLabel(isMuted: boolean): string {
  return isMuted ? "音声をオン" : "音声をオフ";
}
