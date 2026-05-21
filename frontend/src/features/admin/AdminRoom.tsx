import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Check,
  Clipboard,
  ExternalLink,
  KeyRound,
  MessageSquare,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonClassName, formControlClassName } from "../../shared/ui/styles";
import { commentAuthorLabel } from "../comments/comment_author";
import type { CommentMessage } from "../comments/types";
import type { Room } from "../rooms/room_api";
import {
  canSaveAdminRoomTitle,
  normalizeAdminRoomTitle,
} from "./admin_room_title";
import { normalizeIngestClipboardValue } from "./copy_ingest_value";

type AdminRoomProps = {
  comments: AdminCommentState | null;
  onLoadComments: (roomId: string) => Promise<void>;
  onLoadOlderComments: (roomId: string) => Promise<void>;
  onRemoveComment: (roomId: string, commentId: string) => Promise<void>;
  onRemoveRoom: (roomId: string) => Promise<void>;
  onRotateIngestToken: (roomId: string) => Promise<void>;
  onUpdateTitle: (roomId: string, title: string) => Promise<void>;
  room: Room;
  serverUrl: string;
  whipBearerToken: string | null;
};

type AdminCommentState = {
  comments: CommentMessage[];
  isLoadingOlder: boolean;
  nextCursor: string | null;
};

export function AdminRoom({
  comments,
  onLoadComments,
  onLoadOlderComments,
  onRemoveComment,
  onRemoveRoom,
  onRotateIngestToken,
  onUpdateTitle,
  room,
  serverUrl,
  whipBearerToken,
}: AdminRoomProps) {
  const [title, setTitle] = useState(room.title);
  const commentListRef = useRef<HTMLDivElement>(null);
  const [copiedTarget, setCopiedTarget] = useState<IngestCopyTarget | null>(
    null,
  );
  const visibleComments = comments?.comments ?? [];
  const commentVirtualizer = useVirtualizer({
    count: visibleComments.length,
    estimateSize: () => 58,
    getScrollElement: () => commentListRef.current,
    overscan: 8,
    paddingStart: comments?.nextCursor === null ? 0 : 38,
  });
  const virtualComments = commentVirtualizer.getVirtualItems();
  useEffect(() => {
    setTitle(room.title);
  }, [room.title]);

  const trimmedTitle = normalizeAdminRoomTitle(title);
  const canSaveTitle = canSaveAdminRoomTitle(title, room.title);

  const copyIngestValue = async (
    target: IngestCopyTarget,
    value: string,
  ): Promise<void> => {
    await navigator.clipboard.writeText(normalizeIngestClipboardValue(value));
    setCopiedTarget(target);
  };

  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border border-[#a7a7a7] bg-white p-[7px] max-[860px]:grid-cols-1">
      <div className="grid min-w-0 gap-[5px]">
        <input
          aria-label="ルーム名"
          className={formControlClassName}
          maxLength={80}
          onChange={(event) => setTitle(event.currentTarget.value)}
          type="text"
          value={title}
        />
        <section
          aria-label="配信枠のOBS入力"
          className="grid select-none gap-[6px] border border-[#c9c9c9] bg-[#f7f7f7] p-[6px]"
        >
          <div className="flex flex-wrap gap-[5px]">
            <IngestCopyButton
              copied={copiedTarget === "serverUrl"}
              label="サーバーURLをコピー"
              onCopy={() => copyIngestValue("serverUrl", serverUrl)}
            />
            <IngestCopyButton
              copied={copiedTarget === "bearerToken"}
              disabled={whipBearerToken === null}
              label="Bearer Tokenをコピー"
              onCopy={() =>
                whipBearerToken === null
                  ? Promise.resolve()
                  : copyIngestValue("bearerToken", whipBearerToken)
              }
            />
          </div>
          {whipBearerToken === null ? (
            <p className="m-0 text-xs text-[#555555]">
              Tokenは作成時または再発行時にコピーできます。
            </p>
          ) : null}
        </section>
      </div>
      <div className="flex flex-wrap justify-end gap-[5px] max-[860px]:justify-start">
        <a
          className={buttonClassName()}
          href={`/watch?room=${encodeURIComponent(room.id)}`}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" size={17} />
          開く
        </a>
        <button
          className={buttonClassName()}
          disabled={!canSaveTitle}
          type="button"
          onClick={() => {
            if (canSaveTitle) {
              void onUpdateTitle(room.id, trimmedTitle);
            }
          }}
        >
          <Save aria-hidden="true" size={18} />
          保存
        </button>
        <button
          className={buttonClassName()}
          type="button"
          onClick={() => void onLoadComments(room.id)}
        >
          <MessageSquare aria-hidden="true" size={18} />
          コメント
        </button>
        <button
          className={buttonClassName()}
          type="button"
          onClick={() => void onRotateIngestToken(room.id)}
        >
          <KeyRound aria-hidden="true" size={18} />
          再発行
        </button>
        <button
          className={buttonClassName()}
          type="button"
          onClick={() => {
            if (window.confirm("この配信枠を削除しますか？")) {
              void onRemoveRoom(room.id);
            }
          }}
        >
          <Trash2 aria-hidden="true" size={18} />
          削除
        </button>
      </div>
      {comments !== null ? (
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
                <button
                  className={buttonClassName({
                    className: "min-h-[28px] text-xs disabled:opacity-60",
                  })}
                  disabled={comments.isLoadingOlder}
                  type="button"
                  onClick={() => void onLoadOlderComments(room.id)}
                >
                  {comments.isLoadingOlder ? "読み込み中" : "過去コメント"}
                </button>
              </div>
            ) : null}
            {virtualComments.map((virtualComment) => {
              const comment = visibleComments[virtualComment.index];
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
                    <p className="m-0 [overflow-wrap:anywhere]">
                      {comment.body}
                    </p>
                  </div>
                  <button
                    className={buttonClassName()}
                    type="button"
                    onClick={() =>
                      void onRemoveComment(room.id, comment.commentId)
                    }
                  >
                    <Trash2 aria-hidden="true" size={18} />
                    削除
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </article>
  );
}

type IngestCopyTarget = "serverUrl" | "bearerToken";

type IngestCopyButtonProps = {
  copied: boolean;
  disabled?: boolean;
  label: string;
  onCopy: () => Promise<void>;
};

function IngestCopyButton({
  copied,
  disabled = false,
  label,
  onCopy,
}: IngestCopyButtonProps) {
  return (
    <button
      className={buttonClassName({
        className:
          "select-none text-sm disabled:cursor-not-allowed disabled:opacity-60",
      })}
      disabled={disabled}
      type="button"
      onClick={() => void onCopy()}
    >
      {copied ? (
        <Check aria-hidden="true" size={17} />
      ) : (
        <Clipboard aria-hidden="true" size={17} />
      )}
      {copied ? "コピー済み" : label}
    </button>
  );
}
