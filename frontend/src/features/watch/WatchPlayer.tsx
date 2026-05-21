import { LoaderCircle } from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

export const playerControlsIdleDelayMs = 2400;

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
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsIdleTimerRef = useRef<number | null>(null);

  const revealControlsUntilIdle = useCallback((): void => {
    setControlsVisible(true);
    clearControlsIdleTimer(controlsIdleTimerRef);
    controlsIdleTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
      controlsIdleTimerRef.current = null;
    }, playerControlsIdleDelayMs);
  }, []);

  const hideControls = useCallback((): void => {
    clearControlsIdleTimer(controlsIdleTimerRef);
    setControlsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      clearControlsIdleTimer(controlsIdleTimerRef);
    };
  }, []);

  useEffect(() => {
    const syncFullscreenControls = (): void => {
      if (document.fullscreenElement === stageRef.current) {
        revealControlsUntilIdle();
        return;
      }
      hideControls();
    };
    document.addEventListener("fullscreenchange", syncFullscreenControls);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenControls);
    };
  }, [hideControls, revealControlsUntilIdle, stageRef]);

  return (
    <section
      ref={stageRef}
      className={stageClassName}
      onContextMenu={preventPlayerContextMenu}
      onPointerEnter={revealControlsUntilIdle}
      onPointerLeave={hideControls}
      onPointerMove={revealControlsUntilIdle}
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
        controlsVisible={controlsVisible}
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

function clearControlsIdleTimer(timerRef: RefObject<number | null>): void {
  if (timerRef.current === null) {
    return;
  }
  window.clearTimeout(timerRef.current);
  timerRef.current = null;
}
