import {
  ExternalLink,
  KeyRound,
  MessageSquare,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClassName, formControlClassName } from "../../shared/ui/styles";
import type { CommentMessage } from "../comments/types";
import type { Room } from "../rooms/room_api";

type AdminRoomProps = {
  comments: CommentMessage[] | null;
  onLoadComments: (roomId: string) => Promise<void>;
  onRemoveComment: (roomId: string, commentId: string) => Promise<void>;
  onRemoveRoom: (roomId: string) => Promise<void>;
  onRotateIngestToken: (roomId: string) => Promise<void>;
  onUpdateTitle: (roomId: string, title: string) => Promise<void>;
  room: Room;
  whipBearerToken: string | null;
};

export function AdminRoom({
  comments,
  onLoadComments,
  onRemoveComment,
  onRemoveRoom,
  onRotateIngestToken,
  onUpdateTitle,
  room,
  whipBearerToken,
}: AdminRoomProps) {
  const [title, setTitle] = useState(room.title);
  useEffect(() => {
    setTitle(room.title);
  }, [room.title]);

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
        <p className="m-0 [overflow-wrap:anywhere] font-[Arial,sans-serif] text-xs text-[#666666]">
          {room.id}
        </p>
        {whipBearerToken !== null ? (
          <p className="m-0 [overflow-wrap:anywhere] font-mono text-xs">
            {whipBearerToken}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-[5px] max-[860px]:justify-start">
        <a
          className={buttonClassName()}
          href={`/watch?room=${encodeURIComponent(room.id)}`}
        >
          <ExternalLink aria-hidden="true" size={17} />
          開く
        </a>
        <button
          className={buttonClassName()}
          type="button"
          onClick={() => void onUpdateTitle(room.id, title)}
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
          onClick={() => void onRemoveRoom(room.id)}
        >
          <Trash2 aria-hidden="true" size={18} />
          削除
        </button>
      </div>
      {comments !== null ? (
        <section className="col-span-full grid gap-0 border border-[#c9c9c9]">
          {comments.map((comment) => (
            <article
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-[#e4e4e4] p-[5px] first:border-t-0"
              key={comment.commentId}
            >
              <p className="m-0 [overflow-wrap:anywhere]">{comment.body}</p>
              <button
                className={buttonClassName()}
                type="button"
                onClick={() => void onRemoveComment(room.id, comment.commentId)}
              >
                <Trash2 aria-hidden="true" size={18} />
                削除
              </button>
            </article>
          ))}
        </section>
      ) : null}
    </article>
  );
}
