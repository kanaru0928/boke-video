import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef } from "react";
import { Button } from "../../shared/ui/Button";
import { cn } from "../../shared/ui/classNames";
import { commentAuthorLabel } from "../comments/comment_author";
import type { CommentMessage } from "../comments/types";
import type { RoomStats } from "../rooms/room_api";
import {
  commentLogNumber,
  formatCommentSentAt,
  isCommentLogScrolledToBottom,
} from "./room_activity";
import {
  activeTabButtonClassName,
  commentLogBodyClassName,
  commentLogClassName,
  commentLogContentClassName,
  commentLogItemClassName,
  commentLogMetaClassName,
  commentLogNumberClassName,
  commentLogVirtualListClassName,
  counterStripClassName,
  secondCommentLogBodyClassName,
  sidePanelClassName,
  tabRowClassName,
} from "./watchStyles";

type CommentSidebarProps = {
  comments: CommentMessage[];
  hasOlderComments: boolean;
  isLoadingOlderComments: boolean;
  onLoadOlderComments: () => Promise<void>;
  stats: RoomStats | null;
};

export function CommentSidebar({
  comments,
  hasOlderComments,
  isLoadingOlderComments,
  onLoadOlderComments,
  stats,
}: CommentSidebarProps) {
  const commentLogRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const lastCommentIdRef = useRef<string | null>(null);
  const commentVirtualizer = useVirtualizer({
    count: comments.length,
    estimateSize: () => 52,
    getScrollElement: () => commentLogRef.current,
    overscan: 8,
    paddingStart: hasOlderComments ? 34 : 0,
  });
  const totalCommentLogHeight = commentVirtualizer.getTotalSize();
  const virtualComments = commentVirtualizer.getVirtualItems();

  useLayoutEffect(() => {
    const lastCommentId = comments.at(-1)?.commentId ?? null;
    if (lastCommentId === null) {
      shouldStickToBottomRef.current = true;
      lastCommentIdRef.current = null;
      return;
    }
    const isInitialCommentList = lastCommentIdRef.current === null;
    lastCommentIdRef.current = lastCommentId;
    if (!shouldStickToBottomRef.current && !isInitialCommentList) {
      return;
    }
    scrollCommentLogToBottom(commentLogRef.current);
    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      scrollCommentLogToBottom(commentLogRef.current);
      secondFrameId = window.requestAnimationFrame(() => {
        scrollCommentLogToBottom(commentLogRef.current);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
    };
  }, [comments]);

  const updateStickToBottom = (): void => {
    const commentLog = commentLogRef.current;
    if (commentLog === null) {
      return;
    }
    shouldStickToBottomRef.current = isCommentLogScrolledToBottom(
      commentLog.scrollTop,
      commentLog.clientHeight,
      commentLog.scrollHeight,
    );
  };

  return (
    <aside className={sidePanelClassName}>
      <div className={counterStripClassName}>
        <span>
          人数
          <br />
          {stats !== null
            ? `現在: ${stats.currentViewerCount} / 最大: ${stats.maxConcurrentViewerCount}`
            : "現在: 0 / 最大: 0"}
        </span>
        <span>
          コメント
          <br />
          {stats?.commentCount ?? comments.length}
        </span>
      </div>
      <div className={tabRowClassName}>
        <Button className={activeTabButtonClassName}>コメント</Button>
      </div>
      <div
        className={commentLogClassName}
        onScroll={updateStickToBottom}
        ref={commentLogRef}
      >
        {hasOlderComments ? (
          <div className="sticky top-0 z-10 grid min-h-[34px] place-items-center border-b border-[#d6d6d6] bg-[#f7f7f7] p-[3px]">
            <Button
              className="min-h-[26px] px-3 text-xs font-extrabold disabled:opacity-60"
              disabled={isLoadingOlderComments}
              onClick={() => void onLoadOlderComments()}
            >
              {isLoadingOlderComments ? "読み込み中" : "過去コメント"}
            </Button>
          </div>
        ) : null}
        <ol
          aria-label="コメント"
          className={commentLogVirtualListClassName}
          style={{ height: `${totalCommentLogHeight}px` }}
        >
          {virtualComments.map((virtualComment) => {
            const comment = comments[virtualComment.index];
            if (comment === undefined) {
              return null;
            }
            return (
              <li
                className={commentLogItemClassName}
                data-index={virtualComment.index}
                key={comment.commentId}
                ref={commentVirtualizer.measureElement}
                style={{
                  transform: `translateY(${virtualComment.start}px)`,
                }}
              >
                <span className={commentLogNumberClassName}>
                  {commentLogNumber(
                    virtualComment.index,
                    comments.length,
                    stats?.commentCount ?? comments.length,
                  )}
                </span>
                <div className={commentLogContentClassName}>
                  <p className={commentLogMetaClassName}>
                    <span>{commentAuthorLabel(comment.author)}</span>
                    <time dateTime={comment.sentAt}>
                      {formatCommentSentAt(comment.sentAt)}
                    </time>
                  </p>
                  <p
                    className={cn(
                      commentLogBodyClassName,
                      virtualComment.index === 1 &&
                        secondCommentLogBodyClassName,
                    )}
                  >
                    {comment.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

function scrollCommentLogToBottom(commentLog: HTMLDivElement | null): void {
  if (commentLog === null) {
    return;
  }
  commentLog.scrollTop = commentLog.scrollHeight;
}
