import { type RefObject, useCallback, useEffect, useRef } from "react";
import { CommentRenderer } from "../comments/comment_renderer";
import type { CommentMessage } from "../comments/types";

type UseCommentRendererResult = {
  clearComments: () => void;
  commentsLayerRef: RefObject<HTMLDivElement | null>;
  renderComment: (message: CommentMessage) => void;
};

export function useCommentRenderer(): UseCommentRendererResult {
  const commentsLayerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CommentRenderer | null>(null);

  useEffect(() => {
    if (commentsLayerRef.current === null) {
      return;
    }
    rendererRef.current = new CommentRenderer(commentsLayerRef.current);
    return () => {
      rendererRef.current?.clear();
      rendererRef.current = null;
    };
  }, []);

  const renderComment = useCallback((message: CommentMessage): void => {
    rendererRef.current?.render(message);
  }, []);

  const clearComments = useCallback((): void => {
    rendererRef.current?.clear();
  }, []);

  return { clearComments, commentsLayerRef, renderComment };
}
