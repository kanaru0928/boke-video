import type { Room, RoomStreamStatus } from "../rooms/room_api";
import { streamStatusLabel } from "./watch_stream";
import {
  programBoardClassName,
  programKickerClassName,
  programTitleClassName,
} from "./watchStyles";

type WatchProgramHeaderProps = {
  selectedRoom: Room | null;
  streamStatus: RoomStreamStatus;
};

export function WatchProgramHeader({
  selectedRoom,
  streamStatus,
}: WatchProgramHeaderProps) {
  return (
    <section className={programBoardClassName}>
      <div>
        <p className={programKickerClassName}>
          {streamStatusLabel(streamStatus)}
        </p>
        <h1 className={programTitleClassName}>
          {selectedRoom?.title ?? "番組取得中"}
        </h1>
      </div>
    </section>
  );
}
