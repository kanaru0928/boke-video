import {
  ExternalLink,
  KeyRound,
  MessageSquare,
  MonitorPlay,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import { AppHeader } from "../../shared/ui/AppHeader";
import { Board } from "../../shared/ui/Board";
import {
  appShellClassName,
  buttonClassName,
  formControlClassName,
} from "../../shared/ui/styles";
import type { CommentMessage } from "../comments/types";
import { deleteComment, fetchComments, type Room } from "../rooms/room_api";
import { useAdminRooms } from "../rooms/useAdminRooms";

type AdminPageProps = {
  config: AppConfig;
};

type CommentMap = Record<string, CommentMessage[]>;

export function AdminPage({ config }: AdminPageProps) {
  const [title, setTitle] = useState("");
  const [commentsByRoomId, setCommentsByRoomId] = useState<CommentMap>({});
  const [whipTokensByRoomId, setWhipTokensByRoomId] = useState<
    Record<string, string>
  >({});
  const {
    createRoomFromTitle,
    deleteRoomById,
    rooms,
    rotateIngestTokenByRoomId,
    updateRoomTitleById,
  } = useAdminRooms(config);

  const submitRoom = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (title.trim() === "") {
      return;
    }
    const room = await createRoomFromTitle(title);
    if (room !== null) {
      setWhipTokensByRoomId((current) => ({
        ...current,
        [room.id]: room.whipBearerToken,
      }));
    }
    setTitle("");
  };

  const loadComments = async (roomId: string): Promise<void> => {
    const comments = await fetchComments(config, roomId);
    setCommentsByRoomId((current) => ({ ...current, [roomId]: comments }));
  };

  const removeRoom = async (roomId: string): Promise<void> => {
    if (!(await deleteRoomById(roomId))) {
      return;
    }
    setCommentsByRoomId((current) => {
      const next = { ...current };
      delete next[roomId];
      return next;
    });
    setWhipTokensByRoomId((current) => {
      const next = { ...current };
      delete next[roomId];
      return next;
    });
  };

  const removeComment = async (
    roomId: string,
    commentId: string,
  ): Promise<void> => {
    if (!(await deleteComment(config, commentId))) {
      return;
    }
    setCommentsByRoomId((current) => ({
      ...current,
      [roomId]: (current[roomId] ?? []).filter(
        (comment) => comment.commentId !== commentId,
      ),
    }));
  };

  const rotateIngestToken = async (roomId: string): Promise<void> => {
    const token = await rotateIngestTokenByRoomId(roomId);
    if (token === null) {
      return;
    }
    setWhipTokensByRoomId((current) => ({
      ...current,
      [roomId]: token,
    }));
  };

  return (
    <section className={appShellClassName}>
      <AppHeader section="ADMIN" links={[{ href: "/", label: "枠一覧" }]} />
      <Board icon={MonitorPlay} title="番組管理">
        <form
          className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-[5px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2"
          onSubmit={submitRoom}
        >
          <input
            className={formControlClassName}
            maxLength={80}
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="ルーム名"
            required
            type="text"
            value={title}
          />
          <button className={buttonClassName()} type="submit">
            <Plus aria-hidden="true" size={18} />
            作成
          </button>
        </form>
        <section className="grid gap-1.5">
          {rooms.map((room) => (
            <AdminRoom
              comments={commentsByRoomId[room.id] ?? null}
              key={room.id}
              onLoadComments={loadComments}
              onRemoveComment={removeComment}
              onRemoveRoom={removeRoom}
              onRotateIngestToken={rotateIngestToken}
              onUpdateTitle={updateRoomTitleById}
              room={room}
              whipBearerToken={whipTokensByRoomId[room.id] ?? null}
            />
          ))}
        </section>
      </Board>
    </section>
  );
}

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

function AdminRoom({
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
