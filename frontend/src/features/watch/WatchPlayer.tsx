import { LoaderCircle, Play } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "../../shared/ui/classNames";
import type { RoomStreamStatus } from "../rooms/room_api";
import { PlayerControls } from "./PlayerControls";
import type { PlaybackQualityOption } from "./stream_quality";
import { usePlayerControlsVisibility } from "./usePlayerControlsVisibility";
import { playerStatusMessage } from "./watch_stream";

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

export const stageClassName = cn(
  "group relative aspect-video w-full overflow-hidden border border-black bg-[#020202] leading-none",
  "bg-[repeating-linear-gradient(0deg,rgb(255_255_255_/_3%)_0,rgb(255_255_255_/_3%)_1px,transparent_1px,transparent_3px)]",
  "[&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:aspect-auto [&:fullscreen_video]:object-contain",
);

export const videoElementClassName =
  "block aspect-video h-full w-full bg-[#020202] object-cover";

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
  const displayStreamMessage = playerStatusMessage(streamStatus, streamMessage);
  const shouldShowLoading = isStreamLoading;
  const shouldHideVideoFrame = isManualPlaybackRequired;
  const shouldShowStreamStatus =
    !shouldShowLoading && !shouldHideVideoFrame && displayStreamMessage !== "";
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
        className={cn(
          "pointer-events-none absolute inset-0 z-10 overflow-hidden",
          !commentsVisible && "hidden",
        )}
      />
      {shouldHideVideoFrame ? (
        <button
          aria-label="再生"
          className={cn(
            "pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-[#020202]",
            "border-0 p-0 text-white",
          )}
          type="button"
          onClick={onTogglePlayback}
        >
          <Play
            aria-hidden="true"
            className={cn(
              "size-20 rounded-full border-2 border-white bg-[rgb(0_0_0_/_42%)] p-4 text-white",
              "shadow-[0_0_0_1px_rgb(0_0_0_/_65%),0_2px_14px_rgb(0_0_0_/_75%)] max-[520px]:size-16 max-[520px]:p-3",
            )}
          />
        </button>
      ) : null}
      {shouldShowLoading ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-20 grid place-items-center p-5 text-center text-white",
            "[text-shadow:2px_2px_0_#000000,-1px_-1px_0_#000000]",
          )}
        >
          <div
            className={cn(
              "grid place-items-center gap-2 rounded-sm border border-[#6d6d6d] bg-[rgb(0_0_0_/_72%)] px-5 py-4",
              "shadow-[2px_2px_0_rgb(0_0_0_/_65%),inset_1px_1px_0_rgb(255_255_255_/_18%)]",
            )}
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-9 animate-spin text-[#4ab8ff] max-[520px]:size-8"
            />
            <span className="text-sm leading-none font-extrabold">
              読み込み中
            </span>
          </div>
        </div>
      ) : shouldShowStreamStatus ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-20 grid place-items-center p-5 text-center text-[28px] font-extrabold text-white",
            "[text-shadow:2px_2px_0_#000000,-1px_-1px_0_#000000] max-[520px]:text-[23px]",
          )}
        >
          {displayStreamMessage}
        </div>
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
