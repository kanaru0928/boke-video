import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { cn } from "../../shared/ui/classNames";
import type { RoomStreamStatus } from "../rooms/room_api";
import { PlayerSettingsPopover } from "./PlayerSettingsPopover";
import { formatElapsedTime } from "./room_activity";
import type { PlaybackQualityOption } from "./stream_quality";
import { useSettingsPopover } from "./useSettingsPopover";
import {
  liveBadgeClassName,
  playerControlsClassName,
  playerControlsVisibleClassName,
  playTimeClassName,
} from "./watchStyles";

type PlayerControlsProps = {
  commentsVisible: boolean;
  controlsVisible: boolean;
  elapsedSeconds: number;
  isFullscreen: boolean;
  isMuted: boolean;
  isPaused: boolean;
  onCommentsVisibleChange: (visible: boolean) => void;
  onQualityChange: (qualityId: string) => void;
  onToggleFullscreen: () => void;
  onToggleMuted: () => void;
  onTogglePlayback: () => void;
  playbackQualities: PlaybackQualityOption[];
  selectedQualityId: string;
  streamStatus: RoomStreamStatus;
};

export function PlayerControls({
  commentsVisible,
  controlsVisible,
  elapsedSeconds,
  isFullscreen,
  isMuted,
  isPaused,
  onCommentsVisibleChange,
  onQualityChange,
  onToggleFullscreen,
  onToggleMuted,
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
          aria-label={isMuted ? "消音中" : "音声"}
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
        <span className={playTimeClassName}>
          経過時間　{formatElapsedTime(elapsedSeconds)}
        </span>
        {streamStatus === "live" ? (
          <span className={liveBadgeClassName}>●LIVE</span>
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
          className="max-[520px]:hidden"
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
