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
import { fetchRoomStreamStatus, fetchRooms } from "../rooms/room_api";
import { isCommentSubmitShortcut } from "./comment_shortcuts";
import { canPlayStream, streamStatusMessage } from "./watch_stream";

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
          <section id="stage" class="stage">
            <video id="video" playsinline muted></video>
            <div id="comments" class="comments-layer"></div>
            <div id="stream-status" class="stream-status"></div>
            <div class="player-controls">
              <button id="play-toggle" type="button">再生</button>
              <span class="live-badge">LIVE</span>
              <button id="mute-toggle" type="button">消音中</button>
              <button id="fullscreen-toggle" type="button">全画面</button>
            </div>
          </section>
          <aside class="side-panel">
            <label class="field">
              <span>ルーム</span>
              <select id="room-select"></select>
            </label>
            <form id="comment-form" class="comment-form">
              <div class="comment-compose">
                <textarea id="comment-body" maxlength="100" placeholder="コメント" required></textarea>
                <button type="submit">送信</button>
              </div>
              <fieldset class="choice-field">
                <legend>方向</legend>
                <div id="comment-direction" class="choice-grid choice-grid-direction"></div>
              </fieldset>
              <fieldset class="choice-field">
                <legend>大きさ</legend>
                <div id="comment-size" class="choice-grid choice-grid-size"></div>
              </fieldset>
              <div id="comment-colors" class="color-row"></div>
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
    const playToggle = elementById("play-toggle", HTMLButtonElement);
    const muteToggle = elementById("mute-toggle", HTMLButtonElement);
    const fullscreenToggle = elementById(
      "fullscreen-toggle",
      HTMLButtonElement,
    );
    const stage = elementById("stage", HTMLElement);
    const roomSelect = elementById("room-select", HTMLSelectElement);
    const form = elementById("comment-form", HTMLFormElement);
    const body = elementById("comment-body", HTMLTextAreaElement);
    const direction = elementById("comment-direction", HTMLElement);
    const size = elementById("comment-size", HTMLElement);
    const colors = elementById("comment-colors", HTMLElement);

    const selectedDirection = this.renderDirectionChoices(direction);
    const selectedSize = this.renderSizeChoices(size);
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
    let activeRoomId = "";
    let attachedRoomId = "";

    const updatePlayerControls = (): void => {
      playToggle.textContent = video.paused ? "再生" : "一時停止";
      muteToggle.textContent = video.muted ? "消音中" : "音声";
    };

    const attachStreamWhenReady = async (roomId: string): Promise<void> => {
      const status = await fetchRoomStreamStatus(this.config, roomId);
      if (roomId !== activeRoomId) {
        return;
      }
      if (canPlayStream(status)) {
        streamStatus.hidden = true;
        if (attachedRoomId !== roomId) {
          const manifestUrl = `${this.config.streamBaseUrl}/live/${encodeURIComponent(roomId)}/manifest.mpd`;
          player.attach(video, manifestUrl);
          attachedRoomId = roomId;
        }
        return;
      }

      player.destroy();
      attachedRoomId = "";
      video.removeAttribute("src");
      video.load();
      streamStatus.hidden = false;
      streamStatus.textContent = streamStatusMessage(
        status?.stream ?? "unknown",
      );
      window.setTimeout(() => {
        void attachStreamWhenReady(roomId);
      }, 1000);
    };

    const switchRoom = async (roomId: string): Promise<void> => {
      activeRoomId = roomId;
      renderer.clear();
      await attachStreamWhenReady(roomId);
      client.connect(roomId);
    };

    const initialRoomId =
      new URLSearchParams(location.search).get("room") ?? rooms[0]?.id;
    if (initialRoomId !== undefined) {
      roomSelect.value = initialRoomId;
      if (new URLSearchParams(location.search).get("room") === null) {
        history.replaceState(
          null,
          "",
          `/?room=${encodeURIComponent(initialRoomId)}`,
        );
      }
      await switchRoom(initialRoomId);
    }

    roomSelect.addEventListener("change", () => {
      void switchRoom(roomSelect.value);
    });

    playToggle.addEventListener("click", () => {
      if (video.paused) {
        void video.play();
      } else {
        video.pause();
      }
      updatePlayerControls();
    });

    muteToggle.addEventListener("click", () => {
      video.muted = !video.muted;
      updatePlayerControls();
    });

    fullscreenToggle.addEventListener("click", () => {
      if (document.fullscreenElement === null) {
        void stage.requestFullscreen();
      } else {
        void document.exitFullscreen();
      }
    });

    video.addEventListener("play", updatePlayerControls);
    video.addEventListener("pause", updatePlayerControls);
    video.addEventListener("volumechange", updatePlayerControls);
    updatePlayerControls();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const request: CommentCreateRequest = {
        body: body.value,
        direction: selectedDirection.current,
        color: selectedColor.current,
        fontSize: selectedSize.current,
      };
      client.send(request);
      body.value = "";
    });

    body.addEventListener("keydown", (event) => {
      if (!isCommentSubmitShortcut(event)) {
        return;
      }
      event.preventDefault();
      form.requestSubmit();
    });
  }

  private renderDirectionChoices(direction: HTMLElement): {
    current: CommentDirection;
  } {
    const selectedDirection = {
      current: "rightToLeft" as CommentDirection,
    };
    for (const item of commentDirections) {
      direction.append(
        choiceLabel({
          checked: item === selectedDirection.current,
          name: "comment-direction",
          text: directionLabel(item),
          value: item,
          onChange: () => {
            selectedDirection.current = item;
          },
        }),
      );
    }
    return selectedDirection;
  }

  private renderSizeChoices(size: HTMLElement): { current: CommentFontSize } {
    const choices: { label: string; value: CommentFontSize }[] = [
      { label: "小", value: "small" },
      { label: "中", value: "medium" },
      { label: "大", value: "large" },
    ];
    const selectedSize = { current: "medium" as CommentFontSize };
    for (const choice of choices) {
      size.append(
        choiceLabel({
          checked: choice.value === selectedSize.current,
          name: "comment-size",
          text: choice.label,
          value: choice.value,
          onChange: () => {
            selectedSize.current = choice.value;
          },
        }),
      );
    }
    return selectedSize;
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

function choiceLabel<T extends string>(choice: {
  checked: boolean;
  name: string;
  onChange: () => void;
  text: string;
  value: T;
}): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "choice-chip";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = choice.name;
  input.value = choice.value;
  input.checked = choice.checked;
  input.addEventListener("change", () => {
    if (input.checked) {
      choice.onChange();
    }
  });

  const text = document.createElement("span");
  text.textContent = choice.text;

  label.append(input, text);
  return label;
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
