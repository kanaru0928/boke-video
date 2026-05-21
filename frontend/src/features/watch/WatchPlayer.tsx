import {
  Maximize,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { type RefObject, useState } from "react";
import { cn } from "../../shared/ui/classNames";
import { buttonClassName } from "../../shared/ui/styles";
import type { RoomStreamStatus } from "../rooms/room_api";
import { PlayerSettingsPopover } from "./PlayerSettingsPopover";
import { formatElapsedTime } from "./room_activity";
import type { PlaybackQualityOption } from "./stream_quality";
import {
  commentsLayerClassName,
  liveBadgeClassName,
  playerControlsClassName,
  playTimeClassName,
  stageClassName,
  streamStatusClassName,
} from "./watchStyles";

type PreventableEvent = {
  preventDefault: () => void;
};

type WatchPlayerProps = {
  commentsLayerRef: RefObject<HTMLDivElement | null>;
  commentsVisible: boolean;
  elapsedSeconds: number;
  isMuted: boolean;
  isPaused: boolean;
  onToggleFullscreen: () => void;
  onToggleMuted: () => void;
  onTogglePlayback: () => void;
  onUpdatePlayerState: () => void;
  onCommentsVisibleChange: (visible: boolean) => void;
  onQualityChange: (qualityId: string) => void;
  playbackQualities: PlaybackQualityOption[];
  selectedQualityId: string;
  stageRef: RefObject<HTMLElement | null>;
  streamMessage: string;
  streamStatus: RoomStreamStatus;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function preventPlayerContextMenu(event: PreventableEvent): void {
  event.preventDefault();
}

export function WatchPlayer({
  commentsLayerRef,
  commentsVisible,
  elapsedSeconds,
  isMuted,
  isPaused,
  onToggleFullscreen,
  onToggleMuted,
  onTogglePlayback,
  onUpdatePlayerState,
  onCommentsVisibleChange,
  onQualityChange,
  playbackQualities,
  selectedQualityId,
  stageRef,
  streamMessage,
  streamStatus,
  videoRef,
}: WatchPlayerProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <section
      ref={stageRef}
      className={stageClassName}
      onContextMenu={preventPlayerContextMenu}
      role="application"
    >
      <video
        autoPlay
        className="block h-full w-full bg-[#020202]"
        ref={videoRef}
        muted
        onPause={onUpdatePlayerState}
        onPlay={onUpdatePlayerState}
        onVolumeChange={onUpdatePlayerState}
        onContextMenu={preventPlayerContextMenu}
        playsInline
      />
      <div
        ref={commentsLayerRef}
        className={cn(commentsLayerClassName, !commentsVisible && "hidden")}
      />
      {streamMessage !== "" ? (
        <div className={streamStatusClassName}>{streamMessage}</div>
      ) : null}
      <div className={playerControlsClassName}>
        <div className="flex min-w-0 items-center gap-1">
          <button
            aria-label={isPaused ? "再生" : "一時停止"}
            className={buttonClassName({ square: true })}
            id="play-toggle"
            type="button"
            onClick={onTogglePlayback}
          >
            {isPaused ? (
              <Play aria-hidden="true" size={18} />
            ) : (
              <Pause aria-hidden="true" size={18} />
            )}
          </button>
          <button
            aria-label={isMuted ? "消音中" : "音声"}
            className={buttonClassName({ square: true })}
            id="mute-toggle"
            type="button"
            onClick={onToggleMuted}
          >
            {isMuted ? (
              <VolumeX aria-hidden="true" size={18} />
            ) : (
              <Volume2 aria-hidden="true" size={18} />
            )}
          </button>
          <span className={playTimeClassName}>
            経過時間　{formatElapsedTime(elapsedSeconds)}
          </span>
          {streamStatus === "live" ? (
            <span className={liveBadgeClassName}>●LIVE</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="更新"
            className={buttonClassName({ square: true })}
            id="reload-toggle"
            type="button"
            onClick={() => location.reload()}
          >
            <RefreshCw aria-hidden="true" size={18} />
          </button>
          <button
            aria-label="全画面"
            className={buttonClassName({
              className: "max-[520px]:hidden",
              square: true,
            })}
            id="fullscreen-toggle"
            type="button"
            onClick={onToggleFullscreen}
          >
            <Maximize aria-hidden="true" size={18} />
          </button>
          <div className="relative">
            <PlayerSettingsPopover
              commentsVisible={commentsVisible}
              isOpen={settingsOpen}
              playbackQualities={playbackQualities}
              selectedQualityId={selectedQualityId}
              onCommentsVisibleChange={onCommentsVisibleChange}
              onQualityChange={onQualityChange}
            />
            <button
              aria-expanded={settingsOpen}
              aria-label="設定"
              className={buttonClassName({ square: true })}
              id="settings-toggle"
              type="button"
              onClick={() => setSettingsOpen((current) => !current)}
            >
              <Settings aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
