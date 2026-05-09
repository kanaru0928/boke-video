import type { AppConfig } from "../../shared/config/config";
import { CommentClient } from "../comments/comment_client";
import { directionLabel } from "../comments/comment_labels";
import { CommentRenderer } from "../comments/comment_renderer";
import {
  type CommentCreateRequest,
  type CommentDirection,
  type CommentFontSize,
  type CommentMessage,
  commentColors,
  commentDirections,
} from "../comments/types";
import { DashPlayer } from "../player/dash_player";
import {
  fetchComments,
  fetchRoomStreamStatus,
  fetchRooms,
} from "../rooms/room_api";

export class WatchView {
  constructor(
    private readonly root: HTMLElement,
    private readonly config: AppConfig,
  ) {}

  async mount(): Promise<void> {
    this.root.innerHTML = `
      <section class="watch-shell">
        <header class="topbar">
          <h1>Boke Video</h1>
          <a class="link-button" href="/admin">管理</a>
        </header>
        <section class="watch-grid">
          <section class="stage">
            <video id="video" playsinline controls></video>
            <div id="comments" class="comments-layer"></div>
            <div id="stream-status" class="stream-status"></div>
          </section>
          <aside class="side-panel">
            <label class="field">
              <span>ルーム</span>
              <select id="room-select"></select>
            </label>
            <form id="comment-form" class="comment-form">
              <textarea id="comment-body" maxlength="100" placeholder="コメント" required></textarea>
              <div class="form-row">
                <select id="comment-direction"></select>
                <select id="comment-size">
                  <option value="small">小</option>
                  <option value="medium" selected>中</option>
                  <option value="large">大</option>
                </select>
              </div>
              <div id="comment-colors" class="color-row"></div>
              <button type="submit">送信</button>
            </form>
          </aside>
        </section>
      </section>
    `;

    await this.connectElements();
  }

  private async connectElements(): Promise<void> {
    const video = elementById("video", HTMLVideoElement);
    const commentsLayer = elementById("comments", HTMLElement);
    const streamStatus = elementById("stream-status", HTMLElement);
    const roomSelect = elementById("room-select", HTMLSelectElement);
    const form = elementById("comment-form", HTMLFormElement);
    const body = elementById("comment-body", HTMLTextAreaElement);
    const direction = elementById("comment-direction", HTMLSelectElement);
    const size = elementById("comment-size", HTMLSelectElement);
    const colors = elementById("comment-colors", HTMLElement);

    this.renderDirectionOptions(direction);
    const selectedColor = this.renderColorButtons(colors);
    const rooms = await fetchRooms(this.config);
    for (const room of rooms) {
      roomSelect.append(new Option(room.title, room.id));
    }

    const renderer = new CommentRenderer(commentsLayer);
    const client = new CommentClient(this.config, (message: CommentMessage) =>
      renderer.render(message),
    );
    const player = new DashPlayer();

    const switchRoom = async (roomId: string): Promise<void> => {
      renderer.clear();
      const status = await fetchRoomStreamStatus(this.config, roomId);
      if (status?.stream === "ready") {
        streamStatus.hidden = true;
        const manifestUrl = `${this.config.streamBaseUrl}/live/${encodeURIComponent(roomId)}/manifest.mpd`;
        player.attach(video, manifestUrl);
      } else {
        player.destroy();
        video.removeAttribute("src");
        video.load();
        streamStatus.hidden = false;
        streamStatus.textContent = streamStatusMessage(
          status?.stream ?? "missing",
        );
      }
      client.connect(roomId);
      const history = await fetchComments(this.config, roomId);
      for (const message of history) {
        renderer.render(message);
      }
    };

    const initialRoomId =
      new URLSearchParams(location.search).get("room") ?? rooms[0]?.id;
    if (initialRoomId !== undefined) {
      roomSelect.value = initialRoomId;
      await switchRoom(initialRoomId);
    }

    roomSelect.addEventListener("change", () => {
      void switchRoom(roomSelect.value);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const request: CommentCreateRequest = {
        body: body.value,
        direction: direction.value as CommentDirection,
        color: selectedColor.current,
        fontSize: size.value as CommentFontSize,
      };
      client.send(request);
      body.value = "";
    });
  }

  private renderDirectionOptions(direction: HTMLSelectElement): void {
    for (const item of commentDirections) {
      direction.append(new Option(directionLabel(item), item));
    }
  }

  private renderColorButtons(colors: HTMLElement): { current: string } {
    const selectedColor = { current: commentColors[0] as string };
    for (const color of commentColors) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-button";
      button.style.backgroundColor = color;
      button.ariaLabel = color;
      button.addEventListener("click", () => {
        selectedColor.current = color;
        for (const child of colors.children) {
          child.classList.toggle("is-selected", child === button);
        }
      });
      colors.append(button);
    }
    colors.firstElementChild?.classList.add("is-selected");
    return selectedColor;
  }
}

function streamStatusMessage(status: "ready" | "stale" | "missing"): string {
  switch (status) {
    case "ready":
      return "";
    case "stale":
      return "配信が停止しています";
    case "missing":
      return "配信はまだ開始されていません";
  }
}

function elementById<T extends HTMLElement>(
  id: string,
  elementConstructor: { new (): T },
): T {
  const element = document.getElementById(id);
  if (!(element instanceof elementConstructor)) {
    throw new Error(`${id} element is missing`);
  }
  return element;
}
