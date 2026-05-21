import { type RefObject, useEffect, useRef, useState } from "react";

type UseSettingsPopoverResult = {
  settingsOpen: boolean;
  settingsRef: RefObject<HTMLDivElement | null>;
  toggleSettings: () => void;
};

export function useSettingsPopover(): UseSettingsPopoverResult {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    const closeSettingsOnOutsidePointerDown = (event: PointerEvent): void => {
      const settings = settingsRef.current;
      if (
        settings === null ||
        !(event.target instanceof Node) ||
        settings.contains(event.target)
      ) {
        return;
      }
      setSettingsOpen(false);
    };
    document.addEventListener("pointerdown", closeSettingsOnOutsidePointerDown);
    return () => {
      document.removeEventListener(
        "pointerdown",
        closeSettingsOnOutsidePointerDown,
      );
    };
  }, [settingsOpen]);

  const toggleSettings = (): void => {
    setSettingsOpen((current) => !current);
  };

  return { settingsOpen, settingsRef, toggleSettings };
}
