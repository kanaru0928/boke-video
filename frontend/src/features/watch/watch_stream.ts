export function buildWhepUrl(streamBaseUrl: string, roomId: string): string {
  const baseUrl = streamBaseUrl.replace(/\/+$/, "");
  return `${baseUrl}/live/${encodeURIComponent(roomId)}/whep`;
}

export function streamStatusMessage(): string {
  return "配信を準備しています";
}
