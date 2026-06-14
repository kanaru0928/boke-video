import { useEffect, useState } from "react";
import { Button } from "../../../shared/ui/Button";
import { TextInput } from "../../../shared/ui/FormControl";
import type { CommentMessage } from "../../comments/model/types";
import type { Room } from "../../rooms/api/room_api";
import {
  canSaveAdminRoomTitle,
  normalizeAdminRoomTitle,
} from "../lib/admin_room_title";
import { normalizeIngestClipboardValue } from "../lib/copy_ingest_value";
import {
  configureObsWhipStream,
  formatObsConnectionError,
} from "../lib/obs_stream_service";
import type { ObsWebsocketConnectionSettings } from "../lib/obs_websocket_connection";
import { AdminCommentList } from "./AdminCommentList";
import { AdminRoomActions } from "./AdminRoomActions";
import {
  type IngestCopyTarget,
  IngestSettings,
  type ObsApplyStatus,
} from "./IngestSettings";

type AdminRoomProps = {
  comments: AdminCommentState | null;
  onClearPassword: (roomId: string) => Promise<boolean>;
  onLoadComments: (roomId: string) => Promise<void>;
  onLoadOlderComments: (roomId: string) => Promise<void>;
  onRemoveComment: (roomId: string, commentId: string) => Promise<void>;
  onRemoveRoom: (roomId: string) => Promise<void>;
  onRotateBypassToken: (
    roomId: string,
  ) => Promise<{ bypassToken: string } | null>;
  onRotateIngestToken: (roomId: string) => Promise<void>;
  onSetPassword: (roomId: string, password: string) => Promise<boolean>;
  onUpdateTitle: (roomId: string, title: string) => Promise<void>;
  obsWebsocketConnection: ObsWebsocketConnectionSettings;
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
  onClearPassword,
  onLoadComments,
  onLoadOlderComments,
  onRemoveComment,
  onRemoveRoom,
  onRotateBypassToken,
  onRotateIngestToken,
  onSetPassword,
  onUpdateTitle,
  obsWebsocketConnection,
  room,
  serverUrl,
  whipBearerToken,
}: AdminRoomProps) {
  const [title, setTitle] = useState(room.title);
  const [passwordInput, setPasswordInput] = useState("");
  const [bypassUrl, setBypassUrl] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<IngestCopyTarget | null>(
    null,
  );
  const [obsApplyStatus, setObsApplyStatus] = useState<ObsApplyStatus>("idle");
  const [obsApplyError, setObsApplyError] = useState<string | null>(null);
  useEffect(() => {
    setTitle(room.title);
  }, [room.title]);
  useEffect(() => {
    if (copiedTarget === null) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setCopiedTarget(null);
    }, 3200);
    return () => window.clearTimeout(timeoutId);
  }, [copiedTarget]);
  useEffect(() => {
    if (obsApplyStatus !== "applied") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setObsApplyStatus("idle");
    }, 3200);
    return () => window.clearTimeout(timeoutId);
  }, [obsApplyStatus]);

  const trimmedTitle = normalizeAdminRoomTitle(title);
  const canSaveTitle = canSaveAdminRoomTitle(title, room.title);

  const copyIngestValue = async (
    target: IngestCopyTarget,
    value: string,
  ): Promise<void> => {
    await navigator.clipboard.writeText(normalizeIngestClipboardValue(value));
    setCopiedTarget(target);
  };

  const savePassword = async (): Promise<void> => {
    if (passwordInput.trim() === "") return;
    await onSetPassword(room.id, passwordInput.trim());
    setPasswordInput("");
  };

  const clearPassword = async (): Promise<void> => {
    await onClearPassword(room.id);
    setBypassUrl(null);
  };

  const generateBypassUrl = async (): Promise<void> => {
    const result = await onRotateBypassToken(room.id);
    if (result === null) return;
    const watchBase = new URL(
      `/watch?room=${encodeURIComponent(room.id)}&bypass=${result.bypassToken}`,
      window.location.href,
    ).toString();
    setBypassUrl(watchBase);
  };

  const copyBypassUrl = async (): Promise<void> => {
    if (bypassUrl === null) return;
    await navigator.clipboard.writeText(bypassUrl);
  };

  const applyObsSettings = async (): Promise<void> => {
    if (whipBearerToken === null) {
      setObsApplyError("Bearer Tokenを再発行してからOBSへ反映してください。");
      setObsApplyStatus("failed");
      return;
    }
    setObsApplyStatus("applying");
    setObsApplyError(null);
    try {
      await configureObsWhipStream({
        bearerToken: whipBearerToken,
        obsWebsocketConnection,
        serverUrl,
      });
      setObsApplyStatus("applied");
    } catch (error) {
      setObsApplyError(formatObsConnectionError(error));
      setObsApplyStatus("failed");
    }
  };

  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border border-[#a7a7a7] bg-white p-[7px] max-[860px]:grid-cols-1">
      <div className="grid min-w-0 gap-[5px]">
        <TextInput
          aria-label="ルーム名"
          maxLength={80}
          onChange={(event) => setTitle(event.currentTarget.value)}
          type="text"
          value={title}
        />
        <IngestSettings
          copiedTarget={copiedTarget}
          obsApplyError={obsApplyError}
          obsApplyStatus={obsApplyStatus}
          serverUrl={serverUrl}
          whipBearerToken={whipBearerToken}
          onApplyObs={applyObsSettings}
          onCopy={copyIngestValue}
        />
      </div>
      <AdminRoomActions
        canSaveTitle={canSaveTitle}
        roomId={room.id}
        title={trimmedTitle}
        onLoadComments={onLoadComments}
        onRemoveRoom={onRemoveRoom}
        onRotateIngestToken={onRotateIngestToken}
        onUpdateTitle={onUpdateTitle}
      />
      <div className="col-span-full grid gap-[5px] border-t border-[#e0e0e0] pt-[5px]">
        <p className="text-xs text-[#555]">
          合言葉:{" "}
          <span className="font-bold">
            {room.hasPassword ? "設定済み" : "未設定"}
          </span>
        </p>
        <div className="flex flex-wrap gap-[5px]">
          <TextInput
            aria-label="合言葉"
            className="min-w-0 flex-1"
            onChange={(e) => setPasswordInput(e.currentTarget.value)}
            placeholder="新しい合言葉"
            type="password"
            value={passwordInput}
          />
          <Button
            disabled={passwordInput.trim() === ""}
            onClick={savePassword}
            type="button"
          >
            設定
          </Button>
          {room.hasPassword ? (
            <Button onClick={clearPassword} type="button">
              解除
            </Button>
          ) : null}
        </div>
        {room.hasPassword ? (
          <div className="flex flex-wrap items-center gap-[5px]">
            <Button onClick={generateBypassUrl} type="button">
              バイパスURL発行
            </Button>
            {bypassUrl !== null ? (
              <>
                <span className="min-w-0 flex-1 truncate text-xs text-[#333]">
                  {bypassUrl}
                </span>
                <Button onClick={copyBypassUrl} type="button">
                  コピー
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {comments !== null ? (
        <AdminCommentList
          comments={comments}
          roomId={room.id}
          onLoadOlderComments={onLoadOlderComments}
          onRemoveComment={onRemoveComment}
        />
      ) : null}
    </article>
  );
}
