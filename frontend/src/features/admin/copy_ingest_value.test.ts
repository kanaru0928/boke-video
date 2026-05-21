import { describe, expect, it } from "vitest";
import { normalizeIngestClipboardValue } from "./copy_ingest_value";

describe("normalizeIngestClipboardValue", () => {
  it("コピー値から空白と改行を取り除く", () => {
    expect(
      normalizeIngestClipboardValue("  http://localhost:8080/live/id\n"),
    ).toBe("http://localhost:8080/live/id");
    expect(normalizeIngestClipboardValue("abc def\tghi\n")).toBe("abcdefghi");
  });
});
