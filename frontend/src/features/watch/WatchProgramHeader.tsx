import type { Room } from "../rooms/room_api";
import {
  programBoardClassName,
  programKickerClassName,
  programTitleClassName,
} from "./watchStyles";

type WatchProgramHeaderProps = {
  selectedRoom: Room | null;
};

export function WatchProgramHeader({ selectedRoom }: WatchProgramHeaderProps) {
  return (
    <section className={programBoardClassName}>
      <div>
        <p className={programKickerClassName}>ON AIR</p>
        <h1 className={programTitleClassName}>
          {selectedRoom?.title ?? "番組取得中"}
        </h1>
      </div>
    </section>
  );
}
