import type { Room } from "./room_api";

const thumbnailToneCount = 6;
const unavailableThumbnailURL = "n/a";

type RoomThumbnail = {
  initials: string;
  isGenerated: boolean;
  toneClassName: string;
  url: string | null;
};

export function roomThumbnail(room: Room): RoomThumbnail {
  const isGenerated = room.thumbnailUrl === unavailableThumbnailURL;
  return {
    initials: roomInitials(room.title),
    isGenerated,
    toneClassName: `room-thumbnail-tone-${thumbnailTone(room.id)}`,
    url: isGenerated ? null : room.thumbnailUrl,
  };
}

export function roomInitials(title: string): string {
  const letters = Array.from(title.trim()).filter((letter) => letter !== " ");
  return letters.slice(0, 2).join("") || "枠";
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
    hash = (hash * 31 + codePoint) % thumbnailToneCount;
  }
  return hash;
}
