import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { launchBrowser } from "../browser/launcher.js";
import { connectToBrowser } from "../browser/connector.js";
import { browserManager } from "../browser/manager.js";

export const browserLaunchTool: Tool = {
  name: "browser_launch",
  description: "Launch a new browser instance with WebGL support",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to navigate to (default: about:blank)",
      },
      viewport: {
        type: "object",
        properties: {
          width: { type: "number" },
          height: { type: "number" },
        },
        required: ["width", "height"],
        description: "Viewport dimensions",
      },
      debugPort: {
        type: "number",
        description: "Debug port for remote debugging",
      },
      webglOptions: {
        type: "object",
        properties: {
          ignoreGpuBlocklist: {
            type: "boolean",
            description: "Ignore GPU blocklist",
          },
        },
      },
      headless: {
        type: "boolean",
        description: "Run browser in headless mode",
      },
      instanceId: {
        type: "string",
        description: "ID to identify this browser instance",
      },
    },
    required: ["instanceId"],
  },
};

export const browserConnectTool: Tool = {
  name: "browser_connect",
  description: "Connect to an existing browser instance via debug port",
  inputSchema: {
    type: "object",
    properties: {
      debugPort: {
        type: "number",
        description: "Debug port of the running browser",
      },
      instanceId: {
        type: "string",
        description: "ID to identify this browser instance",
      },
    },
    required: ["debugPort", "instanceId"],
  },
};

export const browserNavigateTool: Tool = {
  name: "browser_navigate",
  description: "Navigate to a URL in a browser instance",
  inputSchema: {
    type: "object",
    properties: {
      instanceId: {
        type: "string",
        description: "Browser instance ID",
      },
      url: {
        type: "string",
        description: "URL to navigate to",
      },
    },
    required: ["instanceId", "url"],
  },
};

export const browserExecuteTool: Tool = {
  name: "browser_execute",
  description: "Execute JavaScript in a browser instance",
  inputSchema: {
    type: "object",
    properties: {
      instanceId: {
        type: "string",
        description: "Browser instance ID",
      },
      script: {
        type: "string",
        description: "JavaScript code to execute",
      },
    },
    required: ["instanceId", "script"],
  },
};

export const browserCloseTool: Tool = {
  name: "browser_close",
  description: "Close a browser instance",
  inputSchema: {
    type: "object",
    properties: {
      instanceId: {
        type: "string",
        description: "Browser instance ID",
      },
    },
    required: ["instanceId"],
  },
};

// Tool handlers
export const handleBrowserLaunch = async (args: any) => {
  const { instanceId, ...options } = args;

  if (browserManager.getInstance(instanceId)) {
    return {
      content: [
        {
          type: "text",
          text: `Browser instance ${instanceId} already exists`,
        },
      ],
    };
  }

  try {
    const instance = await launchBrowser(options);
    await browserManager.addInstance(instanceId, instance);

    return {
      content: [
        {
          type: "text",
          text: `Browser launched successfully with instance ID: ${instanceId}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to launch browser: ${error}`,
        },
      ],
    };
  }
};

export const handleBrowserConnect = async (args: any) => {
  const { debugPort, instanceId } = args;

  if (browserManager.getInstance(instanceId)) {
    return {
      content: [
        {
          type: "text",
          text: `Browser instance ${instanceId} already exists`,
        },
      ],
    };
  }

  const instance = await connectToBrowser(debugPort);
  if (instance) {
    await browserManager.addInstance(instanceId, instance);
    return {
      content: [
        {
          type: "text",
          text: `Connected to browser on port ${debugPort} with instance ID: ${instanceId}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Failed to connect to browser on port ${debugPort}`,
      },
    ],
  };
};

export const handleBrowserNavigate = async (args: any) => {
  const { instanceId, url } = args;
  const instance = browserManager.getInstance(instanceId);

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
    await instance.page.goto(url);
    return {
      content: [
        {
          type: "text",
          text: `Navigated to ${url}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to navigate: ${error}`,
        },
      ],
    };
  }
};

export const handleBrowserExecute = async (args: any) => {
  const { instanceId, script } = args;
  const instance = browserManager.getInstance(instanceId);

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
    const result = await instance.page.evaluate(script);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to execute script: ${error}`,
        },
      ],
    };
  }
};

export const handleBrowserClose = async (args: any) => {
  const { instanceId } = args;
  const instance = browserManager.getInstance(instanceId);

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
    await browserManager.removeInstance(instanceId);
    return {
      content: [
        {
          type: "text",
          text: `Browser instance ${instanceId} closed`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to close browser: ${error}`,
        },
      ],
    };
  }
};

export const browserTools = [
  browserLaunchTool,
  browserConnectTool,
  browserNavigateTool,
  browserExecuteTool,
  browserCloseTool,
];

export const getBrowserInstance = (instanceId: string) => {
  return browserManager.getInstance(instanceId);
};
