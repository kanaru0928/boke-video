import { spawnSync } from "node:child_process";

const [backendUrl, requestedRoomId, roomTitle, frontendUrl] =
  process.argv.slice(2);

if (!backendUrl || !requestedRoomId || !roomTitle || !frontendUrl) {
  throw new Error(
    "usage: ensure-local-room.mjs <backend-url> <room-id> <room-title> <frontend-url>",
  );
}

const origin = new URL(frontendUrl).origin;
const roomUrl = `${backendUrl}/api/rooms/${encodeURIComponent(requestedRoomId)}`;
const localRoomSetup = process.env.LOCAL_ROOM_SETUP ?? "http";
const databasePath =
  process.env.DATABASE_PATH ?? "/tmp/boke-video-local.sqlite3";

if (localRoomSetup === "database") {
  const output = spawnSync(
    "go",
    ["run", "./cmd/local-room", databasePath, requestedRoomId, roomTitle],
    { cwd: "backend", encoding: "utf8" },
  );
  if (output.status !== 0) {
    throw new Error(output.stderr);
  }
  process.stdout.write(output.stdout);
  process.exit(0);
}

if (localRoomSetup !== "http") {
  throw new Error("LOCAL_ROOM_SETUP must be http or database");
}

async function fetchRoom() {
  const response = await fetch(roomUrl, {
    headers: { Origin: origin },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `room fetch failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.json();
}

async function createRoom() {
  const response = await fetch(`${backendUrl}/api/admin/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({ id: requestedRoomId, title: roomTitle }),
  });
  if (!response.ok) {
    throw new Error(
      `room create failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.json();
}

const existingRoom = await fetchRoom();
const room = existingRoom ?? (await createRoom());
process.stdout.write(room.id);
