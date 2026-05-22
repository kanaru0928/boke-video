type MutedAutoplayNotice = {
  actionLabel: string;
  message: string;
};

export function mutedAutoplayNotice(
  isMutedAutoplay: boolean,
): MutedAutoplayNotice | null {
  if (!isMutedAutoplay) {
    return null;
  }
  return {
    actionLabel: "音声をオン",
    message:
      "ブラウザの自動再生制限により、音声なしで再生しています。音声を聞くにはボタンを押してください。",
  };
}

export function audioToggleLabel(options: {
  isMuted: boolean;
  isMutedAutoplay: boolean;
}): string {
  if (options.isMutedAutoplay) {
    return "自動再生制限で音声なし。音声をオン";
  }
  if (options.isMuted) {
    return "音声をオン";
  }
  return "音声をオフ";
}
