const [backendUrl, requestedRoomId, roomTitle, frontendUrl] =
  process.argv.slice(2);

if (!backendUrl || !requestedRoomId || !roomTitle || !frontendUrl) {
  throw new Error(
    "usage: create-local-whip-room.mjs <backend-url> <room-id> <room-title> <frontend-url>",
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

async function rotateIngestToken(roomId) {
  const response = await fetch(
    `${backendUrl}/api/admin/rooms/${encodeURIComponent(roomId)}/ingest-token`,
    {
      method: "POST",
      headers: { Origin: origin },
    },
  );
  if (!response.ok) {
    throw new Error(
      `ingest token rotation failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.json();
}

const room = (await fetchRoom()) ?? (await createRoom());
const tokenResponse =
  typeof room.whipBearerToken === "string"
    ? room
    : await rotateIngestToken(room.id);

process.stdout.write(`ROOM_ID=${room.id}
WHIP_BEARER_TOKEN=${tokenResponse.whipBearerToken}
`);
