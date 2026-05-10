const [backendUrl, requestedRoomId, roomTitle, frontendUrl] =
  process.argv.slice(2);

if (!backendUrl || !requestedRoomId || !roomTitle || !frontendUrl) {
  throw new Error(
    "usage: ensure-local-room.mjs <backend-url> <room-id> <room-title> <frontend-url>",
  );
}

const origin = new URL(frontendUrl).origin;
const roomUrl = `${backendUrl}/api/rooms/${encodeURIComponent(requestedRoomId)}`;

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
