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
    <aside className="grid min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] border border-[#8c8c8c] bg-white shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#b8b8b8] max-[1040px]:h-[min(420px,calc(100vh-24px))] max-[1040px]:min-h-[280px] max-[520px]:h-[min(360px,calc(100vh-18px))] max-[520px]:min-h-[230px]">
      <div className="grid grid-cols-2 border-b border-[#d2d2d2] bg-white [&_span]:border-l [&_span]:border-[#e2e2e2] [&_span]:px-1 [&_span]:py-[7px] [&_span]:text-center [&_span]:text-xs [&_span]:leading-[1.35] [&_span]:text-[#777777] [&_span:first-child]:border-l-0 max-[520px]:[&_span]:py-[5px]">
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
      <div className="grid grid-cols-1 bg-[#f7f7f7] [&_button]:min-h-[34px] [&_button]:rounded-none [&_button]:border-0 [&_button]:border-r [&_button]:border-b [&_button]:border-[#d2d2d2] [&_button]:bg-[#f7f7f7] [&_button]:font-extrabold [&_button]:shadow-none [&_button:last-child]:border-r-0 max-[520px]:[&_button]:min-h-[29px]">
        <Button className="min-h-[34px] rounded-none border-0 border-b-2 border-b-[#111111] bg-white font-extrabold shadow-none max-[520px]:min-h-[29px]">
          コメント
        </Button>
      </div>
      <div
        className="relative h-[calc(100dvh-250px)] min-h-[260px] overflow-auto bg-white max-[860px]:h-full max-[860px]:min-h-0"
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
          className="relative m-0 list-none p-0"
          style={{ height: `${totalCommentLogHeight}px` }}
        >
          {virtualComments.map((virtualComment) => {
            const comment = comments[virtualComment.index];
            if (comment === undefined) {
              return null;
            }
            return (
              <li
                className="absolute top-0 left-0 grid min-h-[52px] w-full grid-cols-[38px_minmax(0,1fr)] border-b border-[#eeeeee] max-[520px]:min-h-[44px]"
                data-index={virtualComment.index}
                key={comment.commentId}
                ref={commentVirtualizer.measureElement}
                style={{
                  transform: `translateY(${virtualComment.start}px)`,
                }}
              >
                <span className="pt-[9px] text-center text-xs text-[#8d8d8d] max-[520px]:pt-[7px]">
                  {commentLogNumber(
                    virtualComment.index,
                    comments.length,
                    stats?.commentCount ?? comments.length,
                  )}
                </span>
                <div className="grid min-w-0 gap-[2px] px-2 py-[7px] max-[520px]:py-[6px]">
                  <p className="m-0 flex min-w-0 items-center gap-[7px] text-[11px] font-extrabold text-[#777777] [&_span]:min-w-0 [&_span]:truncate [&_time]:shrink-0 [&_time]:font-normal">
                    <span>{commentAuthorLabel(comment.author)}</span>
                    <time dateTime={comment.sentAt}>
                      {formatCommentSentAt(comment.sentAt)}
                    </time>
                  </p>
                  <p
                    className={cn(
                      "m-0 text-[13px] [overflow-wrap:anywhere]",
                      virtualComment.index === 1 &&
                        "font-extrabold text-[#ff4b73]",
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
