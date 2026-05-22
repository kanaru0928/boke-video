type VideoPresentationMode = "fullscreen" | "inline" | "picture-in-picture";

type WebKitFullscreenVideoElement = HTMLVideoElement & {
  webkitDisplayingFullscreen?: boolean;
  webkitEnterFullscreen?: () => void;
};

type WebKitPresentationVideoElement = HTMLVideoElement & {
  webkitPresentationMode?: VideoPresentationMode;
  webkitSetPresentationMode?: (mode: VideoPresentationMode) => void;
  webkitSupportsPresentationMode?: (mode: VideoPresentationMode) => boolean;
};

export function canEnterElementFullscreen(
  element: HTMLElement | null,
): element is HTMLElement {
  return typeof element?.requestFullscreen === "function";
}

function canEnterVideoFullscreen(video: HTMLVideoElement | null): boolean {
  return (
    typeof getWebKitFullscreenVideo(video)?.webkitEnterFullscreen === "function"
  );
}

export function canToggleFullscreen(
  stage: HTMLElement | null,
  video: HTMLVideoElement | null,
): boolean {
  return canEnterElementFullscreen(stage) || canEnterVideoFullscreen(video);
}

export function enterVideoFullscreen(video: HTMLVideoElement | null): void {
  getWebKitFullscreenVideo(video)?.webkitEnterFullscreen?.();
}

export function isVideoFullscreen(video: HTMLVideoElement | null): boolean {
  return getWebKitFullscreenVideo(video)?.webkitDisplayingFullscreen === true;
}

function canUseStandardPictureInPicture(
  ownerDocument: Document,
  video: HTMLVideoElement | null,
): boolean {
  return (
    ownerDocument.pictureInPictureEnabled === true &&
    video !== null &&
    video.disablePictureInPicture !== true &&
    typeof video.requestPictureInPicture === "function"
  );
}

function canUseWebKitPictureInPicture(video: HTMLVideoElement | null): boolean {
  const webKitVideo = getWebKitPresentationVideo(video);
  return (
    typeof webKitVideo?.webkitSupportsPresentationMode === "function" &&
    typeof webKitVideo.webkitSetPresentationMode === "function" &&
    webKitVideo.webkitSupportsPresentationMode("picture-in-picture")
  );
}

export function canTogglePictureInPicture(
  ownerDocument: Document,
  video: HTMLVideoElement | null,
): boolean {
  return (
    canUseStandardPictureInPicture(ownerDocument, video) ||
    canUseWebKitPictureInPicture(video)
  );
}

export function isPictureInPictureActive(
  ownerDocument: Document,
  video: HTMLVideoElement | null,
): boolean {
  return (
    ownerDocument.pictureInPictureElement === video ||
    getWebKitPresentationVideo(video)?.webkitPresentationMode ===
      "picture-in-picture"
  );
}

export async function enterPictureInPicture(
  ownerDocument: Document,
  video: HTMLVideoElement | null,
): Promise<void> {
  if (video === null || isPictureInPictureActive(ownerDocument, video)) {
    return;
  }
  if (canUseStandardPictureInPicture(ownerDocument, video)) {
    await video.requestPictureInPicture();
    return;
  }
  setWebKitPictureInPictureMode(video);
}

export function toggleWebKitPictureInPicture(
  video: HTMLVideoElement | null,
): void {
  const webKitVideo = getWebKitPresentationVideo(video);
  if (typeof webKitVideo?.webkitSetPresentationMode !== "function") {
    return;
  }
  const nextMode =
    webKitVideo.webkitPresentationMode === "picture-in-picture"
      ? "inline"
      : "picture-in-picture";
  webKitVideo.webkitSetPresentationMode(nextMode);
}

function setWebKitPictureInPictureMode(video: HTMLVideoElement): void {
  const webKitVideo = getWebKitPresentationVideo(video);
  if (typeof webKitVideo?.webkitSetPresentationMode !== "function") {
    return;
  }
  webKitVideo.webkitSetPresentationMode("picture-in-picture");
}

function getWebKitFullscreenVideo(
  video: HTMLVideoElement | null,
): WebKitFullscreenVideoElement | null {
  return video;
}

function getWebKitPresentationVideo(
  video: HTMLVideoElement | null,
): WebKitPresentationVideoElement | null {
  return video;
}
