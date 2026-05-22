import { type RefObject, useEffect, useRef, useState } from "react";
import type { AppConfig } from "../../../shared/config/config";
import {
  OvenMediaEnginePlayer,
  type PlaybackStartResult,
  startVideoPlayback,
} from "../../player/lib/oven_media_engine_player";
import type { RoomStreamStatus } from "../../rooms/api/room_api";
import { fetchStreamAccess } from "../api/stream_access_api";
import {
  downgradedPlaybackQuality,
  type PlaybackQualityOption,
  playbackQualityOptions,
  selectedPlaybackQuality,
} from "../lib/stream_quality";
import { streamStatusMessage } from "../lib/watch_stream";

type UseStreamPlayerResult = {
  dismissMutedAutoplayNotice: () => void;
  isStreamLoading: boolean;
  isManualPlaybackRequired: boolean;
  isMutedAutoplay: boolean;
  playbackQualities: PlaybackQualityOption[];
  streamMessage: string;
};

export function useStreamPlayer(
  config: AppConfig,
  roomId: string,
  streamStatus: RoomStreamStatus,
  videoRef: RefObject<HTMLVideoElement | null>,
  selectedQualityId: string,
  onQualityChange: (qualityId: string) => void,
): UseStreamPlayerResult {
  const playerRef = useRef<OvenMediaEnginePlayer | null>(null);
  const attachedRoomIdRef = useRef("");
  const attachedQualityIdRef = useRef("");
  const [playbackQualities, setPlaybackQualities] = useState<
    PlaybackQualityOption[]
  >([]);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [isManualPlaybackRequired, setIsManualPlaybackRequired] =
    useState(false);
  const [isMutedAutoplay, setIsMutedAutoplay] = useState(false);
  const preferredMutedRef = useRef<boolean | null>(null);
  const dismissMutedAutoplayNotice = (): void => {
    setIsMutedAutoplay(false);
  };
  const [streamMessage, setStreamMessage] = useState(
    streamStatusMessage(streamStatus),
  );

  useEffect(() => {
    playerRef.current = new OvenMediaEnginePlayer();
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    const clearPlaybackMessage = (): void => {
      setIsManualPlaybackRequired(false);
      setStreamMessage("");
    };
    const hideMutedAutoplayNotice = (): void => {
      preferredMutedRef.current = video.muted;
      if (!video.muted) {
        setIsMutedAutoplay(false);
      }
    };
    video.addEventListener("play", clearPlaybackMessage);
    video.addEventListener("volumechange", hideMutedAutoplayNotice);
    return () => {
      video.removeEventListener("play", clearPlaybackMessage);
      video.removeEventListener("volumechange", hideMutedAutoplayNotice);
    };
  }, [videoRef]);

  useEffect(() => {
    const restorePlaybackAfterTabReturn = (): void => {
      const video = videoRef.current;
      if (document.visibilityState !== "visible" || video === null) {
        return;
      }
      if (preferredMutedRef.current === false) {
        video.muted = false;
      }
      if (!video.paused) {
        return;
      }
      void startVideoPlayback(video, { sound: "preserve" }).catch(() => {});
    };
    document.addEventListener("visibilitychange", restorePlaybackAfterTabReturn);
    return () => {
      document.removeEventListener(
        "visibilitychange",
        restorePlaybackAfterTabReturn,
      );
    };
  }, [videoRef]);

  useEffect(() => {
    let canceled = false;
    let timerId = 0;

    const detachStream = (): void => {
      playerRef.current?.destroy();
      attachedRoomIdRef.current = "";
      attachedQualityIdRef.current = "";
      const video = videoRef.current;
      if (video === null) {
        return;
      }
      video.removeAttribute("src");
      video.load();
    };

    const scheduleReconnect = (): void => {
      timerId = window.setTimeout(() => {
        void attachStreamWhenReady();
      }, 1000);
    };

    const attachStreamWhenReady = async (): Promise<void> => {
      if (roomId === "") {
        setPlaybackQualities([]);
        setIsStreamLoading(false);
        setIsManualPlaybackRequired(false);
        setIsMutedAutoplay(false);
        setStreamMessage(streamStatusMessage(streamStatus));
        return;
      }
      if (streamStatus === "ended") {
        detachStream();
        setPlaybackQualities([]);
        setIsStreamLoading(false);
        setIsManualPlaybackRequired(false);
        setIsMutedAutoplay(false);
        setStreamMessage(streamStatusMessage(streamStatus));
        return;
      }
      if (
        attachedRoomIdRef.current === roomId &&
        attachedQualityIdRef.current === selectedQualityId
      ) {
        return;
      }

      try {
        if (videoRef.current === null) {
          setIsStreamLoading(false);
          setIsManualPlaybackRequired(false);
          setIsMutedAutoplay(false);
          return;
        }
        setIsStreamLoading(true);
        setIsManualPlaybackRequired(false);
        setIsMutedAutoplay(false);
        const streamAccess = await fetchStreamAccess(config, roomId);
        if (streamAccess === null) {
          throw new Error("stream access was not issued");
        }
        if (canceled) {
          return;
        }
        const qualityOptions = playbackQualityOptions(
          streamAccess.playbackUrl,
          streamAccess.playbackVariants,
        );
        const quality = selectedPlaybackQuality(
          qualityOptions,
          selectedQualityId,
        );
        setPlaybackQualities(qualityOptions);
        const video = videoRef.current;
        await playerRef.current?.attach(
          video,
          quality.playbackUrl,
          () => {
            if (canceled) {
              return;
            }
            detachStream();
            setStreamMessage(streamStatusMessage(streamStatus));
            scheduleReconnect();
          },
          () => {
            if (canceled) {
              return;
            }
            const downgradedQuality = downgradedPlaybackQuality(
              qualityOptions,
              attachedQualityIdRef.current || quality.id,
            );
            if (downgradedQuality === null) {
              return;
            }
            onQualityChange(downgradedQuality.id);
          },
        );
        if (canceled) {
          return;
        }
        attachedRoomIdRef.current = roomId;
        attachedQualityIdRef.current = quality.id;
        setIsStreamLoading(false);
        setIsManualPlaybackRequired(false);
        setIsMutedAutoplay(false);
        setStreamMessage("");
        void startVideoPlayback(video, {
          allowMutedAutoplay: true,
          sound: "unmute",
        })
          .then((playbackStartResult) => {
            if (canceled) {
              return;
            }
            setIsManualPlaybackRequired(
              playbackStartResult === "manualPlaybackRequired",
            );
            setIsMutedAutoplay(playbackStartResult === "mutedPlaying");
            setStreamMessage(playbackStartMessage(playbackStartResult));
          })
          .catch(() => {
            if (canceled) {
              return;
            }
            detachStream();
            setIsManualPlaybackRequired(false);
            setIsMutedAutoplay(false);
            setStreamMessage(streamStatusMessage(streamStatus));
            scheduleReconnect();
          });
        return;
      } catch {
        if (canceled) {
          return;
        }
        detachStream();
        setPlaybackQualities([]);
        setIsStreamLoading(false);
        setIsManualPlaybackRequired(false);
        setIsMutedAutoplay(false);
        setStreamMessage(streamStatusMessage(streamStatus));
        scheduleReconnect();
      }
    };

    void attachStreamWhenReady();
    return () => {
      canceled = true;
      window.clearTimeout(timerId);
      detachStream();
    };
  }, [
    config,
    onQualityChange,
    roomId,
    selectedQualityId,
    streamStatus,
    videoRef,
  ]);

  return {
    dismissMutedAutoplayNotice,
    isManualPlaybackRequired,
    isMutedAutoplay,
    isStreamLoading,
    playbackQualities,
    streamMessage,
  };
}

function playbackStartMessage(
  playbackStartResult: PlaybackStartResult | undefined,
): string {
  if (playbackStartResult === "manualPlaybackRequired") {
    return "画面に触れてください";
  }
  return "";
}
