export function isFullscreenShortcut(event: {
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  target: EventTarget | null;
}): boolean {
  return (
    event.key.toLowerCase() === "f" &&
    !event.metaKey &&
    !event.ctrlKey &&
    !isEditableTarget(event.target)
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof target !== "object" || target === null) {
    return false;
  }
  const element = target as {
    isContentEditable?: unknown;
    nodeName?: unknown;
  };
  const nodeName =
    typeof element.nodeName === "string" ? element.nodeName.toUpperCase() : "";
  return (
    element.isContentEditable === true ||
    nodeName === "INPUT" ||
    nodeName === "SELECT" ||
    nodeName === "TEXTAREA"
  );
}
