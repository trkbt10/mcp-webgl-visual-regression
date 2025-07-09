import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getBrowserInstance } from "./browser-tools.js";
import { getWebGLContextInfo, injectWebGLErrorTracking } from "../debugger/context-info.js";
import {
  trackWebGLError,
  getWebGLErrors,
  clearWebGLErrors,
  trackShaderError,
  getShaderErrors,
  clearShaderErrors,
} from "../debugger/error-tracker.js";
import { sendWebGLNotification } from "../server.js";
import type { WebGLNotification } from "../debugger/types.js";
import { startShaderWatching } from "../shader-watcher.js";
import { createErrorAggregator } from "../debugger/error-aggregator.js";

export const webglGetContextInfoTool: Tool = {
  name: "webgl_get_context_info",
  description: "Get WebGL context information from the current page",
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

export const webglGetErrorsTool: Tool = {
  name: "webgl_get_errors",
  description: "Get all tracked WebGL errors",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of errors to return",
      },
    },
  },
};

export const webglClearErrorsTool: Tool = {
  name: "webgl_clear_errors",
  description: "Clear all tracked WebGL errors",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const webglInjectDebuggingTool: Tool = {
  name: "webgl_inject_debugging",
  description: "Inject WebGL error tracking into the page",
  inputSchema: {
    type: "object",
    properties: {
      instanceId: {
        type: "string",
        description: "Browser instance ID",
      },
      collectionDuration: {
        type: "number",
        description: "Error collection duration in seconds (default: 10)",
        default: 10,
      },
      maxErrors: {
        type: "number",
        description: "Maximum errors before stopping collection (default: 1000)",
        default: 1000,
      },
    },
    required: ["instanceId"],
  },
};

export const webglGetShaderErrorsTool: Tool = {
  name: "webgl_get_shader_errors",
  description: "Get all tracked shader compilation and linking errors",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of errors to return",
      },
    },
  },
};

export const webglClearShaderErrorsTool: Tool = {
  name: "webgl_clear_shader_errors",
  description: "Clear all tracked shader errors",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const webglGetErrorSummaryTool: Tool = {
  name: "webgl_get_error_summary",
  description: "Get a summary of all WebGL errors with aggregation",
  inputSchema: {
    type: "object",
    properties: {
      includeShaderErrors: {
        type: "boolean",
        description: "Include shader compilation errors in the summary",
        default: true,
      },
    },
  },
};

export const webglWatchShadersTool: Tool = {
  name: "webgl_watch_shaders",
  description: "Watch shader files for changes and reload page on modification",
  inputSchema: {
    type: "object",
    properties: {
      instanceId: {
        type: "string",
        description: "Browser instance ID",
      },
      files: {
        type: "array",
        items: { type: "string" },
        description: "Array of shader file paths to watch",
      },
      directories: {
        type: "array",
        items: { type: "string" },
        description: "Array of directories to watch for shader files",
      },
    },
    required: ["instanceId"],
  },
};

// Tool handlers
export const handleWebGLGetContextInfo = async (args: any) => {
  const { instanceId } = args;
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
    const info = await getWebGLContextInfo(instance.page);
    
    if (!info) {
      return {
        content: [
          {
            type: "text",
            text: "No WebGL context found on the page",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get WebGL context info: ${error}`,
        },
      ],
    };
  }
};

export const handleWebGLGetErrors = async (args: any) => {
  const { limit } = args;

  try {
    let errors = await getWebGLErrors();
    
    if (limit && limit > 0) {
      errors = errors.slice(0, limit);
    }

    if (errors.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No WebGL errors tracked",
          },
        ],
      };
    }

    const summary = errors.map((e) => 
      `[${e.id.substring(0, 8)}] ${e.message} (count: ${e.count}, last: ${e.timestamp})`
    ).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `WebGL Errors (${errors.length} unique):\n${summary}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get errors: ${error}`,
        },
      ],
    };
  }
};

export const handleWebGLClearErrors = async () => {
  try {
    await clearWebGLErrors();
    return {
      content: [
        {
          type: "text",
          text: "WebGL errors cleared",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to clear errors: ${error}`,
        },
      ],
    };
  }
};

// Store aggregator instances per browser instance
const aggregatorInstances = new Map<string, ReturnType<typeof createErrorAggregator>>();

export const handleWebGLInjectDebugging = async (args: any) => {
  const { instanceId, collectionDuration = 10, maxErrors = 1000 } = args;
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
    // Create a new error aggregator for this instance
    const errorAggregator = createErrorAggregator({
      collectionDuration: collectionDuration * 1000, // Convert to ms
      maxErrorsBeforeStop: maxErrors,
      batchInterval: 1000,
      maxBatchSize: 50,
    });
    
    // Store the aggregator
    aggregatorInstances.set(instanceId, errorAggregator);

    // Set up message listener
    await instance.page.evaluateOnNewDocument(() => {
      (globalThis as any).addEventListener("message", (event: any) => {
        if (event.data.type === "webgl-error") {
          console.error("WebGL_ERROR_TRACKED:", JSON.stringify(event.data.error));
        } else if (event.data.type === "shader-compilation-error") {
          console.error("SHADER_ERROR_TRACKED:", JSON.stringify(event.data.error));
        }
      });
    });

    // Inject error tracking
    await injectWebGLErrorTracking(instance.page);

    // Start error collection
    errorAggregator.start();

    // Listen for errors
    instance.page.on("console", async (msg) => {
      if (msg.type() === "error" && msg.text().includes("WebGL_ERROR_TRACKED:")) {
        try {
          const errorData = JSON.parse(msg.text().replace("WebGL_ERROR_TRACKED:", ""));
          const error = await trackWebGLError({
            message: errorData.message,
            timestamp: new Date(errorData.timestamp),
            context: {
              functionName: errorData.functionName,
            },
            url: instance.page.url(),
          });
          
          // Add to aggregator instead of sending immediately
          await errorAggregator.addError(error);
        } catch (e) {
          console.error("Failed to track WebGL error:", e);
        }
      } else if (msg.type() === "error" && msg.text().includes("SHADER_ERROR_TRACKED:")) {
        try {
          const errorData = JSON.parse(msg.text().replace("SHADER_ERROR_TRACKED:", ""));
          const error = await trackShaderError({
            ...errorData,
            timestamp: new Date(errorData.timestamp),
            url: instance.page.url(),
          });
          
          // Add to aggregator instead of sending immediately
          await errorAggregator.addError(error);
        } catch (e) {
          console.error("Failed to track shader error:", e);
        }
      }
    });

    // Clean up aggregator when browser is closed
    instance.browser.on("disconnected", () => {
      errorAggregator.destroy();
      aggregatorInstances.delete(instanceId);
    });

    return {
      content: [
        {
          type: "text",
          text: `WebGL debugging injected successfully\nError collection: ${collectionDuration}s (max ${maxErrors} errors)`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to inject debugging: ${error}`,
        },
      ],
    };
  }
};

export const handleWebGLGetShaderErrors = async (args: any) => {
  const { limit } = args;

  try {
    let errors = await getShaderErrors();
    
    if (limit && limit > 0) {
      errors = errors.slice(0, limit);
    }

    if (errors.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No shader errors tracked",
          },
        ],
      };
    }

    const summary = errors.map((e) => {
      const header = `[${e.id.substring(0, 8)}] ${e.type} - ${e.shaderType || "program"}`;
      const errorInfo = e.lineNumber ? `Line ${e.lineNumber}: ${e.errorLog}` : e.errorLog;
      return `${header}\n  ${errorInfo}`;
    }).join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Shader Errors (${errors.length}):\n${summary}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get shader errors: ${error}`,
        },
      ],
    };
  }
};

export const handleWebGLClearShaderErrors = async () => {
  try {
    await clearShaderErrors();
    return {
      content: [
        {
          type: "text",
          text: "Shader errors cleared",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to clear shader errors: ${error}`,
        },
      ],
    };
  }
};

export const handleWebGLGetErrorSummary = async (args: any) => {
  const { includeShaderErrors = true } = args;

  try {
    const webglErrors = await getWebGLErrors();
    const shaderErrors = includeShaderErrors ? await getShaderErrors() : [];
    
    if (webglErrors.length === 0 && shaderErrors.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No errors tracked",
          },
        ],
      };
    }

    // Aggregate WebGL errors
    const errorGroups = new Map<string, { count: number; firstSeen: Date; lastSeen: Date }>();
    
    webglErrors.forEach(error => {
      const key = error.message.replace(/\d+/g, 'N'); // Normalize numbers
      const existing = errorGroups.get(key);
      if (existing) {
        existing.count += error.count;
        existing.lastSeen = error.timestamp;
      } else {
        errorGroups.set(key, {
          count: error.count,
          firstSeen: error.timestamp,
          lastSeen: error.timestamp,
        });
      }
    });

    // Sort by frequency
    const sortedErrors = Array.from(errorGroups.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    let summary = `📊 WebGL Error Summary\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (sortedErrors.length > 0) {
      summary += `🔴 Top WebGL Errors (${webglErrors.reduce((sum, e) => sum + e.count, 0)} total):\n`;
      sortedErrors.forEach(([msg, data], i) => {
        const percentage = Math.round((data.count / webglErrors.reduce((sum, e) => sum + e.count, 0)) * 100);
        summary += `${i + 1}. ${msg.substring(0, 60)}${msg.length > 60 ? '...' : ''}\n`;
        summary += `   Count: ${data.count} (${percentage}%)\n\n`;
      });
    }

    if (shaderErrors.length > 0) {
      summary += `\n🔶 Shader Compilation Errors (${shaderErrors.length}):\n`;
      const shaderErrorTypes = new Map<string, number>();
      shaderErrors.forEach(error => {
        const key = `${error.type} - ${error.shaderType || 'program'}`;
        shaderErrorTypes.set(key, (shaderErrorTypes.get(key) || 0) + 1);
      });
      
      shaderErrorTypes.forEach((count, type) => {
        summary += `- ${type}: ${count} error${count > 1 ? 's' : ''}\n`;
      });
    }

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get error summary: ${error}`,
        },
      ],
    };
  }
};

export const handleWebGLWatchShaders = async (args: any) => {
  const { instanceId, files = [], directories = [] } = args;
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

  if (files.length === 0 && directories.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Please provide at least one file or directory to watch",
        },
      ],
    };
  }

  try {
    // Start watching shader files
    await startShaderWatching(files, directories, async () => {
      console.log("Shader file changed, reloading page...");
      
      // Reload the page
      await instance.page.reload({ waitUntil: "networkidle2" });
      
      // Re-inject debugging after reload
      await injectWebGLErrorTracking(instance.page);
      
      // Send notification
      const notification: WebGLNotification = {
        type: "webgl.error.general",
        timestamp: new Date(),
        error: {
          id: `page-reload-${Date.now()}`,
          message: "Page reloaded due to shader file change",
          timestamp: new Date(),
          count: 1,
        },
        severity: "info",
      };
      await sendWebGLNotification(notification);
    });

    const watchedItems = [
      ...files.map((f: string) => `File: ${f}`),
      ...directories.map((d: string) => `Directory: ${d}`),
    ].join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Shader file watching started:\n${watchedItems}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to start shader watching: ${error}`,
        },
      ],
    };
  }
};

export const webglTools = [
  webglGetContextInfoTool,
  webglGetErrorsTool,
  webglClearErrorsTool,
  webglInjectDebuggingTool,
  webglGetShaderErrorsTool,
  webglClearShaderErrorsTool,
  webglGetErrorSummaryTool,
  webglWatchShadersTool,
];

export const webglHandlers = {
  webgl_get_context_info: handleWebGLGetContextInfo,
  webgl_get_errors: handleWebGLGetErrors,
  webgl_clear_errors: handleWebGLClearErrors,
  webgl_inject_debugging: handleWebGLInjectDebugging,
  webgl_get_shader_errors: handleWebGLGetShaderErrors,
  webgl_clear_shader_errors: handleWebGLClearShaderErrors,
  webgl_get_error_summary: handleWebGLGetErrorSummary,
  webgl_watch_shaders: handleWebGLWatchShaders,
};