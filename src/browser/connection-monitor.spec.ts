import { test, expect, beforeEach, afterEach } from "bun:test";
import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";
import { createConnectionMonitor } from "./connection-monitor.js";

let browser: Browser;

beforeEach(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

afterEach(async () => {
  if (browser) {
    await browser.close();
  }
});

test("should trigger idle timeout when no connections for specified duration", async () => {
  let timeoutTriggered = false;
  
  const monitor = createConnectionMonitor(browser, {
    idleTimeout: 30 * 1000, // 30 seconds for testing
    checkInterval: 5 * 1000, // Check every 5 seconds
    onIdleTimeout: async () => {
      timeoutTriggered = true;
    },
  });

  await monitor.start();

  // Wait for idle timeout to trigger (should happen after 30 seconds)
  await new Promise((resolve) => setTimeout(resolve, 35 * 1000));

  expect(timeoutTriggered).toBe(true);
  monitor.stop();
}, 40000); // 40 second test timeout

test("should reset idle timer when connections are active", async () => {
  let timeoutTriggered = false;
  
  const monitor = createConnectionMonitor(browser, {
    idleTimeout: 10 * 1000, // 10 seconds for testing
    checkInterval: 2 * 1000, // Check every 2 seconds
    onIdleTimeout: async () => {
      timeoutTriggered = true;
    },
  });

  await monitor.start();

  // Create a page to keep connection active
  const page = await browser.newPage();

  // Wait for 8 seconds (less than idle timeout)
  await new Promise((resolve) => setTimeout(resolve, 8 * 1000));

  // Close the page
  await page.close();

  // Now wait for idle timeout to trigger (should happen 10 seconds after page close)
  await new Promise((resolve) => setTimeout(resolve, 12 * 1000));

  expect(timeoutTriggered).toBe(true);
  monitor.stop();
}, 25000); // 25 second test timeout

test("should track idle duration correctly", async () => {
  const monitor = createConnectionMonitor(browser, {
    idleTimeout: 60 * 1000,
    checkInterval: 10 * 1000,
  });

  await monitor.start();

  const initialDuration = monitor.getIdleDuration();
  expect(initialDuration).toBeLessThan(100); // Should be very small

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const laterDuration = monitor.getIdleDuration();
  expect(laterDuration).toBeGreaterThan(1900);
  expect(laterDuration).toBeLessThan(2200);

  monitor.stop();
});