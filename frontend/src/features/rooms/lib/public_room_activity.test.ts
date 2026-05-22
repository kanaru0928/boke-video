import { describe, expect, it } from "vitest";
import { formatStartedAgo } from "./public_room_activity";

describe("formatStartedAgo", () => {
  it("開始からの経過を秒なしで表示する", () => {
    expect(formatStartedAgo(0)).toBe("1分未満前に開始");
    expect(formatStartedAgo(59)).toBe("1分未満前に開始");
    expect(formatStartedAgo(60)).toBe("1分前に開始");
    expect(formatStartedAgo(1808)).toBe("30分前に開始");
    expect(formatStartedAgo(3600)).toBe("1時間前に開始");
    expect(formatStartedAgo(3900)).toBe("1時間5分前に開始");
  });
});
