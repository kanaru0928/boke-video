import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../../../shared/config/config";
import type { CommentCreateRequest } from "../model/types";
import { CommentClient, commentSocketReconnectDelayMs } from "./comment_client";

const config: AppConfig = {
  apiBaseUrl: "http://localhost:3000",
  commentWsUrl: "ws://localhost:3000",
  ingestBaseUrl: "http://localhost:3333",
  accessEnabled: true,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("CommentClient", () => {
  it("接続中に送信したコメントをopen後に送る", () => {
    const sockets: FakeCommentSocket[] = [];
    const client = new CommentClient(
      config,
      () => {},
      (url) => {
        const socket = new FakeCommentSocket(url);
        sockets.push(socket);
        return socket;
      },
    );

    client.connect("room-1");
    client.send(createCommentRequest("hello"));
    sockets[0].open();

    expect(sockets[0].sentMessages).toEqual([
      JSON.stringify(createCommentRequest("hello")),
    ]);
  });

  it("切断後に送信したコメントを再接続後に送る", () => {
    vi.useFakeTimers();
    const sockets: FakeCommentSocket[] = [];
    const client = new CommentClient(
      config,
      () => {},
      (url) => {
        const socket = new FakeCommentSocket(url);
        sockets.push(socket);
        return socket;
      },
    );

    client.connect("room-1");
    sockets[0].open();
    sockets[0].close();
    client.send(createCommentRequest("after close"));

    vi.advanceTimersByTime(commentSocketReconnectDelayMs);
    sockets[1].open();

    expect(sockets).toHaveLength(2);
    expect(sockets[1].url).toBe("ws://localhost:3000/ws/rooms/room-1/comments");
    expect(sockets[1].sentMessages).toEqual([
      JSON.stringify(createCommentRequest("after close")),
    ]);
  });

  it("disconnect後は再接続しない", () => {
    vi.useFakeTimers();
    const sockets: FakeCommentSocket[] = [];
    const client = new CommentClient(
      config,
      () => {},
      (url) => {
        const socket = new FakeCommentSocket(url);
        sockets.push(socket);
        return socket;
      },
    );

    client.connect("room-1");
    client.disconnect();
    vi.advanceTimersByTime(commentSocketReconnectDelayMs);

    expect(sockets).toHaveLength(1);
  });
});

function createCommentRequest(body: string): CommentCreateRequest {
  return {
    body,
    color: "#ffffff",
    direction: "rightToLeft",
    fontSize: "medium",
  };
}

class FakeCommentSocket extends EventTarget {
  readonly sentMessages: string[] = [];
  readyState: number = WebSocket.CONNECTING;

  constructor(readonly url: string) {
    super();
  }

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }

  send(message: string): void {
    this.sentMessages.push(message);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent(new Event("close"));
  }
}
