import {
  Maximize,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../shared/ui/Button";
import type { RoomStreamStatus } from "../rooms/room_api";
import { PlayerSettingsPopover } from "./PlayerSettingsPopover";
import { formatElapsedTime } from "./room_activity";
import type { PlaybackQualityOption } from "./stream_quality";
import {
  liveBadgeClassName,
  playerControlsClassName,
  playTimeClassName,
} from "./watchStyles";

type PlayerControlsProps = {
  commentsVisible: boolean;
  elapsedSeconds: number;
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
  elapsedSeconds,
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className={playerControlsClassName}>
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
          aria-label="全画面"
          className="max-[520px]:hidden"
          id="fullscreen-toggle"
          square
          onClick={onToggleFullscreen}
        >
          <Maximize aria-hidden="true" size={18} />
        </Button>
        <div className="relative">
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
            onClick={() => setSettingsOpen((current) => !current)}
          >
            <Settings aria-hidden="true" size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
