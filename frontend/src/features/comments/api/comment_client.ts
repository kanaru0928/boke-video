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

export class CommentClient {
  private socket: WebSocket | null = null;
  private pendingRequests: CommentCreateRequest[] = [];

  constructor(
    private readonly config: AppConfig,
    private readonly onMessage: MessageHandler,
  ) {}

  connect(roomId: string): void {
    this.disconnect();
    this.socket = new WebSocket(commentWebSocketEndpoint(this.config, roomId));
    this.socket.addEventListener("open", () => {
      this.flushPendingRequests();
    });
    this.socket.addEventListener("message", (event: MessageEvent<string>) => {
      const parsed = parseCommentMessage(event.data);
      if (parsed !== null) {
        this.onMessage(parsed);
      }
    });
  }

  send(request: CommentCreateRequest): void {
    if (this.socket === null) {
      return;
    }
    if (this.socket.readyState === WebSocket.CONNECTING) {
      this.pendingRequests.push(request);
      return;
    }
    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(request));
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

  disconnect(): void {
    this.pendingRequests = [];
    if (this.socket !== null) {
      this.socket.close();
      this.socket = null;
    }
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
