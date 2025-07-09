import type { Page } from "puppeteer";
import { promises as fs } from "fs";
import path from "path";
import type { ScreenshotOptions, ScreenshotResult } from "./types.js";
import { ensureDirectory, generateTimestamp, sanitizeFilename } from "../utils/file.js";

const SCREENSHOTS_DIR = path.join(process.cwd(), "screenshots");

export const captureScreenshot = async (
  page: Page,
  options: ScreenshotOptions = {},
): Promise<ScreenshotResult> => {
  const {
    testCase = "screenshot",
    format = "png",
    fullPage = false,
    encoding = "binary",
    quality,
    selector,
    captureCanvas = false,
  } = options;

  // Ensure screenshots directory exists
  await ensureDirectory(SCREENSHOTS_DIR);

  // Generate filename
  const timestamp = generateTimestamp();
  const sanitizedTestCase = sanitizeFilename(testCase);
  const filename = `${sanitizedTestCase}_${timestamp}.${format}`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  // Prepare screenshot options
  const screenshotOptions: any = {
    path: filepath,
    type: format,
  };

  if (format === "jpeg" && quality !== undefined) {
    screenshotOptions.quality = quality;
  }

  let screenshotResult;

  // Handle element-specific or canvas-specific capture
  if (selector || captureCanvas) {
    const targetSelector = captureCanvas ? "canvas" : selector;
    
    // Wait for the element to be visible
    try {
      await page.waitForSelector(targetSelector!, { visible: true, timeout: 5000 });
    } catch (error) {
      throw new Error(`Element not found: ${targetSelector}`);
    }

    // Get the first matching element (or all canvas elements if captureCanvas is true)
    const element = await page.$(targetSelector!);
    if (!element) {
      throw new Error(`No element found matching selector: ${targetSelector}`);
    }

    // Capture the element
    screenshotResult = await element.screenshot(screenshotOptions);
  } else {
    // Full page or viewport screenshot
    screenshotOptions.fullPage = fullPage;
    screenshotResult = await page.screenshot(screenshotOptions);
  }
  
  if (!screenshotResult) {
    throw new Error('Failed to capture screenshot');
  }

  // Get viewport info
  const viewport = page.viewport();

  // Prepare result based on encoding
  let data: string | Buffer;
  if (encoding === "base64") {
    if (typeof screenshotResult === 'string') {
      data = screenshotResult;
    } else {
      data = (screenshotResult as Buffer).toString("base64");
    }
  } else {
    if (typeof screenshotResult === 'string') {
      throw new Error('Cannot return binary data when screenshot returns string');
    }
    data = screenshotResult as Buffer;
  }

  const result: ScreenshotResult = {
    path: filepath,
    filename,
    data,
    timestamp: new Date(),
    metadata: {
      testCase,
      viewport: {
        width: viewport?.width || 0,
        height: viewport?.height || 0,
      },
    },
  };

  return result;
};

export const saveScreenshotMetadata = async (result: ScreenshotResult): Promise<void> => {
  const metadataPath = result.path.replace(/\.(png|jpeg)$/, ".json");
  const metadata = {
    ...result.metadata,
    timestamp: result.timestamp.toISOString(),
    filename: result.filename,
  };

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
};