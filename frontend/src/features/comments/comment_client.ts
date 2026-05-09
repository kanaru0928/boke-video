import type { AppConfig } from "../../shared/config/config";
import type { CommentCreateRequest, CommentMessage } from "./types";

type MessageHandler = (message: CommentMessage) => void;

export class CommentClient {
  private socket: WebSocket | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly onMessage: MessageHandler,
  ) {}

  connect(roomId: string): void {
    this.disconnect();
    const url = `${this.config.commentWsUrl}/ws/rooms/${encodeURIComponent(roomId)}/comments`;
    this.socket = new WebSocket(url);
    this.socket.addEventListener("message", (event: MessageEvent<string>) => {
      const parsed = parseCommentMessage(event.data);
      if (parsed !== null) {
        this.onMessage(parsed);
      }
    });
  }

  send(request: CommentCreateRequest): void {
    if (this.socket === null || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(request));
  }

  disconnect(): void {
    if (this.socket !== null) {
      this.socket.close();
      this.socket = null;
    }
  }
}

function parseCommentMessage(raw: string): CommentMessage | null {
  const parsed: unknown = JSON.parse(raw);
  if (!isObject(parsed)) {
    return null;
  }
  if (parsed.type !== "comment") {
    return null;
  }
  return parsed as CommentMessage;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
