import { useCallback, useEffect, useRef } from "react";
import type { AppConfig } from "../../../shared/config/config";
import { CommentClient } from "../../comments/api/comment_client";
import type {
  CommentCreateRequest,
  CommentMessage,
  PresenceMessage,
} from "../../comments/model/types";

type UseCommentSocketResult = {
  sendComment: (request: CommentCreateRequest) => void;
};

export function useCommentSocket(
  config: AppConfig,
  roomId: string,
  onMessage: (message: CommentMessage) => void,
  onPresence: (message: PresenceMessage) => void,
): UseCommentSocketResult {
  const clientRef = useRef<CommentClient | null>(null);
  const onMessageRef = useRef(onMessage);
  const onPresenceRef = useRef(onPresence);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onPresenceRef.current = onPresence;
  }, [onPresence]);

  useEffect(() => {
    if (roomId === "") {
      return;
    }
    const client = new CommentClient(config, (message) => {
      if (message.type === "comment") {
        onMessageRef.current(message);
        return;
      }
      onPresenceRef.current(message);
    });
    clientRef.current = client;
    client.connect(roomId);
    return () => {
      client.disconnect();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [config, roomId]);

  const sendComment = useCallback((request: CommentCreateRequest): void => {
    clientRef.current?.send(request);
  }, []);

  return { sendComment };
}
