import { type RefObject, useEffect, useRef, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import { DashPlayer } from "../player/dash_player";
import { fetchRoomStreamStatus } from "../rooms/room_api";
import { canPlayStream, streamStatusMessage } from "./watch_stream";

type UseStreamPlayerResult = {
  streamMessage: string;
};

export function useStreamPlayer(
  config: AppConfig,
  roomId: string,
  videoRef: RefObject<HTMLVideoElement | null>,
): UseStreamPlayerResult {
  const playerRef = useRef<DashPlayer | null>(null);
  const attachedRoomIdRef = useRef("");
  const [streamMessage, setStreamMessage] = useState(
    streamStatusMessage("unknown"),
  );

  useEffect(() => {
    playerRef.current = new DashPlayer();
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

    const attachStreamWhenReady = async (): Promise<void> => {
      if (roomId === "") {
        setStreamMessage(streamStatusMessage("unknown"));
        return;
      }
      const status = await fetchRoomStreamStatus(config, roomId);
      if (canceled) {
        return;
      }
      if (canPlayStream(status)) {
        setStreamMessage("");
        if (attachedRoomIdRef.current !== roomId && videoRef.current !== null) {
          const manifestUrl = `${config.streamBaseUrl}/live/${encodeURIComponent(roomId)}/manifest.mpd`;
          playerRef.current?.attach(videoRef.current, manifestUrl);
          attachedRoomIdRef.current = roomId;
        }
        return;
      }

      detachStream();
      setStreamMessage(streamStatusMessage(status?.stream ?? "unknown"));
      timerId = window.setTimeout(() => {
        void attachStreamWhenReady();
      }, 1000);
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
