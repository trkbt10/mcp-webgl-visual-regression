import puppeteer from "puppeteer";
import { platform } from "node:os";
import type { BrowserInstance, BrowserLaunchOptions } from "./types.js";

export const launchBrowser = async (
  options: BrowserLaunchOptions = {},
): Promise<BrowserInstance> => {
  const {
    url = "about:blank",
    viewport = { width: 1280, height: 720 },
    debugPort,
    webglOptions = {},
    headless = "new",
  } = options;

  // Determine ANGLE backend based on OS
  const getAngleBackend = () => {
    const os = platform();
    switch (os) {
      case "darwin": // macOS
        return "metal";
      case "win32": // Windows
        return "d3d11";
      case "linux": // Linux
        return "vulkan";
      default:
        return "gl"; // Fallback to OpenGL
    }
  };

  const angleBackend = getAngleBackend();
  console.log(`Using ANGLE backend: ${angleBackend} for ${platform()}`);

  const args = [
    "--enable-gpu", // Force GPU process to start
    `--use-angle=${angleBackend}`, // Use OS-specific ANGLE backend
    "--disable-software-rasterizer", // Disable SwiftShader software rendering
    "--ignore-gpu-blocklist", // Bypass GPU blocklist restrictions
    "--in-process-gpu", // Keep GPU process in-process for remote/virtual environments
    "--headless=new", // Use new headless mode
    "--no-sandbox", // Required for root-privileged CI environments
  ];

  if (webglOptions.ignoreGpuBlocklist) {
    args.push("--ignore-gpu-blocklist");
  }

  if (debugPort) {
    args.push(`--remote-debugging-port=${debugPort}`);
  }

  const launchOptions = {
    headless: headless === "new" ? true : headless,
    args,
    defaultViewport: null,
  };

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.setViewport(viewport);

  // Enable WebGL error logging
  await page.evaluateOnNewDocument(() => {
    const originalGetContext = (globalThis as any).HTMLCanvasElement.prototype.getContext;
    (globalThis as any).HTMLCanvasElement.prototype.getContext = function (...args: any[]) {
      const context = originalGetContext.apply(this, args);
      if (context && (args[0] === "webgl" || args[0] === "webgl2")) {
        // Store reference for debugging
        (globalThis as any).__webglContext = context;
      }
      return context;
    };
  });

  await page.goto(url);

  return {
    browser,
    page,
    debugPort,
  };
};
