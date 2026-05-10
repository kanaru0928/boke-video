type ConnectionClosedHandler = () => void;

const closedConnectionStates: RTCPeerConnectionState[] = [
  "disconnected",
  "failed",
  "closed",
];

export class WebRtcPlayer {
  private abortController: AbortController | null = null;
  private connection: RTCPeerConnection | null = null;
  private sessionUrl: string | null = null;

  async attach(
    video: HTMLVideoElement,
    whepUrl: string,
    onConnectionClosed: ConnectionClosedHandler,
  ): Promise<void> {
    this.destroy();

    const abortController = new AbortController();
    const connection = new RTCPeerConnection();
    const mediaStream = new MediaStream();
    this.abortController = abortController;
    this.connection = connection;

    connection.addTransceiver("video", { direction: "recvonly" });
    connection.addTransceiver("audio", { direction: "recvonly" });
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
    video.muted = true;
    video.playsInline = true;

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await waitForIceGathering(connection);

    const localDescription = connection.localDescription;
    if (localDescription === null) {
      throw new Error("WebRTC offer was not created");
    }

    const response = await fetch(whepUrl, {
      body: localDescription.sdp,
      credentials: "include",
      headers: { "Content-Type": "application/sdp" },
      method: "POST",
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw new Error(`WHEP connection failed: ${response.status}`);
    }

    const sessionLocation = response.headers.get("Location");
    this.sessionUrl =
      sessionLocation === null
        ? null
        : new URL(sessionLocation, whepUrl).toString();
    await connection.setRemoteDescription({
      sdp: await response.text(),
      type: "answer",
    });
    await video.play();
  }

  destroy(): void {
    this.abortController?.abort();
    this.abortController = null;

    if (this.sessionUrl !== null) {
      void fetch(this.sessionUrl, {
        credentials: "include",
        keepalive: true,
        method: "DELETE",
      });
      this.sessionUrl = null;
    }

    this.connection?.close();
    this.connection = null;
  }
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
