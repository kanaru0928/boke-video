import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Button } from "../../shared/ui/Button";
import { cn } from "../../shared/ui/classNames";
import { commentAuthorLabel } from "../comments/comment_author";
import type { CommentMessage } from "../comments/types";
import type { RoomStats } from "../rooms/room_api";
import { commentLogNumber, formatElapsedTime } from "./room_activity";
import {
  activeTabButtonClassName,
  commentLogBodyClassName,
  commentLogClassName,
  commentLogContentClassName,
  commentLogItemClassName,
  commentLogMetaClassName,
  commentLogNumberClassName,
  counterStripClassName,
  secondCommentLogBodyClassName,
  sidePanelClassName,
  tabRowClassName,
} from "./watchStyles";

type CommentSidebarProps = {
  comments: CommentMessage[];
  elapsedSeconds: number;
  hasOlderComments: boolean;
  isLoadingOlderComments: boolean;
  onLoadOlderComments: () => Promise<void>;
  stats: RoomStats | null;
};

export function CommentSidebar({
  comments,
  elapsedSeconds,
  hasOlderComments,
  isLoadingOlderComments,
  onLoadOlderComments,
  stats,
}: CommentSidebarProps) {
  const commentLogRef = useRef<HTMLOListElement>(null);
  const commentVirtualizer = useVirtualizer({
    count: comments.length,
    estimateSize: () => 52,
    getScrollElement: () => commentLogRef.current,
    overscan: 8,
    paddingStart: hasOlderComments ? 34 : 0,
  });
  const virtualComments = commentVirtualizer.getVirtualItems();

  return (
    <aside className={sidePanelClassName}>
      <div className={counterStripClassName}>
        <span>
          来場者
          <br />
          {stats?.visitorCount ?? 0}
        </span>
        <span>
          コメント
          <br />
          {stats?.commentCount ?? comments.length}
        </span>
        <span>
          経過
          <br />
          {formatElapsedTime(elapsedSeconds)}
        </span>
      </div>
      <div className={tabRowClassName}>
        <Button className={activeTabButtonClassName}>コメント</Button>
      </div>
      <ol
        className={commentLogClassName}
        ref={commentLogRef}
        aria-label="コメント"
      >
        {hasOlderComments ? (
          <li className="sticky top-0 z-10 grid min-h-[34px] place-items-center border-b border-[#d6d6d6] bg-[#f7f7f7] p-[3px]">
            <Button
              className="min-h-[26px] px-3 text-xs font-extrabold disabled:opacity-60"
              disabled={isLoadingOlderComments}
              onClick={() => void onLoadOlderComments()}
            >
              {isLoadingOlderComments ? "読み込み中" : "過去コメント"}
            </Button>
          </li>
        ) : null}
        <li
          aria-hidden="true"
          className="pointer-events-none block p-0"
          style={{ height: `${commentVirtualizer.getTotalSize()}px` }}
        />
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
                  {commentAuthorLabel(comment.author)}
                </p>
                <p
                  className={cn(
                    commentLogBodyClassName,
                    virtualComment.index === 1 && secondCommentLogBodyClassName,
                  )}
                >
                  {comment.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
