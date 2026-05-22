import { useLayoutEffect } from "react";

type LockedBodyStyle = {
  left: string;
  overflow: "hidden";
  position: "fixed";
  top: string;
  width: "100%";
};

export function lockedBodyStyle(
  scrollX: number,
  scrollY: number,
): LockedBodyStyle {
  return {
    left: `-${scrollX}px`,
    overflow: "hidden",
    position: "fixed",
    top: `-${scrollY}px`,
    width: "100%",
  };
}

export function useDocumentScrollLock(): void {
  useLayoutEffect(() => {
    const { body, documentElement } = document;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const nextBodyStyle = lockedBodyStyle(scrollX, scrollY);
    const previousBodyStyle = {
      left: body.style.left,
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    const previousDocumentOverflow = documentElement.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.left = nextBodyStyle.left;
    body.style.overflow = nextBodyStyle.overflow;
    body.style.position = nextBodyStyle.position;
    body.style.top = nextBodyStyle.top;
    body.style.width = nextBodyStyle.width;

    return () => {
      documentElement.style.overflow = previousDocumentOverflow;
      body.style.left = previousBodyStyle.left;
      body.style.overflow = previousBodyStyle.overflow;
      body.style.position = previousBodyStyle.position;
      body.style.top = previousBodyStyle.top;
      body.style.width = previousBodyStyle.width;
      window.scrollTo(scrollX, scrollY);
    };
  }, []);
}
