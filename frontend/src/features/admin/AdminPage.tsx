import { MonitorPlay, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import { AppHeader } from "../../shared/ui/AppHeader";
import { Board } from "../../shared/ui/Board";
import {
  appShellClassName,
  buttonClassName,
  formControlClassName,
} from "../../shared/ui/styles";
import type { CommentMessage } from "../comments/types";
import { deleteComment, fetchComments } from "../rooms/room_api";
import { useAdminRooms } from "../rooms/useAdminRooms";
import { AdminRoom } from "./AdminRoom";

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
