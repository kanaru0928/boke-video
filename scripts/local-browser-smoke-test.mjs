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
    directionLabel: "上固定",
    expectedClass: "comment-fixedTop",
    sizeLabel: "大",
    sizeClass: "comment-size-large",
    viewport: { width: 1280, height: 800 },
    text: "desktop shortcut comment",
    shortcut: "Meta+Enter",
  });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await runCommentSmoke({
    browser,
    directionLabel: "下固定",
    expectedClass: "comment-fixedBottom",
    sizeLabel: "小",
    sizeClass: "comment-size-small",
    viewport: { width: 390, height: 844 },
    text: "mobile shortcut comment",
    shortcut: "Control+Enter",
  });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await assertVerticalCommentsStartOutside(browser);
} finally {
  await browser.close();
}

async function runCommentSmoke({
  browser,
  directionLabel,
  expectedClass,
  sizeLabel,
  sizeClass,
  viewport,
  text,
  shortcut,
}) {
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
  await assertCommentControlsFit(page);
  await clickChoice(page, directionLabel);
  await clickChoice(page, sizeLabel);

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
    className: element.className,
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
    travel.className.includes(expectedClass),
    `comment direction class mismatch: ${JSON.stringify(travel)}`,
  );
  assert(
    travel.className.includes(sizeClass),
    `comment size class mismatch: ${JSON.stringify(travel)}`,
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

async function clickChoice(page, label) {
  const choice = page.locator(".choice-chip", { hasText: label });
  const count = await choice.count();
  assert(count === 1, `choice count mismatch: ${label} ${count}`);
  await choice.click();
}

async function assertVerticalCommentsStartOutside(browser) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await page.goto(watchUrl, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: ".comment { animation-play-state: paused !important; }",
  });
  await assertVideoCanPlay(page);

  await clickChoice(page, "上から下");
  await page.locator("#comment-body").fill("vertical top start");
  await page.locator("#comment-body").press("Meta+Enter");
  const topComment = page.locator(".comment", {
    hasText: "vertical top start",
  });
  await topComment.waitFor({ state: "attached", timeout: 5000 });
  await assertVerticalPosition(page, topComment, "topToBottom");

  await new Promise((resolve) => setTimeout(resolve, 1100));
  await clickChoice(page, "下から上");
  await page.locator("#comment-body").fill("vertical bottom start");
  await page.locator("#comment-body").press("Meta+Enter");
  const bottomComment = page.locator(".comment", {
    hasText: "vertical bottom start",
  });
  await bottomComment.waitFor({ state: "attached", timeout: 5000 });
  await assertVerticalPosition(page, bottomComment, "bottomToTop");

  await page.close();
}

async function assertVerticalPosition(page, comment, direction) {
  const videoBox = await page.locator("video").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { bottom: rect.bottom, top: rect.top };
  });
  const commentBox = await comment.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      className: element.className,
      top: rect.top,
    };
  });
  if (direction === "topToBottom") {
    assert(
      commentBox.bottom <= videoBox.top + 1,
      `top-to-bottom comment starts inside video: ${JSON.stringify({ commentBox, videoBox })}`,
    );
    return;
  }
  assert(
    commentBox.top >= videoBox.bottom - 1,
    `bottom-to-top comment starts inside video: ${JSON.stringify({ commentBox, videoBox })}`,
  );
}

async function assertCommentControlsFit(page) {
  const result = await page.locator(".side-panel").evaluate((element) => ({
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
  }));
  assert(
    result.scrollWidth <= result.clientWidth,
    `comment controls overflow: ${JSON.stringify(result)}`,
  );
  assert(
    result.scrollHeight <= result.clientHeight,
    `comment controls require internal scroll: ${JSON.stringify(result)}`,
  );
  const compose = await page.locator(".comment-compose").evaluate((element) => {
    const textarea = element.querySelector("textarea");
    const button = element.querySelector("button");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("comment textarea is missing");
    }
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("comment submit button is missing");
    }
    const textareaRect = textarea.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      buttonLeft: buttonRect.left,
      textareaRight: textareaRect.right,
      topDiff: Math.abs(textareaRect.top - buttonRect.top),
    };
  });
  assert(
    compose.buttonLeft >= compose.textareaRight,
    `submit button is not beside textarea: ${JSON.stringify(compose)}`,
  );
  assert(
    compose.topDiff < 1,
    `submit button is not aligned with textarea: ${JSON.stringify(compose)}`,
  );
  const directionSelectCount = await page
    .locator("select#comment-direction")
    .count();
  const sizeSelectCount = await page.locator("select#comment-size").count();
  assert(directionSelectCount === 0, "direction still uses select");
  assert(sizeSelectCount === 0, "size still uses select");
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
