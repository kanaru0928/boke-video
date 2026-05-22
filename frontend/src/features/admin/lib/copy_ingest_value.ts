export function normalizeIngestClipboardValue(value: string): string {
  return value.replace(/\s+/g, "");
}
