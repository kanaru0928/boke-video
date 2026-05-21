import type { Room } from "./room_api";

const unavailableThumbnailURL = "n/a";
const thumbnailToneClassNames = [
  "bg-[linear-gradient(135deg,#4b4b4b,#101010_55%,#d74a4a)]",
  "bg-[linear-gradient(135deg,#3e5c78,#111111_55%,#e0bd38)]",
  "bg-[linear-gradient(135deg,#6a4f7d,#111111_55%,#57b6d9)]",
  "bg-[linear-gradient(135deg,#406b55,#111111_55%,#e06aa4)]",
  "bg-[linear-gradient(135deg,#7a5b35,#111111_55%,#64d28d)]",
  "bg-[linear-gradient(135deg,#5a5a72,#111111_55%,#ff8b3d)]",
] as const;

type RoomThumbnail = {
  isGenerated: boolean;
  toneClassName: string;
  url: string | null;
};

export function roomThumbnail(room: Room): RoomThumbnail {
  const isGenerated = room.thumbnailUrl === unavailableThumbnailURL;
  return {
    isGenerated,
    toneClassName: thumbnailToneClassNames[thumbnailTone(room.id)],
    url: isGenerated ? null : room.thumbnailUrl,
  };
}

export function roomThumbnailRefreshMilliseconds(rooms: Room[]): number | null {
  if (rooms.length === 0) {
    return null;
  }
  const seconds = Math.min(
    ...rooms.map((room) => room.thumbnailRefreshSeconds),
  );
  return Math.max(seconds, 1) * 1000;
}

function thumbnailTone(seed: string): number {
  let hash = 0;
  for (const letter of seed) {
    const codePoint = letter.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    hash = (hash * 31 + codePoint) % thumbnailToneClassNames.length;
  }
  return hash;
}
