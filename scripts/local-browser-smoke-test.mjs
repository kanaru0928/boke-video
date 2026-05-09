import { chromium } from "@playwright/test";

const watchUrl = process.env.WATCH_URL;

if (watchUrl === undefined || watchUrl === "") {
  throw new Error("WATCH_URL is required");
}

const browser = await chromium.launch();
try {
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await runCommentSmoke({
    browser,
    viewport: { width: 1280, height: 800 },
    text: "desktop shortcut comment",
    shortcut: "Meta+Enter",
  });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await runCommentSmoke({
    browser,
    viewport: { width: 390, height: 844 },
    text: "mobile shortcut comment",
    shortcut: "Control+Enter",
  });
} finally {
  await browser.close();
}

async function runCommentSmoke({ browser, viewport, text, shortcut }) {
  const page = await browser.newPage({ viewport });
  const liveResponses = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/live/")) {
      liveResponses.push({ status: response.status(), url });
    }
  });

  await page.goto(watchUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#comment-body");

  await assertCommentLayerMatchesStage(page);
  await assertVideoCanPlay(page);

  await page.locator("#comment-body").fill(text);
  await page.locator("#comment-body").press(shortcut);
  await page.locator(".comment", { hasText: text }).waitFor({
    state: "visible",
    timeout: 5000,
  });

  const commentLocator = page.locator(".comment", { hasText: text });
  const commentBox = await commentLocator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    };
  });
  const travel = await commentLocator.evaluate((element) => ({
    x: getComputedStyle(element).getPropertyValue("--comment-travel-x").trim(),
    y: getComputedStyle(element).getPropertyValue("--comment-travel-y").trim(),
  }));
  const videoBox = await page.locator("video").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      top: rect.top,
    };
  });

  assert(
    commentBox.top >= videoBox.top && commentBox.top <= videoBox.bottom,
    `comment top is outside video: ${JSON.stringify({ commentBox, videoBox })}`,
  );
  assert(commentBox.width > 0, "comment width is zero");
  assert(commentBox.height > 0, "comment height is zero");
  assert(
    travel.x !== "" && travel.x !== "0px",
    `comment horizontal travel is invalid: ${JSON.stringify(travel)}`,
  );
  assert(
    travel.y !== "" && travel.y !== "0px",
    `comment vertical travel is invalid: ${JSON.stringify(travel)}`,
  );
  assert(
    liveResponses.some(
      (entry) => entry.url.endsWith("/manifest.mpd") && entry.status === 200,
    ),
    "manifest was not loaded",
  );
  assert(
    liveResponses.some(
      (entry) => entry.url.includes("chunk-stream") && entry.status === 200,
    ),
    "DASH chunks were not loaded",
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const historicalCommentCount = await page
    .locator(".comment", { hasText: text })
    .count();
  assert(
    historicalCommentCount === 0,
    `historical comments were animated after reload: ${historicalCommentCount}`,
  );

  await page.screenshot({
    path: `/tmp/boke-video-browser-smoke-${viewport.width}.png`,
    fullPage: true,
  });
  await page.close();
}

async function assertCommentLayerMatchesStage(page) {
  const boxes = await page.locator(".stage").evaluate((stage) => {
    const comments = stage.querySelector(".comments-layer");
    const video = stage.querySelector("video");
    if (!(comments instanceof HTMLElement)) {
      throw new Error("comments layer is missing");
    }
    if (!(video instanceof HTMLVideoElement)) {
      throw new Error("video element is missing");
    }
    const videoRect = video.getBoundingClientRect();
    const commentsRect = comments.getBoundingClientRect();
    return {
      comments: {
        bottom: commentsRect.bottom,
        height: commentsRect.height,
        left: commentsRect.left,
        right: commentsRect.right,
        top: commentsRect.top,
        width: commentsRect.width,
      },
      video: {
        bottom: videoRect.bottom,
        height: videoRect.height,
        left: videoRect.left,
        right: videoRect.right,
        top: videoRect.top,
        width: videoRect.width,
      },
    };
  });
  assert(
    Math.abs(boxes.comments.top - boxes.video.top) < 1 &&
      Math.abs(boxes.comments.bottom - boxes.video.bottom) < 1 &&
      Math.abs(boxes.comments.left - boxes.video.left) < 1 &&
      Math.abs(boxes.comments.right - boxes.video.right) < 1,
    `comments layer does not match video: ${JSON.stringify(boxes)}`,
  );
}

async function assertVideoCanPlay(page) {
  await page.waitForFunction(
    () => {
      const video = document.querySelector("video");
      return (
        video instanceof HTMLVideoElement &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      );
    },
    undefined,
    { timeout: 30000 },
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
