import type { StreamPlaybackVariant } from "./stream_access_api";

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
