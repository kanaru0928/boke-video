import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export const playerControlsIdleDelayMs = 2400;

type UsePlayerControlsVisibilityResult = {
  controlsVisible: boolean;
  hideControls: () => void;
  revealControlsUntilIdle: () => void;
};

export function usePlayerControlsVisibility(
  stageRef: RefObject<HTMLElement | null>,
): UsePlayerControlsVisibilityResult {
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

  return { controlsVisible, hideControls, revealControlsUntilIdle };
}

function clearControlsIdleTimer(timerRef: RefObject<number | null>): void {
  if (timerRef.current === null) {
    return;
  }
  window.clearTimeout(timerRef.current);
  timerRef.current = null;
}
