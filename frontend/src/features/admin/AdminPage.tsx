import {
  ExternalLink,
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
import { useRooms } from "../rooms/useRooms";
import { useRoomStreamStatus } from "./useRoomStreamStatus";

type AdminPageProps = {
  config: AppConfig;
};

type CommentMap = Record<string, CommentMessage[]>;

export function AdminPage({ config }: AdminPageProps) {
  const [title, setTitle] = useState("");
  const [commentsByRoomId, setCommentsByRoomId] = useState<CommentMap>({});
  const { createRoomFromTitle, rooms, updateRoomTitleById } = useRooms(config);

  const submitRoom = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (title.trim() === "") {
      return;
    }
    await createRoomFromTitle(title);
    setTitle("");
  };

  const loadComments = async (roomId: string): Promise<void> => {
    const comments = await fetchComments(config, roomId);
    setCommentsByRoomId((current) => ({ ...current, [roomId]: comments }));
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
            config={config}
            key={room.id}
            onLoadComments={loadComments}
            onRemoveComment={removeComment}
            onUpdateTitle={updateRoomTitleById}
            room={room}
          />
        ))}
      </section>
    </section>
  );
}

type AdminRoomProps = {
  comments: CommentMessage[] | null;
  config: AppConfig;
  onLoadComments: (roomId: string) => Promise<void>;
  onRemoveComment: (roomId: string, commentId: string) => Promise<void>;
  onUpdateTitle: (roomId: string, title: string) => Promise<void>;
  room: Room;
};

function AdminRoom({
  comments,
  config,
  onLoadComments,
  onRemoveComment,
  onUpdateTitle,
  room,
}: AdminRoomProps) {
  const [title, setTitle] = useState(room.title);
  const streamStatus = useRoomStreamStatus(config, room.id);

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
      <p className="admin-status">配信状態: {streamStatus}</p>
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
