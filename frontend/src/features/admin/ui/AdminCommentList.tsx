import { useVirtualizer } from "@tanstack/react-virtual";
import { Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "../../../shared/ui/Button";
import { commentAuthorLabel } from "../../comments/comment_author";
import type { CommentMessage } from "../../comments/types";

type AdminCommentState = {
  comments: CommentMessage[];
  isLoadingOlder: boolean;
  nextCursor: string | null;
};

type AdminCommentListProps = {
  comments: AdminCommentState;
  onLoadOlderComments: (roomId: string) => Promise<void>;
  onRemoveComment: (roomId: string, commentId: string) => Promise<void>;
  roomId: string;
};

export function AdminCommentList({
  comments,
  onLoadOlderComments,
  onRemoveComment,
  roomId,
}: AdminCommentListProps) {
  const commentListRef = useRef<HTMLDivElement>(null);
  const commentVirtualizer = useVirtualizer({
    count: comments.comments.length,
    estimateSize: () => 58,
    getScrollElement: () => commentListRef.current,
    overscan: 8,
    paddingStart: comments.nextCursor === null ? 0 : 38,
  });
  const virtualComments = commentVirtualizer.getVirtualItems();

  return (
    <section
      aria-label="管理コメント"
      className="col-span-full h-[320px] overflow-auto border border-[#c9c9c9] bg-white"
      ref={commentListRef}
    >
      <div
        className="relative w-full"
        style={{ height: `${commentVirtualizer.getTotalSize()}px` }}
      >
        {comments.nextCursor !== null ? (
          <div className="sticky top-0 z-10 grid min-h-[38px] place-items-center border-b border-[#d6d6d6] bg-[#f7f7f7] p-[4px]">
            <Button
              className="min-h-[28px] text-xs disabled:opacity-60"
              disabled={comments.isLoadingOlder}
              onClick={() => void onLoadOlderComments(roomId)}
            >
              {comments.isLoadingOlder ? "読み込み中" : "過去コメント"}
            </Button>
          </div>
        ) : null}
        {virtualComments.map((virtualComment) => {
          const comment = comments.comments[virtualComment.index];
          if (comment === undefined) {
            return null;
          }
          return (
            <article
              className="absolute left-0 top-0 grid min-h-[58px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-[#e4e4e4] p-[5px]"
              data-index={virtualComment.index}
              key={comment.commentId}
              ref={commentVirtualizer.measureElement}
              style={{
                transform: `translateY(${virtualComment.start}px)`,
              }}
            >
              <div className="min-w-0">
                <p className="m-0 truncate text-xs font-extrabold text-[#666666]">
                  {commentAuthorLabel(comment.author)}
                </p>
                <p className="m-0 [overflow-wrap:anywhere]">{comment.body}</p>
              </div>
              <Button
                onClick={() => void onRemoveComment(roomId, comment.commentId)}
              >
                <Trash2 aria-hidden="true" size={18} />
                削除
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
