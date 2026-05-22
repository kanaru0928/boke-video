import { describe, expect, it } from "vitest";
import { buildObsWhipStreamServiceSettings } from "./obs_stream_service";

describe("buildObsWhipStreamServiceSettings", () => {
  it("builds WHIP stream service settings for OBS", () => {
    expect(
      buildObsWhipStreamServiceSettings(
        "https://example.com/whip/room-1",
        "token-1",
      ),
    ).toEqual({
      streamServiceType: "whip_custom",
      streamServiceSettings: {
        bearer_token: "token-1",
        server: "https://example.com/whip/room-1",
      },
    });
  });
});
