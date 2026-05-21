import { formControlClassName } from "../../shared/ui/styles";
import type { Room } from "../rooms/room_api";
import {
  programBoardClassName,
  programKickerClassName,
  programTitleClassName,
  roomSelectClassName,
} from "./watchStyles";

type WatchProgramHeaderProps = {
  rooms: Room[];
  selectedRoom: Room | null;
  selectedRoomId: string;
  onSwitchRoom: (roomId: string) => void;
};

export function WatchProgramHeader({
  rooms,
  selectedRoom,
  selectedRoomId,
  onSwitchRoom,
}: WatchProgramHeaderProps) {
  return (
    <section className={programBoardClassName}>
      <div>
        <p className={programKickerClassName}>ON AIR</p>
        <h1 className={programTitleClassName}>
          {selectedRoom?.title ?? "番組取得中"}
        </h1>
      </div>
      <label className={roomSelectClassName}>
        <span>番組</span>
        <select
          className={formControlClassName}
          value={selectedRoomId}
          onChange={(event) => onSwitchRoom(event.currentTarget.value)}
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.title}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
