import { type RefObject, useEffect, useRef, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import { OvenMediaEnginePlayer } from "../player/oven_media_engine_player";
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
        setStreamMessage(streamStatusMessage(streamStatus));
        return;
      }
      if (streamStatus === "ended") {
        detachStream();
        setPlaybackQualities([]);
        setIsStreamLoading(false);
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
          return;
        }
        setIsStreamLoading(true);
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
        await playerRef.current?.attach(
          videoRef.current,
          quality.playbackUrl,
          () => {
            if (canceled) {
              return;
            }
            detachStream();
            setStreamMessage(streamStatusMessage(streamStatus));
            scheduleReconnect();
          },
        );
        if (canceled) {
          return;
        }
        attachedRoomIdRef.current = roomId;
        attachedQualityIdRef.current = quality.id;
        setIsStreamLoading(false);
        setStreamMessage("");
        return;
      } catch {
        if (canceled) {
          return;
        }
        detachStream();
        setPlaybackQualities([]);
        setIsStreamLoading(false);
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

  return { isStreamLoading, playbackQualities, streamMessage };
}
