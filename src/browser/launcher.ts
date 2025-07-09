import puppeteer from "puppeteer";
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

  const args = [
    "--enable-gpu", // ★GPU プロセスを強制起動
    "--use-angle=metal", // ★Metal-ANGLE を明示（Intel Mac なら gl でも可）
    "--disable-software-rasterizer", // SwiftShader を完全に無効化（保険）
    "--ignore-gpu-blocklist", // 万一ブロックリスト判定された場合に備え
    "--in-process-gpu", // RDP/仮想ディスプレイで GPU プロセスが落ちるなら
    "--headless=new", // 冗長でも flag で再確認しやすい
    "--no-sandbox", // root 権限の CI で必要なら
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
