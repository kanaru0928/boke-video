const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8080";
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    ...options,
    headers: {
      Origin: frontendOrigin,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  let body = null;
  if (text !== "") {
    body = JSON.parse(text);
  }
  return { response, body, text };
}

const health = await request("/healthz");
assert(health.response.ok, `healthz failed: ${health.response.status}`);

const roomResult = await request("/api/admin/rooms", {
  method: "POST",
  body: JSON.stringify({ title: "local smoke test" }),
});
assert(
  roomResult.response.status === 201,
  `room create failed: ${roomResult.response.status}`,
);
const roomId = roomResult.body.id;

const streamAccessResult = await request(`/api/rooms/${roomId}/stream-access`, {
  method: "POST",
});
assert(
  streamAccessResult.response.status === 201,
  `stream access failed: ${streamAccessResult.response.status}`,
);
assert(
  typeof streamAccessResult.body.playbackUrl === "string" &&
    streamAccessResult.body.playbackUrl.startsWith("ws") &&
    streamAccessResult.body.playbackUrl.includes("/live/") &&
    streamAccessResult.body.playbackUrl.includes("/master") &&
    streamAccessResult.body.playbackUrl.includes("policy=") &&
    streamAccessResult.body.playbackUrl.includes("signature="),
  "stream access did not include a signed playback URL",
);

const commentResult = await request(`/api/rooms/${roomId}/comments`, {
  method: "POST",
  body: JSON.stringify({
    body: "smoke",
    direction: "fixedTop",
    color: "#40c4ff",
    fontSize: "large",
  }),
});
assert(
  commentResult.response.status === 201,
  `comment create failed: ${commentResult.response.status}`,
);

const commentsResult = await request(`/api/rooms/${roomId}/comments?limit=10`);
assert(commentsResult.body.length === 1, "comment history count mismatch");
assert(
  commentsResult.body[0].color === "#40c4ff",
  "comment color was not persisted",
);
assert(
  commentsResult.body[0].fontSize === "large",
  "comment font size was not persisted",
);

const wsUrl = backendUrl.replace(/^http/, "ws");
const receiver = new WebSocket(`${wsUrl}/ws/rooms/${roomId}/comments`, {
  headers: { Origin: frontendOrigin },
});
const sender = new WebSocket(`${wsUrl}/ws/rooms/${roomId}/comments`, {
  headers: { Origin: frontendOrigin },
});

await Promise.all([
  new Promise((resolve, reject) => {
    receiver.onopen = resolve;
    receiver.onerror = reject;
  }),
  new Promise((resolve, reject) => {
    sender.onopen = resolve;
    sender.onerror = reject;
  }),
]);

await new Promise((resolve) => setTimeout(resolve, 1050));
const received = new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () => reject(new Error("websocket broadcast timeout")),
    5000,
  );
  receiver.onmessage = (event) => {
    clearTimeout(timeout);
    resolve(JSON.parse(event.data));
  };
});
sender.send(
  JSON.stringify({
    body: "websocket smoke",
    direction: "leftToRight",
    color: "#69f0ae",
    fontSize: "small",
  }),
);
const message = await received;
assert(message.body === "websocket smoke", "websocket body mismatch");
assert(message.color === "#69f0ae", "websocket color mismatch");
assert(message.fontSize === "small", "websocket font size mismatch");

receiver.close();
sender.close();

console.log(
  JSON.stringify(
    {
      roomId,
      checks: "ok",
    },
    null,
    2,
  ),
);
