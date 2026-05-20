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
    <section className="admin-shell">
      <header className="topbar">
        <h1>管理</h1>
        <a className="link-button" href="/">
          <MonitorPlay aria-hidden="true" size={18} />
          視聴画面
        </a>
      </header>
      <form className="admin-form" onSubmit={submitRoom}>
        <input
          maxLength={80}
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder="ルーム名"
          required
          type="text"
          value={title}
        />
        <button type="submit">
          <Plus aria-hidden="true" size={18} />
          作成
        </button>
      </form>
      <section className="admin-list">
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
    <article className="admin-room">
      <input
        aria-label="ルーム名"
        maxLength={80}
        onChange={(event) => setTitle(event.currentTarget.value)}
        type="text"
        value={title}
      />
      <p>{room.id}</p>
      {whipBearerToken !== null ? (
        <p className="admin-token">{whipBearerToken}</p>
      ) : null}
      <a href={`/?room=${encodeURIComponent(room.id)}`}>
        <ExternalLink aria-hidden="true" size={17} />
        開く
      </a>
      <button type="button" onClick={() => void onUpdateTitle(room.id, title)}>
        <Save aria-hidden="true" size={18} />
        保存
      </button>
      <button type="button" onClick={() => void onLoadComments(room.id)}>
        <MessageSquare aria-hidden="true" size={18} />
        コメント
      </button>
      <button type="button" onClick={() => void onRotateIngestToken(room.id)}>
        <KeyRound aria-hidden="true" size={18} />
        再発行
      </button>
      <button type="button" onClick={() => void onRemoveRoom(room.id)}>
        <Trash2 aria-hidden="true" size={18} />
        削除
      </button>
      {comments !== null ? (
        <section className="admin-comments">
          {comments.map((comment) => (
            <article className="admin-comment" key={comment.commentId}>
              <p>{comment.body}</p>
              <button
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
