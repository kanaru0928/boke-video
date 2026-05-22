import { LoaderCircle, Play } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "../../shared/ui/classNames";
import type { RoomStreamStatus } from "../rooms/room_api";
import { PlayerControls } from "./PlayerControls";
import type { PlaybackQualityOption } from "./stream_quality";
import { usePlayerControlsVisibility } from "./usePlayerControlsVisibility";
import {
  commentsLayerClassName,
  manualPlaybackIconClassName,
  manualPlaybackOverlayClassName,
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
  isFullscreen: boolean;
  isManualPlaybackRequired: boolean;
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
  isFullscreen,
  isManualPlaybackRequired,
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
  const { controlsVisible, hideControls, revealControlsUntilIdle } =
    usePlayerControlsVisibility(stageRef);
  const isPlaybackEnded = streamStatus === "ended";
  const shouldShowLoading = isStreamLoading;
  const shouldHideVideoFrame = isManualPlaybackRequired;
  const shouldShowStreamStatus =
    !shouldShowLoading && !shouldHideVideoFrame && streamMessage !== "";
  const shouldShowPlayerControls = !isPlaybackEnded;
  const shouldEnablePointerControls =
    shouldShowPlayerControls && !shouldHideVideoFrame;

  return (
    <section
      ref={stageRef}
      className={stageClassName}
      onContextMenu={preventPlayerContextMenu}
      onPointerEnter={
        shouldEnablePointerControls ? revealControlsUntilIdle : undefined
      }
      onPointerLeave={shouldEnablePointerControls ? hideControls : undefined}
      onPointerMove={
        shouldEnablePointerControls ? revealControlsUntilIdle : undefined
      }
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
      {shouldHideVideoFrame ? (
        <button
          aria-label="再生"
          className={manualPlaybackOverlayClassName}
          type="button"
          onClick={onTogglePlayback}
        >
          <Play aria-hidden="true" className={manualPlaybackIconClassName} />
        </button>
      ) : null}
      {shouldShowLoading ? (
        <div className={streamLoadingClassName}>
          <div className={streamLoadingPanelClassName}>
            <LoaderCircle
              aria-hidden="true"
              className={streamLoadingIconClassName}
            />
            <span className={streamLoadingTextClassName}>読み込み中</span>
          </div>
        </div>
      ) : shouldShowStreamStatus ? (
        <div className={streamStatusClassName}>{streamMessage}</div>
      ) : null}
      {shouldShowPlayerControls ? (
        <PlayerControls
          commentsVisible={commentsVisible}
          controlsVisible={controlsVisible}
          elapsedSeconds={elapsedSeconds}
          isFullscreen={isFullscreen}
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
      ) : null}
    </section>
  );
}
