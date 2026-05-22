import { describe, expect, it } from "vitest";
import { isOwnerProfileMessage } from "./comment_message";

describe("isOwnerProfileMessage", () => {
  it("配信者表示名更新メッセージを判定する", () => {
    expect(
      isOwnerProfileMessage({
        type: "ownerProfile",
        roomId: "room-1",
        ownerDisplayName: "配信者",
      }),
    ).toBe(true);
  });

  it("表示名がない場合は拒否する", () => {
    expect(
      isOwnerProfileMessage({
        type: "ownerProfile",
        roomId: "room-1",
      }),
    ).toBe(false);
  });
});
