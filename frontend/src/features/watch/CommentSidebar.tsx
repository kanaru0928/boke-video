import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
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
  stats: RoomStats | null;
};

export function CommentSidebar({
  comments,
  elapsedSeconds,
  stats,
}: CommentSidebarProps) {
  const commentLogRef = useRef<HTMLOListElement>(null);
  const commentVirtualizer = useVirtualizer({
    count: comments.length,
    estimateSize: () => 52,
    getScrollElement: () => commentLogRef.current,
    overscan: 8,
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
        <button type="button" className={activeTabButtonClassName}>
          コメント
        </button>
      </div>
      <ol
        className={commentLogClassName}
        ref={commentLogRef}
        aria-label="コメント"
      >
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
