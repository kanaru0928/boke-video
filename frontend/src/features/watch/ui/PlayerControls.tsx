import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/ui/classNames";
import type { RoomStreamStatus } from "../../rooms/api/room_api";
import { audioToggleLabel } from "../lib/autoplay_audio";
import { formatElapsedTime } from "../lib/room_activity";
import type { PlaybackQualityOption } from "../lib/stream_quality";
import { useSettingsPopover } from "../model/useSettingsPopover";
import { PlayerSettingsPopover } from "./PlayerSettingsPopover";

type PlayerControlsProps = {
  canToggleFullscreen: boolean;
  canTogglePictureInPicture: boolean;
  commentsVisible: boolean;
  controlsVisible: boolean;
  elapsedSeconds: number;
  isFullscreen: boolean;
  isMuted: boolean;
  isPaused: boolean;
  isPictureInPicture: boolean;
  onCommentsVisibleChange: (visible: boolean) => void;
  onQualityChange: (qualityId: string) => void;
  onToggleFullscreen: () => void;
  onToggleMuted: () => void;
  onTogglePictureInPicture: () => void;
  onTogglePlayback: () => void;
  playbackQualities: PlaybackQualityOption[];
  selectedQualityId: string;
  streamStatus: RoomStreamStatus;
};

export const playerControlsClassName = cn(
  "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex min-h-[45px] items-center justify-between gap-2 opacity-0",
  "border-t border-t-[rgb(255_255_255_/_28%)] bg-[linear-gradient(rgb(0_0_0_/_10%),rgb(0_0_0_/_72%))] px-[10px] py-[6px] text-white",
  "transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
  "max-[520px]:min-h-[39px] max-[520px]:gap-[3px] max-[520px]:px-[5px] max-[520px]:py-[5px]",
);

export const playerControlsVisibleClassName = "pointer-events-auto opacity-100";

export function PlayerControls({
  canToggleFullscreen,
  canTogglePictureInPicture,
  commentsVisible,
  controlsVisible,
  elapsedSeconds,
  isFullscreen,
  isMuted,
  isPaused,
  isPictureInPicture,
  onCommentsVisibleChange,
  onQualityChange,
  onToggleFullscreen,
  onToggleMuted,
  onTogglePictureInPicture,
  onTogglePlayback,
  playbackQualities,
  selectedQualityId,
  streamStatus,
}: PlayerControlsProps) {
  const { settingsOpen, settingsRef, toggleSettings } = useSettingsPopover();

  return (
    <div
      className={cn(
        playerControlsClassName,
        controlsVisible && playerControlsVisibleClassName,
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <Button
          aria-label={isPaused ? "再生" : "一時停止"}
          id="play-toggle"
          square
          onClick={onTogglePlayback}
        >
          {isPaused ? (
            <Play aria-hidden="true" size={18} />
          ) : (
            <Pause aria-hidden="true" size={18} />
          )}
        </Button>
        <Button
          aria-label={audioToggleLabel(isMuted)}
          id="mute-toggle"
          square
          onClick={onToggleMuted}
        >
          {isMuted ? (
            <VolumeX aria-hidden="true" size={18} />
          ) : (
            <Volume2 aria-hidden="true" size={18} />
          )}
        </Button>
        <span
          className={cn(
            "min-w-[104px] rounded-xl border border-[#898989] px-[10px] py-1 text-center font-extrabold text-white",
            "bg-[linear-gradient(#464646,#111111_52%,#565656)] shadow-[inset_1px_1px_0_#8c8c8c]",
            "max-[520px]:min-w-[58px] max-[520px]:px-[6px] max-[520px]:text-xs",
          )}
        >
          <span className="max-[520px]:hidden">経過時間　</span>
          {formatElapsedTime(elapsedSeconds)}
        </span>
        {streamStatus === "live" ? (
          <span className="font-[Arial,sans-serif] text-[13px] font-extrabold tracking-normal text-[#ff134f] [text-shadow:1px_1px_0_#000000]">
            ●LIVE
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button
          aria-label="更新"
          id="reload-toggle"
          square
          onClick={() => location.reload()}
        >
          <RefreshCw aria-hidden="true" size={18} />
        </Button>
        <Button
          aria-label={isFullscreen ? "全画面を解除" : "全画面"}
          disabled={!canToggleFullscreen}
          id="fullscreen-toggle"
          square
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize aria-hidden="true" size={18} />
          ) : (
            <Maximize aria-hidden="true" size={18} />
          )}
        </Button>
        <Button
          aria-label={
            isPictureInPicture
              ? "ピクチャインピクチャを解除"
              : "ピクチャインピクチャ"
          }
          disabled={!canTogglePictureInPicture}
          id="picture-in-picture-toggle"
          square
          onClick={onTogglePictureInPicture}
        >
          <PictureInPicture aria-hidden="true" size={18} />
        </Button>
        <div className="relative" ref={settingsRef}>
          <PlayerSettingsPopover
            commentsVisible={commentsVisible}
            isOpen={settingsOpen}
            playbackQualities={playbackQualities}
            selectedQualityId={selectedQualityId}
            onCommentsVisibleChange={onCommentsVisibleChange}
            onQualityChange={onQualityChange}
          />
          <Button
            aria-expanded={settingsOpen}
            aria-label="設定"
            id="settings-toggle"
            square
            onClick={toggleSettings}
          >
            <Settings aria-hidden="true" size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
