type SettingsPopoverAnchorRect = {
  right: number;
  top: number;
};

type SettingsPopoverViewport = {
  height: number;
  width: number;
};

type SettingsPopoverPosition = {
  bottom: number;
  right: number;
};

const viewportMargin = 6;
const anchorGap = 6;

export function settingsPopoverPosition(
  anchorRect: SettingsPopoverAnchorRect,
  viewport: SettingsPopoverViewport,
): SettingsPopoverPosition {
  return {
    bottom: Math.max(
      viewportMargin,
      viewport.height - anchorRect.top + anchorGap,
    ),
    right: Math.max(viewportMargin, viewport.width - anchorRect.right),
  };
}
