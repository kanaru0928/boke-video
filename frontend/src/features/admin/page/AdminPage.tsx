import { MonitorPlay, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { AppConfig } from "../../../shared/config/config";
import { AppHeader } from "../../../shared/ui/AppHeader";
import { AppShell } from "../../../shared/ui/AppShell";
import { Board } from "../../../shared/ui/Board";
import { Button } from "../../../shared/ui/Button";
import { TextInput } from "../../../shared/ui/FormControl";
import type { CommentMessage } from "../../comments/model/types";
import { deleteComment, fetchCommentPage } from "../../rooms/api/room_api";
import { useAdminRooms } from "../../rooms/model/useAdminRooms";
import { buildWhipIngestUrl } from "../lib/ingest_url";
import { AdminRoom } from "../ui/AdminRoom";
import { ObsSettings } from "../ui/ObsSettings";

type AdminPageProps = {
  config: AppConfig;
};

type AdminCommentState = {
  comments: CommentMessage[];
  isLoadingOlder: boolean;
  nextCursor: string | null;
};

type CommentMap = Record<string, AdminCommentState>;

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
    if (rooms.length > 0 || title.trim() === "") {
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
    const page = await fetchCommentPage(config, roomId);
    setCommentsByRoomId((current) => ({
      ...current,
      [roomId]: {
        comments: page.comments,
        isLoadingOlder: false,
        nextCursor: page.nextCursor,
      },
    }));
  };

  const loadOlderComments = async (roomId: string): Promise<void> => {
    const current = commentsByRoomId[roomId];
    if (
      current === undefined ||
      current.nextCursor === null ||
      current.isLoadingOlder
    ) {
      return;
    }
    setCommentsByRoomId((map) => ({
      ...map,
      [roomId]: { ...current, isLoadingOlder: true },
    }));
    try {
      const page = await fetchCommentPage(config, roomId, current.nextCursor);
      setCommentsByRoomId((map) => {
        const latest = map[roomId];
        if (latest === undefined) {
          return map;
        }
        return {
          ...map,
          [roomId]: {
            comments: [...page.comments, ...latest.comments],
            isLoadingOlder: false,
            nextCursor: page.nextCursor,
          },
        };
      });
    } finally {
      setCommentsByRoomId((map) => {
        const latest = map[roomId];
        if (latest === undefined) {
          return map;
        }
        return {
          ...map,
          [roomId]: { ...latest, isLoadingOlder: false },
        };
      });
    }
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
      [roomId]: {
        comments: (current[roomId]?.comments ?? []).filter(
          (comment) => comment.commentId !== commentId,
        ),
        isLoadingOlder: current[roomId]?.isLoadingOlder ?? false,
        nextCursor: current[roomId]?.nextCursor ?? null,
      },
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
  const hasRoom = rooms.length > 0;

  return (
    <AppShell>
      <AppHeader
        section="ADMIN"
        links={[
          { href: "/", label: "枠一覧" },
          { href: "/user", label: "ユーザー" },
        ]}
      />
      <ObsSettings />
      <Board icon={MonitorPlay} title="番組管理">
        <form
          className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-[5px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2"
          onSubmit={submitRoom}
        >
          <TextInput
            disabled={hasRoom}
            maxLength={80}
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder={hasRoom ? "作成済み" : "ルーム名"}
            required
            type="text"
            value={title}
          />
          <Button
            className="disabled:cursor-not-allowed disabled:opacity-60"
            disabled={hasRoom}
            type="submit"
          >
            <Plus aria-hidden="true" size={18} />
            作成
          </Button>
        </form>
        <section className="grid gap-1.5">
          {rooms.map((room) => (
            <AdminRoom
              comments={commentsByRoomId[room.id] ?? null}
              key={room.id}
              onLoadComments={loadComments}
              onLoadOlderComments={loadOlderComments}
              onRemoveComment={removeComment}
              onRemoveRoom={removeRoom}
              onRotateIngestToken={rotateIngestToken}
              onUpdateTitle={updateRoomTitleById}
              room={room}
              serverUrl={buildWhipIngestUrl(config, room.id)}
              whipBearerToken={whipTokensByRoomId[room.id] ?? null}
            />
          ))}
        </section>
      </Board>
    </AppShell>
  );
}
