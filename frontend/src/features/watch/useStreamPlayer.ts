import { type RefObject, useEffect, useRef, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import { WebRtcPlayer } from "../player/webrtc_player";
import { buildWhepUrl, streamStatusMessage } from "./watch_stream";

type UseStreamPlayerResult = {
  streamMessage: string;
};

export function useStreamPlayer(
  config: AppConfig,
  roomId: string,
  videoRef: RefObject<HTMLVideoElement | null>,
): UseStreamPlayerResult {
  const playerRef = useRef<WebRtcPlayer | null>(null);
  const attachedRoomIdRef = useRef("");
  const [streamMessage, setStreamMessage] = useState(streamStatusMessage());

  useEffect(() => {
    playerRef.current = new WebRtcPlayer();
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
        setStreamMessage(streamStatusMessage());
        return;
      }
      if (attachedRoomIdRef.current === roomId) {
        return;
      }

      try {
        if (videoRef.current === null) {
          return;
        }
        await playerRef.current?.attach(
          videoRef.current,
          buildWhepUrl(config.streamBaseUrl, roomId),
          () => {
            if (canceled) {
              return;
            }
            detachStream();
            setStreamMessage(streamStatusMessage());
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
        setStreamMessage(streamStatusMessage());
        scheduleReconnect();
      }
    };

    void attachStreamWhenReady();
    return () => {
      canceled = true;
      window.clearTimeout(timerId);
      detachStream();
    };
  }, [config, roomId, videoRef]);

  return { streamMessage };
}
