export function normalizeAdminRoomTitle(title: string): string {
  return title.trim();
}

export function canSaveAdminRoomTitle(
  draftTitle: string,
  currentTitle: string,
): boolean {
  const nextTitle = normalizeAdminRoomTitle(draftTitle);

  return nextTitle.length > 0 && nextTitle !== currentTitle;
}
