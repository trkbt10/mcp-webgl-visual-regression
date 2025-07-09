import type { Browser, Page } from "puppeteer";

export type BrowserLaunchOptions = {
  url?: string;
  viewport?: {
    width: number;
    height: number;
  };
  debugPort?: number;
  webglOptions?: {
    ignoreGpuBlocklist?: boolean;
  };
  headless?: boolean;
};

export type BrowserConnection = {
  browserWSEndpoint: string;
  sessionId: string;
};

export type BrowserInstance = {
  browser: Browser;
  page: Page;
  debugPort?: number;
};
