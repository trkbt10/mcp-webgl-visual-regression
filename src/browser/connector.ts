import puppeteer from "puppeteer";
import type { BrowserInstance, BrowserLaunchOptions } from "./types.js";
import { launchBrowser } from "./launcher.js";

export const connectToBrowser = async (
  debugPort: number,
): Promise<BrowserInstance | undefined> => {
  try {
    const browserURL = `http://localhost:${debugPort}`;
    const browser = await puppeteer.connect({ browserURL });
    
    const pages = await browser.pages();
    let page = pages[0];
    
    if (!page) {
      page = await browser.newPage();
    }

    return {
      browser,
      page,
      debugPort,
    };
  } catch (error) {
    console.error(`Failed to connect to browser on port ${debugPort}:`, error);
    return undefined;
  }
};

export const reuseOrLaunch = async (
  options: BrowserLaunchOptions = {},
): Promise<BrowserInstance> => {
  const { debugPort = 9222 } = options;

  // Try to connect to existing browser first
  const existingBrowser = await connectToBrowser(debugPort);
  if (existingBrowser) {
    console.log(`Connected to existing browser on port ${debugPort}`);
    
    // Navigate to URL if provided
    if (options.url) {
      await existingBrowser.page.goto(options.url);
    }
    
    // Update viewport if provided
    if (options.viewport) {
      await existingBrowser.page.setViewport(options.viewport);
    }
    
    return existingBrowser;
  }

  // Launch new browser if connection failed
  console.log(`Launching new browser on port ${debugPort}`);
  return launchBrowser({ ...options, debugPort });
};