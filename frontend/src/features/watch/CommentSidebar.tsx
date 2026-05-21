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
      <ol className={commentLogClassName} aria-label="コメント">
        {comments.map((comment, index) => (
          <li className={commentLogItemClassName} key={comment.commentId}>
            <span className={commentLogNumberClassName}>
              {commentLogNumber(
                index,
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
                  index === 1 && secondCommentLogBodyClassName,
                )}
              >
                {comment.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
