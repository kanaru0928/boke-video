import { useCallback, useEffect, useRef } from "react";
import type { AppConfig } from "../../shared/config/config";
import { CommentClient } from "../comments/comment_client";
import type { CommentCreateRequest, CommentMessage } from "../comments/types";

type UseCommentSocketResult = {
  sendComment: (request: CommentCreateRequest) => void;
};

export function useCommentSocket(
  config: AppConfig,
  roomId: string,
  onMessage: (message: CommentMessage) => void,
): UseCommentSocketResult {
  const clientRef = useRef<CommentClient | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (roomId === "") {
      return;
    }
    const client = new CommentClient(config, (message) => {
      onMessageRef.current(message);
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
