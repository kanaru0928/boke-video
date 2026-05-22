import { describe, expect, it } from "vitest";
import {
  buildObsWebsocketUrl,
  defaultObsWebsocketConnectionSettings,
  normalizeObsWebsocketPassword,
  readObsWebsocketConnectionSettings,
  saveObsWebsocketConnectionSettings,
} from "./obs_websocket_connection";

describe("buildObsWebsocketUrl", () => {
  it("サーバーIPとポートからOBS WebSocket URLを組み立てる", () => {
    expect(
      buildObsWebsocketUrl({
        serverIp: "192.168.1.19",
        serverPort: "4455",
      }),
    ).toBe("ws://192.168.1.19:4455");
  });

  it("空欄はOBS WebSocketの既定値で補う", () => {
    expect(buildObsWebsocketUrl({ serverIp: "", serverPort: "" })).toBe(
      "ws://127.0.0.1:4455",
    );
  });
});

describe("normalizeObsWebsocketPassword", () => {
  it("空欄は認証なしとして扱う", () => {
    expect(normalizeObsWebsocketPassword(" ")).toBeUndefined();
  });

  it("入力されたパスワードの前後空白を除く", () => {
    expect(normalizeObsWebsocketPassword(" password ")).toBe("password");
  });
});

describe("OBS WebSocket接続情報の保存", () => {
  it("保存した接続情報を読み込む", () => {
    const storage = new MemoryStorage();
    saveObsWebsocketConnectionSettings(storage, {
      serverIp: " 192.168.1.19 ",
      serverPassword: "2cR0HCXh4bBXGN",
      serverPort: " 4455 ",
    });

    expect(readObsWebsocketConnectionSettings(storage)).toEqual({
      serverIp: "192.168.1.19",
      serverPassword: "2cR0HCXh4bBXGN",
      serverPort: "4455",
    });
  });

  it("保存値が壊れている場合は既定値を返す", () => {
    const storage = new MemoryStorage();
    storage.setItem("boke-video:admin:obs-websocket-connection", "{");

    expect(readObsWebsocketConnectionSettings(storage)).toEqual(
      defaultObsWebsocketConnectionSettings,
    );
  });
});

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}
