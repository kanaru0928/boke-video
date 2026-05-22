import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { isFullscreenShortcut } from "../lib/fullscreen_shortcuts";
import {
  canEnterElementFullscreen,
  canToggleFullscreen,
  enterVideoFullscreen,
  isVideoFullscreen,
} from "../lib/video_presentation";

type UseFullscreenResult = {
  canToggleFullscreen: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
};

export function useFullscreen(
  stageRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const shouldResumeAfterVideoFullscreenRef = useRef(false);

  const toggleFullscreen = useCallback((): void => {
    if (document.fullscreenElement === null) {
      const stage = stageRef.current;
      if (canEnterElementFullscreen(stage)) {
        void stage.requestFullscreen();
        return;
      }
      shouldResumeAfterVideoFullscreenRef.current =
        videoRef.current?.paused === false;
      enterVideoFullscreen(videoRef.current);
      return;
    }
    void document.exitFullscreen();
  }, [stageRef, videoRef]);

  useEffect(() => {
    const updateFullscreenState = (): void => {
      setIsFullscreen(
        document.fullscreenElement === stageRef.current ||
          isVideoFullscreen(videoRef.current),
      );
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener(
        "webkitfullscreenchange",
        updateFullscreenState,
      );
    };
  }, [stageRef, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    const resumeAfterVideoFullscreen = (): void => {
      setIsFullscreen(false);
      if (!shouldResumeAfterVideoFullscreenRef.current) {
        return;
      }
      window.setTimeout(() => {
        void video.play().catch(() => {});
      }, 500);
    };
    video.addEventListener("webkitendfullscreen", resumeAfterVideoFullscreen);
    return () => {
      video.removeEventListener(
        "webkitendfullscreen",
        resumeAfterVideoFullscreen,
      );
    };
  }, [videoRef]);

  useEffect(() => {
    setCanToggle(canToggleFullscreen(stageRef.current, videoRef.current));
  }, [stageRef, videoRef]);

  useEffect(() => {
    const toggleFullscreenByShortcut = (event: KeyboardEvent): void => {
      if (!isFullscreenShortcut(event)) {
        return;
      }
      event.preventDefault();
      toggleFullscreen();
    };
    document.addEventListener("keydown", toggleFullscreenByShortcut);
    return () => {
      document.removeEventListener("keydown", toggleFullscreenByShortcut);
    };
  }, [toggleFullscreen]);

  return { canToggleFullscreen: canToggle, isFullscreen, toggleFullscreen };
}
