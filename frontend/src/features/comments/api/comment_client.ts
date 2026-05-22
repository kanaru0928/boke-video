import { commentWebSocketEndpoint } from "../../../shared/api/endpoints";
import type { AppConfig } from "../../../shared/config/config";
import {
  isCommentMessage,
  isOwnerProfileMessage,
  isPresenceMessage,
} from "../lib/comment_message";
import type {
  CommentCreateRequest,
  CommentMessage,
  OwnerProfileMessage,
  PresenceMessage,
} from "../model/types";

type MessageHandler = (
  message: CommentMessage | OwnerProfileMessage | PresenceMessage,
) => void;

type CommentSocket = Pick<
  WebSocket,
  "addEventListener" | "close" | "readyState" | "send"
>;

type CommentSocketFactory = (url: string) => CommentSocket;

export const commentSocketReconnectDelayMs = 1000;

export class CommentClient {
  private manuallyDisconnected = false;
  private reconnectTimerId: ReturnType<typeof globalThis.setTimeout> | null =
    null;
  private roomId: string | null = null;
  private socket: CommentSocket | null = null;
  private pendingRequests: CommentCreateRequest[] = [];

  constructor(
    private readonly config: AppConfig,
    private readonly onMessage: MessageHandler,
    private readonly socketFactory: CommentSocketFactory = (url) =>
      new WebSocket(url),
  ) {}

  connect(roomId: string): void {
    this.disconnect();
    this.manuallyDisconnected = false;
    this.roomId = roomId;
    this.openSocket();
  }

  send(request: CommentCreateRequest): void {
    if (this.socket === null) {
      this.queuePendingRequest(request);
      this.scheduleReconnect();
      return;
    }
    if (this.socket.readyState === WebSocket.CONNECTING) {
      this.queuePendingRequest(request);
      return;
    }
    if (this.socket.readyState !== WebSocket.OPEN) {
      this.queuePendingRequest(request);
      this.scheduleReconnect();
      return;
    }
    this.socket.send(JSON.stringify(request));
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.roomId = null;
    this.pendingRequests = [];
    this.clearReconnectTimer();
    if (this.socket !== null) {
      this.socket.close();
      this.socket = null;
    }
  }

  private openSocket(): void {
    if (this.roomId === null) {
      return;
    }
    this.clearReconnectTimer();
    const socket = this.socketFactory(
      commentWebSocketEndpoint(this.config, this.roomId),
    );
    this.socket = socket;
    socket.addEventListener("open", () => {
      if (this.socket !== socket) {
        return;
      }
      this.flushPendingRequests();
    });
    socket.addEventListener("message", (event: MessageEvent<string>) => {
      const parsed = parseCommentMessage(event.data);
      if (parsed !== null) {
        this.onMessage(parsed);
      }
    });
    socket.addEventListener("close", () => {
      if (this.socket === socket) {
        this.socket = null;
      }
      this.scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      if (this.socket === socket) {
        socket.close();
      }
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (
      this.manuallyDisconnected ||
      this.roomId === null ||
      this.reconnectTimerId !== null
    ) {
      return;
    }
    this.reconnectTimerId = globalThis.setTimeout(() => {
      this.reconnectTimerId = null;
      this.openSocket();
    }, commentSocketReconnectDelayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimerId === null) {
      return;
    }
    globalThis.clearTimeout(this.reconnectTimerId);
    this.reconnectTimerId = null;
  }

  private queuePendingRequest(request: CommentCreateRequest): void {
    this.pendingRequests.push(request);
  }

  private flushPendingRequests(): void {
    if (this.socket === null || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    for (const request of this.pendingRequests) {
      this.socket.send(JSON.stringify(request));
    }
    this.pendingRequests = [];
  }
}

function parseCommentMessage(
  raw: string,
): CommentMessage | OwnerProfileMessage | PresenceMessage | null {
  const parsed: unknown = JSON.parse(raw);
  if (
    isCommentMessage(parsed) ||
    isOwnerProfileMessage(parsed) ||
    isPresenceMessage(parsed)
  ) {
    return parsed;
  }
  return null;
}
