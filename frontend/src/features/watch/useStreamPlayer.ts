import { type RefObject, useEffect, useRef, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import {
  OvenMediaEnginePlayer,
  type PlaybackStartResult,
  startVideoPlayback,
} from "../player/oven_media_engine_player";
import type { RoomStreamStatus } from "../rooms/room_api";
import { fetchStreamAccess } from "./stream_access_api";
import {
  type PlaybackQualityOption,
  playbackQualityOptions,
  selectedPlaybackQuality,
} from "./stream_quality";
import { streamStatusMessage } from "./watch_stream";

type UseStreamPlayerResult = {
  isStreamLoading: boolean;
  isManualPlaybackRequired: boolean;
  playbackQualities: PlaybackQualityOption[];
  streamMessage: string;
};

export function useStreamPlayer(
  config: AppConfig,
  roomId: string,
  streamStatus: RoomStreamStatus,
  videoRef: RefObject<HTMLVideoElement | null>,
  selectedQualityId: string,
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
    video.addEventListener("play", clearPlaybackMessage);
    return () => {
      video.removeEventListener("play", clearPlaybackMessage);
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
        setStreamMessage(streamStatusMessage(streamStatus));
        return;
      }
      if (streamStatus === "ended") {
        detachStream();
        setPlaybackQualities([]);
        setIsStreamLoading(false);
        setIsManualPlaybackRequired(false);
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
          return;
        }
        setIsStreamLoading(true);
        setIsManualPlaybackRequired(false);
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
        await playerRef.current?.attach(video, quality.playbackUrl, () => {
          if (canceled) {
            return;
          }
          detachStream();
          setStreamMessage(streamStatusMessage(streamStatus));
          scheduleReconnect();
        });
        if (canceled) {
          return;
        }
        attachedRoomIdRef.current = roomId;
        attachedQualityIdRef.current = quality.id;
        setIsStreamLoading(false);
        setIsManualPlaybackRequired(false);
        setStreamMessage("");
        void startVideoPlayback(video, { mutedFallback: true })
          .then((playbackStartResult) => {
            if (canceled) {
              return;
            }
            setIsManualPlaybackRequired(
              playbackStartResult === "manualPlaybackRequired",
            );
            setStreamMessage(playbackStartMessage(playbackStartResult));
          })
          .catch(() => {
            if (canceled) {
              return;
            }
            detachStream();
            setIsManualPlaybackRequired(false);
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
  }, [config, roomId, selectedQualityId, streamStatus, videoRef]);

  return {
    isManualPlaybackRequired,
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
