import { describe, expect, it } from "vitest";
import {
  canSaveAdminRoomTitle,
  normalizeAdminRoomTitle,
} from "./admin_room_title";

describe("normalizeAdminRoomTitle", () => {
  it("前後の空白を削除する", () => {
    expect(normalizeAdminRoomTitle("  test room  ")).toBe("test room");
  });
});

describe("canSaveAdminRoomTitle", () => {
  it("trimした結果が空の場合は保存できない", () => {
    expect(canSaveAdminRoomTitle("   ", "test room")).toBe(false);
  });

  it("trimした結果が現在のタイトルと同じ場合は保存できない", () => {
    expect(canSaveAdminRoomTitle("  test room  ", "test room")).toBe(false);
  });

  it("trimした結果が現在のタイトルと違う場合は保存できる", () => {
    expect(canSaveAdminRoomTitle("new room", "test room")).toBe(true);
  });
});
