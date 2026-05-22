import type { StreamPlaybackVariant } from "../api/stream_access_api";

export type PlaybackQualityOption = {
  id: string;
  label: string;
  playbackUrl: string;
};

export const autoQualityId = "auto";

export function playbackQualityOptions(
  playbackUrl: string,
  variants: StreamPlaybackVariant[] | undefined,
): PlaybackQualityOption[] {
  const autoOption = {
    id: autoQualityId,
    label: "自動",
    playbackUrl,
  };
  const variantOptions = variants ?? [];
  const uniqueVariants = variantOptions.filter(
    (variant, index) =>
      variant.id !== autoQualityId &&
      variantOptions.findIndex((current) => current.id === variant.id) ===
        index,
  );
  return [autoOption, ...uniqueVariants];
}

export function selectedPlaybackQuality(
  options: PlaybackQualityOption[],
  selectedQualityId: string,
): PlaybackQualityOption {
  return (
    options.find((option) => option.id === selectedQualityId) ?? options[0]
  );
}

export function downgradedPlaybackQuality(
  options: PlaybackQualityOption[],
  selectedQualityId: string,
): PlaybackQualityOption | null {
  const variantOptions = options.filter(
    (option) => option.id !== autoQualityId,
  );
  if (variantOptions.length === 0) {
    return null;
  }
  if (selectedQualityId === autoQualityId) {
    return variantOptions[0];
  }
  const currentIndex = variantOptions.findIndex(
    (option) => option.id === selectedQualityId,
  );
  if (currentIndex < 0 || currentIndex >= variantOptions.length - 1) {
    return null;
  }
  return variantOptions[currentIndex + 1];
}
