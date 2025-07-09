#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { WebGLNotification } from "./debugger/types.js";

// Tool imports
import {
  browserTools,
  handleBrowserLaunch,
  handleBrowserConnect,
  handleBrowserNavigate,
  handleBrowserExecute,
  handleBrowserClose,
} from "./tools/browser-tools.js";
import {
  screenshotTools,
  screenshotHandlers,
} from "./tools/screenshot-tools.js";
import {
  webglTools,
  webglHandlers,
} from "./tools/webgl-tools.js";


const server = new Server(
  {
    name: "mcp-webgl-visual-regression",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      notifications: {
        supported: true,
      },
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [...browserTools, ...screenshotTools, ...webglTools],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Browser tools
  switch (name) {
    case "browser_launch":
      return await handleBrowserLaunch(args);
    case "browser_connect":
      return await handleBrowserConnect(args);
    case "browser_navigate":
      return await handleBrowserNavigate(args);
    case "browser_execute":
      return await handleBrowserExecute(args);
    case "browser_close":
      return await handleBrowserClose(args);
  }

  // Screenshot tools
  if (screenshotHandlers[name as keyof typeof screenshotHandlers]) {
    return await screenshotHandlers[name as keyof typeof screenshotHandlers](args);
  }

  // WebGL tools
  if (webglHandlers[name as keyof typeof webglHandlers]) {
    return await webglHandlers[name as keyof typeof webglHandlers](args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      // Resources will be added here as we implement them
    ],
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Resource handlers will be added here as we implement them
  throw new Error(`Unknown resource: ${uri}`);
});

// Error handling
server.onerror = (error) => {
  console.error("[MCP Error]", error);
};

// Start the server
async function main() {
  try {
    console.error("[MCP] Starting WebGL Visual Regression Server...");
    
    const transport = new StdioServerTransport();
    
    // Add connection event handlers for debugging
    transport.onclose = () => {
      console.error("[MCP] Transport closed");
    };
    
    transport.onerror = (error) => {
      console.error("[MCP] Transport error:", error);
    };
    
    await server.connect(transport);
    console.error("[MCP] WebGL Visual Regression Server started successfully");
    
    // Keep the process alive
    process.stdin.resume();
    
    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.error("[MCP] Received SIGINT, shutting down...");
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      console.error("[MCP] Received SIGTERM, shutting down...");
      process.exit(0);
    });
  } catch (error) {
    console.error("[MCP] Failed to start server:", error);
    process.exit(1);
  }
}

// Export notification function for use in other modules
export const sendWebGLNotification = async (notification: WebGLNotification): Promise<void> => {
  try {
    await server.notification({
      method: "notifications/webgl/error",
      params: notification,
    });
  } catch (error) {
    console.error("[MCP] Failed to send notification:", error);
  }
};

// Start immediately
main();