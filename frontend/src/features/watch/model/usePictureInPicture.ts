import { type RefObject, useCallback, useEffect, useState } from "react";
import {
  canTogglePictureInPicture,
  enterPictureInPicture,
  isPictureInPictureActive,
  toggleWebKitPictureInPicture,
} from "../lib/video_presentation";

type UsePictureInPictureResult = {
  canTogglePictureInPicture: boolean;
  isPictureInPicture: boolean;
  togglePictureInPicture: () => void;
};

export function usePictureInPicture(
  videoRef: RefObject<HTMLVideoElement | null>,
): UsePictureInPictureResult {
  const [canToggle, setCanToggle] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);

  const syncPictureInPictureState = useCallback((): void => {
    setCanToggle(canTogglePictureInPicture(document, videoRef.current));
    setIsPictureInPicture(isPictureInPictureActive(document, videoRef.current));
  }, [videoRef]);

  const togglePictureInPicture = useCallback((): void => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    if (canTogglePictureInPicture(document, video)) {
      if (document.pictureInPictureElement === video) {
        void document.exitPictureInPicture();
        return;
      }
      if (typeof video.requestPictureInPicture === "function") {
        void video.requestPictureInPicture();
        return;
      }
      toggleWebKitPictureInPicture(video);
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    syncPictureInPictureState();
    video?.addEventListener("loadedmetadata", syncPictureInPictureState);
    video?.addEventListener("enterpictureinpicture", syncPictureInPictureState);
    video?.addEventListener("leavepictureinpicture", syncPictureInPictureState);
    video?.addEventListener(
      "webkitpresentationmodechanged",
      syncPictureInPictureState,
    );
    return () => {
      video?.removeEventListener("loadedmetadata", syncPictureInPictureState);
      video?.removeEventListener(
        "enterpictureinpicture",
        syncPictureInPictureState,
      );
      video?.removeEventListener(
        "leavepictureinpicture",
        syncPictureInPictureState,
      );
      video?.removeEventListener(
        "webkitpresentationmodechanged",
        syncPictureInPictureState,
      );
    };
  }, [syncPictureInPictureState, videoRef]);

  useEffect(() => {
    const enterPictureInPictureWhenHidden = (): void => {
      const video = videoRef.current;
      if (document.visibilityState !== "hidden" || video === null) {
        return;
      }
      if (video.paused || video.ended) {
        return;
      }
      void enterPictureInPicture(document, video).catch(() => {});
    };
    document.addEventListener(
      "visibilitychange",
      enterPictureInPictureWhenHidden,
    );
    return () => {
      document.removeEventListener(
        "visibilitychange",
        enterPictureInPictureWhenHidden,
      );
    };
  }, [videoRef]);

  return {
    canTogglePictureInPicture: canToggle,
    isPictureInPicture,
    togglePictureInPicture,
  };
}
