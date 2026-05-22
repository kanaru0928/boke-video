import { LoaderCircle, Play, Volume2 } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/ui/classNames";
import type { RoomStreamStatus } from "../../rooms/api/room_api";
import { unmuteAutoplayButtonLabel } from "../lib/autoplay_audio";
import type { PlaybackQualityOption } from "../lib/stream_quality";
import { playerStatusMessage } from "../lib/watch_stream";
import { usePlayerControlsVisibility } from "../model/usePlayerControlsVisibility";
import { PlayerControls } from "./PlayerControls";

type PreventableEvent = {
  preventDefault: () => void;
};

type WatchPlayerProps = {
  canToggleFullscreen: boolean;
  canTogglePictureInPicture: boolean;
  commentsLayerRef: RefObject<HTMLDivElement | null>;
  commentsVisible: boolean;
  elapsedSeconds: number;
  isFullscreen: boolean;
  isManualPlaybackRequired: boolean;
  isMuted: boolean;
  isMutedAutoplay: boolean;
  isPaused: boolean;
  isPictureInPicture: boolean;
  isStreamLoading: boolean;
  onToggleFullscreen: () => void;
  onToggleMuted: () => void;
  onTogglePictureInPicture: () => void;
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
  canToggleFullscreen,
  canTogglePictureInPicture,
  commentsLayerRef,
  commentsVisible,
  elapsedSeconds,
  isFullscreen,
  isManualPlaybackRequired,
  isMuted,
  isMutedAutoplay,
  isPaused,
  isPictureInPicture,
  isStreamLoading,
  onToggleFullscreen,
  onToggleMuted,
  onTogglePictureInPicture,
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
      {isMutedAutoplay ? (
        <Button
          className={cn(
            "absolute top-2 right-2 z-30 min-h-8 border-[#7fbdff] px-3 text-xs",
            "max-[520px]:top-1.5 max-[520px]:right-1.5 max-[520px]:min-h-7 max-[520px]:px-2",
          )}
          primary
          onClick={onToggleMuted}
        >
          <Volume2 aria-hidden="true" size={16} />
          {unmuteAutoplayButtonLabel}
        </Button>
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
          canToggleFullscreen={canToggleFullscreen}
          canTogglePictureInPicture={canTogglePictureInPicture}
          controlsVisible={controlsVisible}
          elapsedSeconds={elapsedSeconds}
          isFullscreen={isFullscreen}
          isMuted={isMuted}
          isPaused={isPaused}
          isPictureInPicture={isPictureInPicture}
          playbackQualities={playbackQualities}
          selectedQualityId={selectedQualityId}
          streamStatus={streamStatus}
          onCommentsVisibleChange={onCommentsVisibleChange}
          onQualityChange={onQualityChange}
          onToggleFullscreen={onToggleFullscreen}
          onToggleMuted={onToggleMuted}
          onTogglePictureInPicture={onTogglePictureInPicture}
          onTogglePlayback={onTogglePlayback}
        />
      ) : null}
    </section>
  );
}
