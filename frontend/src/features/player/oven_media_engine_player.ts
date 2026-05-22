type ConnectionClosedHandler = () => void;

export type PlaybackStartResult = "playing" | "manualPlaybackRequired";

type PlaybackStartOptions = {
  sound?: "preserve" | "unmute";
};

type PlayableMediaElement = Pick<HTMLVideoElement, "muted" | "play">;

type OmeSessionDescription = {
  sdp: string;
  type: RTCSdpType;
};

type OmeOfferMessage = {
  candidates: RTCIceCandidateInit[];
  command: "offer";
  iceServers: RTCIceServer[];
  id: number;
  peerId: number;
  sdp: OmeSessionDescription;
};

type OfferResponse = {
  offer: OmeOfferMessage;
  socket: WebSocket;
};

const closedConnectionStates: RTCPeerConnectionState[] = [
  "disconnected",
  "failed",
  "closed",
];

export class OvenMediaEnginePlayer {
  private connection: RTCPeerConnection | null = null;
  private socket: WebSocket | null = null;

  async attach(
    video: HTMLVideoElement,
    playbackUrl: string,
    onConnectionClosed: ConnectionClosedHandler,
  ): Promise<void> {
    this.destroy();

    const { offer, socket } = await requestOffer(playbackUrl);
    const connection = new RTCPeerConnection({
      iceServers: offer.iceServers,
    });
    const mediaStream = new MediaStream();
    this.connection = connection;

    connection.addEventListener("track", (event) => {
      const tracks = event.streams[0]?.getTracks() ?? [event.track];
      for (const track of tracks) {
        if (
          !mediaStream.getTracks().some((current) => current.id === track.id)
        ) {
          mediaStream.addTrack(track);
        }
      }
    });
    connection.addEventListener("connectionstatechange", () => {
      if (closedConnectionStates.includes(connection.connectionState)) {
        onConnectionClosed();
      }
    });

    video.srcObject = mediaStream;
    video.autoplay = true;
    video.playsInline = true;

    await connection.setRemoteDescription(offer.sdp);
    for (const candidate of offer.candidates) {
      await connection.addIceCandidate(candidate);
    }

    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    await waitForIceGathering(connection);

    const localDescription = connection.localDescription;
    if (localDescription === null) {
      throw new Error("WebRTC answer was not created");
    }

    this.socket = socket;
    this.socket.send(
      JSON.stringify({
        command: "answer",
        id: offer.id,
        peer_id: offer.peerId,
        sdp: localDescription,
      }),
    );
  }

  destroy(): void {
    this.socket?.close();
    this.socket = null;
    this.connection?.close();
    this.connection = null;
  }
}

export async function startVideoPlayback(
  video: PlayableMediaElement,
  options: PlaybackStartOptions = {},
): Promise<PlaybackStartResult> {
  if (options.sound === "unmute") {
    video.muted = false;
  }
  try {
    await video.play();
    return "playing";
  } catch (error) {
    if (requiresManualPlayback(error)) {
      return "manualPlaybackRequired";
    }
    throw error;
  }
}

function requiresManualPlayback(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "AbortError")
  );
}

function requestOffer(playbackUrl: string): Promise<OfferResponse> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(playbackUrl);
    let settled = false;

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ command: "request_offer" }));
    });
    socket.addEventListener("message", (event) => {
      if (settled) {
        return;
      }
      const message = parseOfferMessage(event.data);
      if (message === null) {
        settled = true;
        reject(new Error("OvenMediaEngine offer was invalid"));
        socket.close();
        return;
      }
      settled = true;
      resolve({ offer: message, socket });
    });
    socket.addEventListener("error", () => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error("OvenMediaEngine signaling failed"));
    });
    socket.addEventListener("close", () => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error("OvenMediaEngine signaling closed"));
    });
  });
}

function parseOfferMessage(data: unknown): OmeOfferMessage | null {
  if (typeof data !== "string") {
    return null;
  }
  const parsed: unknown = JSON.parse(data);
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const message = parsed as Record<string, unknown>;
  if (
    message.command !== "offer" ||
    typeof message.id !== "number" ||
    typeof message.peer_id !== "number" ||
    !isSessionDescription(message.sdp)
  ) {
    return null;
  }
  return {
    candidates: parseCandidates(message.candidates),
    command: "offer",
    iceServers: parseIceServers(message.ice_servers),
    id: message.id,
    peerId: message.peer_id,
    sdp: {
      sdp: message.sdp.sdp,
      type: message.sdp.type,
    },
  };
}

function isSessionDescription(value: unknown): value is OmeSessionDescription {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const description = value as Record<string, unknown>;
  return (
    description.type === "offer" &&
    typeof description.sdp === "string" &&
    description.sdp !== ""
  );
}

function parseCandidates(value: unknown): RTCIceCandidateInit[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isCandidate);
}

function isCandidate(value: unknown): value is RTCIceCandidateInit {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.candidate === "string";
}

function parseIceServers(value: unknown): RTCIceServer[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isIceServer);
}

function isIceServer(value: unknown): value is RTCIceServer {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const server = value as Record<string, unknown>;
  return typeof server.urls === "string" || Array.isArray(server.urls);
}

function waitForIceGathering(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const handleStateChange = (): void => {
      if (connection.iceGatheringState !== "complete") {
        return;
      }
      connection.removeEventListener(
        "icegatheringstatechange",
        handleStateChange,
      );
      resolve();
    };
    connection.addEventListener("icegatheringstatechange", handleStateChange);
  });
}
