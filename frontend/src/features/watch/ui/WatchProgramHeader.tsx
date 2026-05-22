import { MonitorPlay } from "lucide-react";
import { Board } from "../../../shared/ui/Board";
import type { Room, RoomStreamStatus } from "../../rooms/api/room_api";
import { streamStatusLabel } from "../lib/watch_stream";

type WatchProgramHeaderProps = {
  selectedRoom: Room | null;
  streamStatus: RoomStreamStatus;
};

export function WatchProgramHeader({
  selectedRoom,
  streamStatus,
}: WatchProgramHeaderProps) {
  return (
    <Board
      className="mb-[10px] max-[520px]:mb-[7px]"
      icon={MonitorPlay}
      title={selectedRoom?.title ?? "番組取得中"}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-[5px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] px-2 py-[6px] max-[520px]:px-[7px] max-[520px]:py-[5px]">
        <p className="m-0 inline-block border border-[#8b0000] bg-[linear-gradient(#ff3636,#b70000)] px-[7px] py-[2px] text-[11px] font-extrabold text-white shadow-[inset_1px_1px_0_rgb(255_255_255_/_55%),inset_-1px_-1px_0_rgb(0_0_0_/_35%)] [text-shadow:1px_1px_0_#640000]">
          {streamStatusLabel(streamStatus)}
        </p>
        {selectedRoom?.ownerDisplayName !== undefined ? (
          <p className="m-0 min-w-0 truncate text-[12px] font-extrabold text-[#333333]">
            {selectedRoom.ownerDisplayName}
          </p>
        ) : null}
      </div>
    </Board>
  );
}
