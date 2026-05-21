import { describe, expect, it } from "vitest";
import { isUserProfile } from "./user_api";

describe("isUserProfile", () => {
  it("ユーザープロフィール形式だけを受け入れる", () => {
    expect(
      isUserProfile({
        subject: "user-1",
        displayName: "表示名",
        updatedAt: "2026-05-21T00:00:00Z",
      }),
    ).toBe(true);
    expect(
      isUserProfile({
        subject: "user-1",
        displayName: "表示名",
      }),
    ).toBe(false);
  });
});
