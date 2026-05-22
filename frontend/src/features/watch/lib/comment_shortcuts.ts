export function isCommentSubmitShortcut(event: {
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
}): boolean {
  return event.key === "Enter" && (event.metaKey || event.ctrlKey);
}
