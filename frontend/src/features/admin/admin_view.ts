import type { AppConfig } from "../../shared/config/config";
import {
  createRoom,
  deleteComment,
  fetchComments,
  fetchRoomStreamStatus,
  fetchRooms,
  type Room,
  updateRoomTitle,
} from "../rooms/room_api";

export class AdminView {
  private readonly root: HTMLElement;
  private readonly list: HTMLElement;
  private readonly form: HTMLFormElement;
  private readonly titleInput: HTMLInputElement;

  constructor(
    root: HTMLElement,
    private readonly config: AppConfig,
  ) {
    this.root = root;
    this.root.innerHTML = `
      <section class="admin-shell">
        <header class="topbar">
          <h1>管理</h1>
          <a class="link-button" href="/">視聴画面</a>
        </header>
        <form class="admin-form" id="room-form">
          <input id="room-title" type="text" maxlength="80" placeholder="ルーム名" required />
          <button type="submit">作成</button>
        </form>
        <section class="admin-list" id="room-list"></section>
      </section>
    `;

    const list = this.root.querySelector("#room-list");
    const form = this.root.querySelector("#room-form");
    const titleInput = this.root.querySelector("#room-title");
    if (
      !(list instanceof HTMLElement) ||
      !(form instanceof HTMLFormElement) ||
      !(titleInput instanceof HTMLInputElement)
    ) {
      throw new Error("admin elements are missing");
    }
    this.list = list;
    this.form = form;
    this.titleInput = titleInput;
  }

  async mount(): Promise<void> {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.createRoom();
    });
    await this.renderRooms();
  }

  private async createRoom(): Promise<void> {
    const title = this.titleInput.value.trim();
    if (title === "") {
      return;
    }
    const room = await createRoom(this.config, title);
    if (room === null) {
      return;
    }
    this.titleInput.value = "";
    await this.renderRooms();
  }

  private async renderRooms(): Promise<void> {
    const rooms = await fetchRooms(this.config);
    this.list.replaceChildren(...rooms.map((room) => this.roomElement(room)));
  }

  private roomElement(room: Room): HTMLElement {
    const article = document.createElement("article");
    article.className = "admin-room";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = room.title;
    titleInput.maxLength = 80;
    titleInput.ariaLabel = "ルーム名";

    const id = document.createElement("p");
    id.textContent = room.id;

    const link = document.createElement("a");
    link.href = `/?room=${encodeURIComponent(room.id)}`;
    link.textContent = "開く";

    const status = document.createElement("p");
    status.className = "admin-status";
    status.textContent = "配信状態: 確認中";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "保存";
    saveButton.addEventListener("click", () => {
      void this.updateRoom(room.id, titleInput.value);
    });

    const commentsButton = document.createElement("button");
    commentsButton.type = "button";
    commentsButton.textContent = "コメント";
    commentsButton.addEventListener("click", () => {
      void this.renderComments(room.id, article);
    });

    article.append(titleInput, id, status, link, saveButton, commentsButton);
    void this.renderRoomStatus(room.id, status);
    return article;
  }

  private async updateRoom(roomId: string, title: string): Promise<void> {
    const updatedRoom = await updateRoomTitle(
      this.config,
      roomId,
      title.trim(),
    );
    if (updatedRoom === null) {
      return;
    }
    await this.renderRooms();
  }

  private async renderRoomStatus(
    roomId: string,
    statusElement: HTMLElement,
  ): Promise<void> {
    const status = await fetchRoomStreamStatus(this.config, roomId);
    if (status === null) {
      statusElement.textContent = "配信状態: 取得失敗";
      return;
    }
    statusElement.textContent = `配信状態: ${streamStatusLabel(status.stream)}`;
  }

  private async renderComments(
    roomId: string,
    roomElement: HTMLElement,
  ): Promise<void> {
    const comments = await fetchComments(this.config, roomId);
    const existingList = roomElement.querySelector(".admin-comments");
    if (existingList instanceof HTMLElement) {
      existingList.remove();
    }

    const list = document.createElement("section");
    list.className = "admin-comments";
    for (const comment of comments) {
      const row = document.createElement("article");
      row.className = "admin-comment";

      const body = document.createElement("p");
      body.textContent = comment.body;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "削除";
      deleteButton.addEventListener("click", async () => {
        if (await deleteComment(this.config, comment.commentId)) {
          row.remove();
        }
      });

      row.append(body, deleteButton);
      list.append(row);
    }
    roomElement.append(list);
  }
}

function streamStatusLabel(status: "ready" | "stale" | "missing"): string {
  switch (status) {
    case "ready":
      return "配信中";
    case "stale":
      return "停止中";
    case "missing":
      return "未生成";
  }
}
