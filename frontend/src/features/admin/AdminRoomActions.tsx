import {
  ExternalLink,
  KeyRound,
  MessageSquare,
  Save,
  Trash2,
} from "lucide-react";
import { Button, ButtonLink } from "../../shared/ui/Button";

type AdminRoomActionsProps = {
  canSaveTitle: boolean;
  onLoadComments: (roomId: string) => Promise<void>;
  onRemoveRoom: (roomId: string) => Promise<void>;
  onRotateIngestToken: (roomId: string) => Promise<void>;
  onUpdateTitle: (roomId: string, title: string) => Promise<void>;
  roomId: string;
  title: string;
};

export function AdminRoomActions({
  canSaveTitle,
  onLoadComments,
  onRemoveRoom,
  onRotateIngestToken,
  onUpdateTitle,
  roomId,
  title,
}: AdminRoomActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-[5px] max-[860px]:justify-start">
      <ButtonLink
        href={`/watch?room=${encodeURIComponent(roomId)}`}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLink aria-hidden="true" size={17} />
        開く
      </ButtonLink>
      <Button
        disabled={!canSaveTitle}
        onClick={() => {
          if (canSaveTitle) {
            void onUpdateTitle(roomId, title);
          }
        }}
      >
        <Save aria-hidden="true" size={18} />
        保存
      </Button>
      <Button onClick={() => void onLoadComments(roomId)}>
        <MessageSquare aria-hidden="true" size={18} />
        コメント
      </Button>
      <Button onClick={() => void onRotateIngestToken(roomId)}>
        <KeyRound aria-hidden="true" size={18} />
        再発行
      </Button>
      <Button
        onClick={() => {
          if (window.confirm("この配信枠を削除しますか？")) {
            void onRemoveRoom(roomId);
          }
        }}
      >
        <Trash2 aria-hidden="true" size={18} />
        削除
      </Button>
    </div>
  );
}
