import { MessageSquare } from "lucide-react";
import { autoQualityId, type PlaybackQualityOption } from "./stream_quality";
import {
  settingsChipClassName,
  settingsChipEmptyClassName,
  settingsChipHeadingClassName,
  settingsChipRowClassName,
  settingsChipSegmentClassName,
  settingsChipSegmentInputClassName,
  settingsChipSegmentTextClassName,
} from "./watchStyles";

type PlayerSettingsPopoverProps = {
  commentsVisible: boolean;
  isOpen: boolean;
  playbackQualities: PlaybackQualityOption[];
  selectedQualityId: string;
  onCommentsVisibleChange: (visible: boolean) => void;
  onQualityChange: (qualityId: string) => void;
};

export function PlayerSettingsPopover({
  commentsVisible,
  isOpen,
  playbackQualities,
  selectedQualityId,
  onCommentsVisibleChange,
  onQualityChange,
}: PlayerSettingsPopoverProps) {
  if (!isOpen) {
    return null;
  }
  const checkedQualityId = playbackQualities.some(
    (quality) => quality.id === selectedQualityId,
  )
    ? selectedQualityId
    : autoQualityId;
  return (
    <div className={settingsChipClassName} role="menu" aria-label="設定">
      <p className={settingsChipHeadingClassName}>設定</p>
      <fieldset className={settingsChipRowClassName}>
        <legend>画質切替</legend>
        {playbackQualities.length === 0 ? (
          <span className={settingsChipEmptyClassName}>再生待ち</span>
        ) : (
          <div className={settingsChipSegmentClassName}>
            {playbackQualities.map((quality) => (
              <label key={quality.id}>
                <input
                  checked={checkedQualityId === quality.id}
                  className={settingsChipSegmentInputClassName}
                  name="playback-quality"
                  type="radio"
                  value={quality.id}
                  onChange={() => onQualityChange(quality.id)}
                />
                <span className={settingsChipSegmentTextClassName}>
                  {quality.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <fieldset className={settingsChipRowClassName}>
        <legend>コメント</legend>
        <div className={settingsChipSegmentClassName}>
          <label>
            <input
              checked={!commentsVisible}
              className={settingsChipSegmentInputClassName}
              name="comment-visible"
              type="radio"
              onChange={() => onCommentsVisibleChange(false)}
            />
            <span className={settingsChipSegmentTextClassName}>非表示</span>
          </label>
          <label>
            <input
              checked={commentsVisible}
              className={settingsChipSegmentInputClassName}
              name="comment-visible"
              type="radio"
              onChange={() => onCommentsVisibleChange(true)}
            />
            <span className={settingsChipSegmentTextClassName}>
              <MessageSquare aria-hidden="true" size={12} />
              表示
            </span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
