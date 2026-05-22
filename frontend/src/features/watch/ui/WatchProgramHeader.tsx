import { cn } from "../../../shared/ui/classNames";
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
    <section
      className={cn(
        "mb-[10px] grid grid-cols-[minmax(0,1fr)_minmax(220px,330px)] items-center gap-3",
        "border border-[#c29300] bg-[#fffdf2] px-2 py-[5px]",
        "max-[860px]:grid-cols-1 max-[520px]:mb-[7px] max-[520px]:gap-1.5 max-[520px]:px-[7px] max-[520px]:py-1",
      )}
    >
      <div>
        <div className="mb-[3px] flex min-w-0 flex-wrap items-center gap-[5px]">
          <p className="m-0 inline-block bg-[#d40000] px-[5px] py-px text-[11px] font-extrabold text-white">
            {streamStatusLabel(streamStatus)}
          </p>
          {selectedRoom?.ownerDisplayName !== undefined ? (
            <p className="m-0 min-w-0 truncate border border-[#c8b16b] bg-white px-[5px] py-px text-[11px] font-extrabold text-[#6f5700] shadow-[inset_1px_1px_0_#ffffff]">
              {selectedRoom.ownerDisplayName}
            </p>
          ) : null}
        </div>
        <h1 className="m-0 text-[19px] font-extrabold tracking-normal max-[520px]:text-base">
          {selectedRoom?.title ?? "番組取得中"}
        </h1>
      </div>
    </section>
  );
}
