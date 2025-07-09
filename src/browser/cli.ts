#!/usr/bin/env bun
import { parseArgs } from "util";
import { launchBrowser } from "./launcher.js";
import { connectToBrowser } from "./connector.js";
import { browserManager } from "./manager.js";
import type { BrowserLaunchOptions } from "./types.js";

export const createCLIOptions = () => {
  return parseArgs({
    args: process.argv.slice(2),
    options: {
      port: {
        type: "string",
        short: "p",
        default: "9222",
      },
      url: {
        type: "string",
        short: "u",
        default: "http://localhost:8765/webgl-test",
      },
      width: {
        type: "string",
        short: "w",
        default: "1280",
      },
      height: {
        type: "string",
        short: "h",
        default: "720",
      },
      headless: {
        type: "boolean",
        default: false,
      },
      "use-angle": {
        type: "boolean",
        default: false,
      },
      "ignore-gpu-blocklist": {
        type: "boolean",
        default: false,
      },
      "instance-id": {
        type: "string",
        short: "i",
        default: "debug-browser",
      },
      help: {
        type: "boolean",
        default: false,
      },
    },
    strict: false,
    allowPositionals: true,
  });
};

export const showHelp = () => {
  console.log(`
WebGL Visual Regression Browser Launcher

Usage: bun launch-debug-browser.ts [options]

Options:
  -p, --port <port>              Debug port (default: 9222)
  -u, --url <url>                Initial URL to open (default: http://localhost:8765/webgl-test/)
  -w, --width <width>            Viewport width (default: 1280)
  -h, --height <height>          Viewport height (default: 720)
  -i, --instance-id <id>         Browser instance ID (default: debug-browser)
  --headless                     Run in headless mode
  --use-angle                    Use ANGLE GL backend
  --ignore-gpu-blocklist         Ignore GPU blocklist
  --help                         Show this help message

Examples:
  # Launch browser with local WebGL test page (default)
  bun launch-debug-browser.ts
  
  # Launch browser with external WebGL test page
  bun launch-debug-browser.ts -u https://webglsamples.org/aquarium/aquarium.html

  # Launch with custom viewport
  bun launch-debug-browser.ts -w 1920 -h 1080

  # Launch with ANGLE backend
  bun launch-debug-browser.ts --use-angle

  # Connect to existing browser
  To connect to an existing browser, use the same debug port:
  bun launch-debug-browser.ts -p 9222
`);
};

export const runBrowserCLI = async () => {
  const { values } = createCLIOptions();

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  const port = parseInt(values.port as string);
  const url = values.url as string;
  const width = parseInt(values.width as string);
  const height = parseInt(values.height as string);
  const headless = values.headless as boolean;
  const instanceId = values["instance-id"] as string;

  // Try to connect to existing browser first
  try {
    const existingBrowser = await connectToBrowser(port);
    if (existingBrowser) {
      console.log(`✅ Connected to existing browser on port ${port}`);

      await existingBrowser.page.setViewport({ width, height });
      await existingBrowser.page.goto(url);

      console.log(`📄 Navigated to: ${url}`);
      console.log(`📐 Viewport: ${width}x${height}`);
      console.log(`🔗 Browser WebSocket endpoint: ${existingBrowser.browser.wsEndpoint()}`);
      console.log(`📝 WebGL context accessible via: (window as any).__webglContext`);
      console.log(`\n💡 Instance ID: ${instanceId}`);

      await browserManager.addInstance(instanceId, existingBrowser);
      await browserManager.keepAlive(instanceId);
      return;
    }
  } catch (error) {
    console.log(`📦 No existing browser found on port ${port}, launching new instance...`);
  }

  // Launch new browser using the shared launcher
  const browserOptions: BrowserLaunchOptions = {
    url,
    viewport: { width, height },
    debugPort: port,
    webglOptions: {
      ignoreGpuBlocklist: values["ignore-gpu-blocklist"] as boolean,
    },
    headless,
  };

  if (values["use-angle"]) {
    console.log("🔧 Using ANGLE GL backend");
  }

  if (values["ignore-gpu-blocklist"]) {
    console.log("🔧 Ignoring GPU blocklist");
  }

  const instance = await launchBrowser(browserOptions);
  await browserManager.addInstance(instanceId, instance);

  console.log(`✅ Browser launched successfully`);
  console.log(`🌐 Debug port: ${port}`);
  console.log(`📄 Initial URL: ${url}`);
  console.log(`📐 Viewport: ${width}x${height}`);
  console.log(`🔗 Browser WebSocket endpoint: ${instance.browser.wsEndpoint()}`);
  console.log(`📝 WebGL context accessible via: (window as any).__webglContext`);
  console.log(`\n💡 Instance ID: ${instanceId}`);
  console.log(`💡 To connect from MCP, use instanceId "${instanceId}" and port ${port}`);
  console.log(`\n⚠️  Keep this process running to maintain the browser session`);

  await browserManager.keepAlive(instanceId);
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBrowserCLI().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}
