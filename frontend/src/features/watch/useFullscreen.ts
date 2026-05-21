import { type RefObject, useCallback, useEffect, useState } from "react";
import { isFullscreenShortcut } from "./fullscreen_shortcuts";

type UseFullscreenResult = {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
};

export function useFullscreen(
  stageRef: RefObject<HTMLElement | null>,
): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback((): void => {
    if (document.fullscreenElement === null) {
      void stageRef.current?.requestFullscreen();
      return;
    }
    void document.exitFullscreen();
  }, [stageRef]);

  useEffect(() => {
    const updateFullscreenState = (): void => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
    };
  }, [stageRef]);

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

  return { isFullscreen, toggleFullscreen };
}
