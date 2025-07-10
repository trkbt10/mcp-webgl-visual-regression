import { test, expect, beforeEach, afterEach } from "bun:test";
import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";
import { browserManager } from "./manager.js";
import type { BrowserInstance } from "./types.js";

let testBrowser: Browser;
let testInstance: BrowserInstance;

beforeEach(async () => {
  testBrowser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  testInstance = {
    browser: testBrowser,
    debugPort: 9222,
  };
});

afterEach(async () => {
  // Clean up all instances
  await browserManager.closeAll();
  
  if (testBrowser && testBrowser.isConnected()) {
    await testBrowser.close();
  }
});

test("should automatically close browser after idle timeout", async () => {
  const testId = "test-browser-idle";
  
  await browserManager.addInstance(testId, testInstance, {
    enabled: true,
    idleTimeout: 10 * 1000, // 10 seconds
    checkInterval: 2 * 1000, // Check every 2 seconds
  });

  // Verify instance was added
  expect(browserManager.getInstance(testId)).toBeDefined();

  // Wait for idle timeout to trigger
  await new Promise((resolve) => setTimeout(resolve, 12 * 1000));

  // Instance should be removed after idle timeout
  expect(browserManager.getInstance(testId)).toBeUndefined();
  expect(testBrowser.isConnected()).toBe(false);
}, 15000); // 15 second test timeout

test("should not close browser when monitoring is disabled", async () => {
  const testId = "test-browser-no-monitor";
  
  await browserManager.addInstance(testId, testInstance, {
    enabled: false,
  });

  // Verify instance was added
  expect(browserManager.getInstance(testId)).toBeDefined();

  // Wait for what would be idle timeout
  await new Promise((resolve) => setTimeout(resolve, 5 * 1000));

  // Instance should still exist
  expect(browserManager.getInstance(testId)).toBeDefined();
  expect(testBrowser.isConnected()).toBe(true);
}, 10000);

test("should use custom timeout values", async () => {
  const testId = "test-browser-custom-timeout";
  let closedTime = 0;
  const startTime = Date.now();
  
  // Override browser close to track when it happens
  const originalClose = testBrowser.close.bind(testBrowser);
  testBrowser.close = async () => {
    closedTime = Date.now() - startTime;
    await originalClose();
  };

  await browserManager.addInstance(testId, testInstance, {
    enabled: true,
    idleTimeout: 5 * 1000, // 5 seconds
    checkInterval: 1 * 1000, // Check every 1 second
  });

  // Wait for idle timeout to trigger
  await new Promise((resolve) => setTimeout(resolve, 7 * 1000));

  // Should have closed after approximately 5 seconds
  expect(closedTime).toBeGreaterThan(4500);
  expect(closedTime).toBeLessThan(6500);
}, 10000);