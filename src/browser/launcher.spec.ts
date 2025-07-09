import { describe, it, expect, afterEach } from "bun:test";
import { launchBrowser } from "./launcher.js";
import type { Browser } from "puppeteer";

describe("launchBrowser", () => {
  let browser: Browser | undefined;

  afterEach(async () => {
    if (browser) {
      await browser.close();
      browser = undefined;
    }
  });

  it("should launch a browser with default options", async () => {
    const instance = await launchBrowser();
    browser = instance.browser;

    expect(instance.browser).toBeDefined();
    expect(instance.page).toBeDefined();
    expect(await instance.page.url()).toBe("about:blank");
  });

  it("should launch a browser with custom URL", async () => {
    const instance = await launchBrowser({
      url: "https://webglsamples.org/aquarium/aquarium.html",
    });
    browser = instance.browser;

    expect(await instance.page.url()).toContain("webglsamples.org");
  });

  it("should set custom viewport", async () => {
    const viewport = { width: 1920, height: 1080 };
    const instance = await launchBrowser({ viewport });
    browser = instance.browser;

    const actualViewport = instance.page.viewport();
    expect(actualViewport?.width).toBe(1920);
    expect(actualViewport?.height).toBe(1080);
  });

  it("should enable WebGL context tracking", async () => {
    const instance = await launchBrowser();
    browser = instance.browser;

    await instance.page.evaluate(() => {
      const canvas = document.createElement("canvas");
      document.body.appendChild(canvas);
      const gl = canvas.getContext("webgl");
      return !!(window as any).__webglContext;
    });

    const hasWebGLContext = await instance.page.evaluate(() => {
      return !!(window as any).__webglContext;
    });

    expect(hasWebGLContext).toBe(true);
  });
});