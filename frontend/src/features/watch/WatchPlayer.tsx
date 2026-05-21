import {
  Maximize,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { RefObject } from "react";
import { buttonClassName } from "../../shared/ui/styles";
import type { RoomStreamStatus } from "../rooms/room_api";
import { formatElapsedTime } from "./room_activity";
import {
  commentsLayerClassName,
  liveBadgeClassName,
  playerControlsClassName,
  playTimeClassName,
  stageClassName,
  streamStatusClassName,
} from "./watchStyles";

type WatchPlayerProps = {
  commentsLayerRef: RefObject<HTMLDivElement | null>;
  elapsedSeconds: number;
  isMuted: boolean;
  isPaused: boolean;
  onToggleFullscreen: () => void;
  onToggleMuted: () => void;
  onTogglePlayback: () => void;
  onUpdatePlayerState: () => void;
  stageRef: RefObject<HTMLElement | null>;
  streamMessage: string;
  streamStatus: RoomStreamStatus;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function WatchPlayer({
  commentsLayerRef,
  elapsedSeconds,
  isMuted,
  isPaused,
  onToggleFullscreen,
  onToggleMuted,
  onTogglePlayback,
  onUpdatePlayerState,
  stageRef,
  streamMessage,
  streamStatus,
  videoRef,
}: WatchPlayerProps) {
  return (
    <>
      <section ref={stageRef} className={stageClassName}>
        <video
          autoPlay
          className="block h-full w-full bg-[#020202]"
          ref={videoRef}
          muted
          onPause={onUpdatePlayerState}
          onPlay={onUpdatePlayerState}
          onVolumeChange={onUpdatePlayerState}
          playsInline
        />
        <div ref={commentsLayerRef} className={commentsLayerClassName} />
        {streamMessage !== "" ? (
          <div className={streamStatusClassName}>{streamMessage}</div>
        ) : null}
      </section>
      <div className={playerControlsClassName}>
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
        <a
          className={buttonClassName({ square: true })}
          href="/admin"
          aria-label="管理"
        >
          <Settings aria-hidden="true" size={18} />
        </a>
      </div>
    </>
  );
}
