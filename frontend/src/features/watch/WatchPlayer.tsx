import { LoaderCircle } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "../../shared/ui/classNames";
import type { RoomStreamStatus } from "../rooms/room_api";
import { PlayerControls } from "./PlayerControls";
import type { PlaybackQualityOption } from "./stream_quality";
import {
  commentsLayerClassName,
  stageClassName,
  streamLoadingClassName,
  streamLoadingIconClassName,
  streamLoadingPanelClassName,
  streamLoadingTextClassName,
  streamStatusClassName,
  videoElementClassName,
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
  isStreamLoading: boolean;
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
  isStreamLoading,
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
  return (
    <section
      ref={stageRef}
      className={stageClassName}
      onContextMenu={preventPlayerContextMenu}
      role="application"
    >
      <video
        autoPlay
        className={videoElementClassName}
        ref={videoRef}
        muted={isMuted}
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
      {isStreamLoading ? (
        <div className={streamLoadingClassName}>
          <div className={streamLoadingPanelClassName}>
            <LoaderCircle
              aria-hidden="true"
              className={streamLoadingIconClassName}
            />
            <span className={streamLoadingTextClassName}>読み込み中</span>
          </div>
        </div>
      ) : streamMessage !== "" ? (
        <div className={streamStatusClassName}>{streamMessage}</div>
      ) : null}
      <PlayerControls
        commentsVisible={commentsVisible}
        elapsedSeconds={elapsedSeconds}
        isMuted={isMuted}
        isPaused={isPaused}
        playbackQualities={playbackQualities}
        selectedQualityId={selectedQualityId}
        streamStatus={streamStatus}
        onCommentsVisibleChange={onCommentsVisibleChange}
        onQualityChange={onQualityChange}
        onToggleFullscreen={onToggleFullscreen}
        onToggleMuted={onToggleMuted}
        onTogglePlayback={onTogglePlayback}
      />
    </section>
  );
}
