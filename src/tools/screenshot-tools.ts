import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { captureScreenshot, saveScreenshotMetadata } from "../screenshot/capture.js";
import { compareScreenshots } from "../screenshot/compare.js";
import { getBrowserInstance } from "./browser-tools.js";
import path from "path";
import { promises as fs } from "fs";

export const screenshotCaptureTool: Tool = {
  name: "screenshot_capture",
  description: "Capture a screenshot of the current page",
  inputSchema: {
    type: "object",
    properties: {
      instanceId: {
        type: "string",
        description: "Browser instance ID",
      },
      testCase: {
        type: "string",
        description: "Test case name for the screenshot",
      },
      format: {
        type: "string",
        enum: ["png", "jpeg"],
        description: "Image format (default: png)",
      },
      fullPage: {
        type: "boolean",
        description: "Capture full page (default: false)",
      },
      encoding: {
        type: "string",
        enum: ["base64", "binary"],
        description: "Output encoding (default: binary)",
      },
      quality: {
        type: "number",
        description: "JPEG quality (0-100)",
      },
      selector: {
        type: "string",
        description: "CSS selector for element to capture",
      },
      captureCanvas: {
        type: "boolean",
        description: "Capture only canvas elements (default: false)",
      },
    },
    required: ["instanceId"],
  },
};

export const screenshotCompareTool: Tool = {
  name: "screenshot_compare",
  description: "Compare two screenshots for differences",
  inputSchema: {
    type: "object",
    properties: {
      baseline: {
        type: "string",
        description: "Path to baseline screenshot",
      },
      current: {
        type: "string",
        description: "Path to current screenshot",
      },
      threshold: {
        type: "number",
        description: "Difference threshold percentage (default: 0.1)",
      },
    },
    required: ["baseline", "current"],
  },
};

export const screenshotListTool: Tool = {
  name: "screenshot_list",
  description: "List all captured screenshots",
  inputSchema: {
    type: "object",
    properties: {
      testCase: {
        type: "string",
        description: "Filter by test case name",
      },
    },
  },
};

// Tool handlers
export const handleScreenshotCapture = async (args: any) => {
  const { instanceId, ...options } = args;
  const instance = getBrowserInstance(instanceId);

  if (!instance) {
    return {
      content: [
        {
          type: "text",
          text: `Browser instance ${instanceId} not found`,
        },
      ],
    };
  }

  try {
    const result = await captureScreenshot(instance.page, options);
    await saveScreenshotMetadata(result);

    let captureInfo = `Screenshot captured: ${result.filename}\nPath: ${result.path}`;
    
    if (options.captureCanvas || options.selector) {
      captureInfo += `\nTarget: ${options.captureCanvas ? 'canvas element' : options.selector}`;
    } else {
      captureInfo += `\nViewport: ${result.metadata.viewport.width}x${result.metadata.viewport.height}`;
    }

    const response: any = {
      content: [
        {
          type: "text",
          text: captureInfo,
        },
      ],
    };

    // Include base64 data if requested
    if (options.encoding === "base64" && typeof result.data === "string") {
      response.content.push({
        type: "text",
        text: `\nBase64 data:\n${result.data}`,
      });
    }

    return response;
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to capture screenshot: ${error}`,
        },
      ],
    };
  }
};

export const handleScreenshotCompare = async (args: any) => {
  const { baseline, current, threshold = 0.1 } = args;

  try {
    // Resolve paths relative to screenshots directory
    const screenshotsDir = path.join(process.cwd(), "screenshots");
    const baselinePath = path.isAbsolute(baseline)
      ? baseline
      : path.join(screenshotsDir, baseline);
    const currentPath = path.isAbsolute(current)
      ? current
      : path.join(screenshotsDir, current);

    const result = await compareScreenshots(baselinePath, currentPath, threshold);

    let message = `Comparison result: ${result.match ? "MATCH" : "DIFFERENT"}\n`;
    message += `Difference: ${result.difference?.toFixed(2)}%\n`;
    message += `Threshold: ${threshold}%`;

    if (result.diffImagePath) {
      message += `\nDiff image saved: ${result.diffImagePath}`;
    }

    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to compare screenshots: ${error}`,
        },
      ],
    };
  }
};

export const handleScreenshotList = async (args: any) => {
  const { testCase } = args;
  const screenshotsDir = path.join(process.cwd(), "screenshots");

  try {
    await fs.access(screenshotsDir);
    const files = await fs.readdir(screenshotsDir);
    
    let screenshots = files.filter((f) => f.endsWith(".png") || f.endsWith(".jpeg"));
    
    if (testCase) {
      screenshots = screenshots.filter((f) => f.includes(testCase));
    }

    if (screenshots.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No screenshots found",
          },
        ],
      };
    }

    const list = screenshots.join("\n");
    return {
      content: [
        {
          type: "text",
          text: `Screenshots found:\n${list}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: "No screenshots directory found or error accessing it",
        },
      ],
    };
  }
};

export const screenshotTools = [
  screenshotCaptureTool,
  screenshotCompareTool,
  screenshotListTool,
];

export const screenshotHandlers = {
  screenshot_capture: handleScreenshotCapture,
  screenshot_compare: handleScreenshotCompare,
  screenshot_list: handleScreenshotList,
};