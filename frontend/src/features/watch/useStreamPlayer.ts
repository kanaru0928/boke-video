import { type RefObject, useEffect, useRef, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import { OvenMediaEnginePlayer } from "../player/oven_media_engine_player";
import type { RoomStreamStatus } from "../rooms/room_api";
import { fetchStreamAccess } from "./stream_access_api";
import { streamStatusMessage } from "./watch_stream";

type UseStreamPlayerResult = {
  streamMessage: string;
};

export function useStreamPlayer(
  config: AppConfig,
  roomId: string,
  streamStatus: RoomStreamStatus,
  videoRef: RefObject<HTMLVideoElement | null>,
): UseStreamPlayerResult {
  const playerRef = useRef<OvenMediaEnginePlayer | null>(null);
  const attachedRoomIdRef = useRef("");
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
        setStreamMessage(streamStatusMessage(streamStatus));
        return;
      }
      if (streamStatus === "ended") {
        detachStream();
        setStreamMessage(streamStatusMessage(streamStatus));
        return;
      }
      if (attachedRoomIdRef.current === roomId) {
        return;
      }

      try {
        if (videoRef.current === null) {
          return;
        }
        const streamAccess = await fetchStreamAccess(config, roomId);
        if (streamAccess === null) {
          throw new Error("stream access was not issued");
        }
        await playerRef.current?.attach(
          videoRef.current,
          streamAccess.playbackUrl,
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
        setStreamMessage("");
        return;
      } catch {
        if (canceled) {
          return;
        }
        detachStream();
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
  }, [config, roomId, streamStatus, videoRef]);

  return { streamMessage };
}
