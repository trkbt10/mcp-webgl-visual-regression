import type { Page } from "puppeteer";
import type { WebGLContextInfo } from "./types.js";

export const getWebGLContextInfo = async (page: Page): Promise<WebGLContextInfo | undefined> => {
  return await page.evaluate(() => {
    const gl = (globalThis as any).__webglContext;
    
    if (!gl) {
      return undefined;
    }
    
    const getParameter = (param: number) => {
      try {
        return gl.getParameter(param);
      } catch (e) {
        return null;
      }
    };
    
    // Get extensions
    const extensions: string[] = [];
    const availableExtensions = gl.getSupportedExtensions();
    if (availableExtensions) {
      extensions.push(...availableExtensions);
    }
    
    // Get various parameters
    const parameters: Record<string, any> = {
      MAX_TEXTURE_SIZE: getParameter(gl.MAX_TEXTURE_SIZE),
      MAX_VERTEX_ATTRIBS: getParameter(gl.MAX_VERTEX_ATTRIBS),
      MAX_VERTEX_TEXTURE_IMAGE_UNITS: getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      MAX_VARYING_VECTORS: getParameter(gl.MAX_VARYING_VECTORS),
      MAX_VERTEX_UNIFORM_VECTORS: getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      MAX_FRAGMENT_UNIFORM_VECTORS: getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      MAX_TEXTURE_IMAGE_UNITS: getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      MAX_RENDERBUFFER_SIZE: getParameter(gl.MAX_RENDERBUFFER_SIZE),
      MAX_VIEWPORT_DIMS: getParameter(gl.MAX_VIEWPORT_DIMS),
    };
    
    return {
      version: getParameter(gl.VERSION) || "Unknown",
      vendor: getParameter(gl.VENDOR) || "Unknown",
      renderer: getParameter(gl.RENDERER) || "Unknown",
      shadingLanguageVersion: getParameter(gl.SHADING_LANGUAGE_VERSION) || "Unknown",
      extensions,
      parameters,
    };
  });
};

export const injectWebGLErrorTracking = async (page: Page): Promise<void> => {
  await page.evaluateOnNewDocument(() => {
    // Store shader sources for error reporting
    const shaderSources = new WeakMap<any, string>();
    const shaderTypes = new WeakMap<any, number>();
    
    // Override WebGL error-prone methods
    const originalMethods = new Map();
    
    const wrapMethod = (obj: any, methodName: string) => {
      const original = obj.prototype[methodName];
      originalMethods.set(methodName, original);
      
      obj.prototype[methodName] = function (...args: any[]) {
        try {
          // Special handling for shader-related methods
          if (methodName === "shaderSource" && args.length >= 2) {
            const shader = args[0];
            const source = args[1];
            shaderSources.set(shader, source);
          } else if (methodName === "createShader" && args.length >= 1) {
            const result = original.apply(this, args);
            if (result) {
              shaderTypes.set(result, args[0]);
            }
            return result;
          } else if (methodName === "compileShader" && args.length >= 1) {
            const shader = args[0];
            const result = original.apply(this, args);
            
            // Check compilation status
            if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
              const errorLog = this.getShaderInfoLog(shader) || "Unknown shader compilation error";
              const source = shaderSources.get(shader) || "";
              const shaderType = shaderTypes.get(shader);
              
              // Parse error log for line numbers
              const lineMatch = errorLog.match(/ERROR: \d+:(\d+):|(\d+):\d+:/);
              const lineNumber = lineMatch ? parseInt(lineMatch[1] || lineMatch[2]) : undefined;
              
              (globalThis as any).postMessage({
                type: "shader-compilation-error",
                error: {
                  type: "shader_compilation",
                  shaderType: shaderType === this.VERTEX_SHADER ? "vertex" : "fragment",
                  source,
                  errorLog,
                  lineNumber,
                  timestamp: new Date().toISOString(),
                },
              }, "*");
            }
            
            return result;
          } else if (methodName === "linkProgram" && args.length >= 1) {
            const program = args[0];
            const result = original.apply(this, args);
            
            // Check link status
            if (!this.getProgramParameter(program, this.LINK_STATUS)) {
              const errorLog = this.getProgramInfoLog(program) || "Unknown program linking error";
              
              (globalThis as any).postMessage({
                type: "shader-compilation-error",
                error: {
                  type: "program_linking",
                  errorLog,
                  timestamp: new Date().toISOString(),
                },
              }, "*");
            }
            
            return result;
          }
          
          const result = original.apply(this, args);
          
          // Check for WebGL errors after each call
          const error = this.getError();
          if (error !== this.NO_ERROR) {
            const errorMessage = getWebGLErrorMessage(error);
            console.error(`WebGL Error in ${methodName}: ${errorMessage}`);
            
            // Send error to parent context
            (globalThis as any).postMessage({
              type: "webgl-error",
              error: {
                message: `WebGL Error in ${methodName}: ${errorMessage}`,
                functionName: methodName,
                timestamp: new Date().toISOString(),
              },
            }, "*");
          }
          
          return result;
        } catch (e) {
          console.error(`Exception in ${methodName}:`, e);
          throw e;
        }
      };
    };
    
    const getWebGLErrorMessage = (error: number): string => {
      switch (error) {
        case 0x0500: return "INVALID_ENUM";
        case 0x0501: return "INVALID_VALUE";
        case 0x0502: return "INVALID_OPERATION";
        case 0x0505: return "OUT_OF_MEMORY";
        case 0x0506: return "INVALID_FRAMEBUFFER_OPERATION";
        default: return `Unknown error (${error})`;
      }
    };
    
    // Wrap common WebGL methods
    if (typeof (globalThis as any).WebGLRenderingContext !== "undefined") {
      ["drawArrays", "drawElements", "useProgram", "bindBuffer", "bindTexture", 
       "compileShader", "linkProgram", "attachShader", "createShader", "createProgram",
       "shaderSource", "texImage2D", "texParameteri", "uniformMatrix4fv"].forEach(method => {
        wrapMethod((globalThis as any).WebGLRenderingContext, method);
      });
    }
    
    if (typeof (globalThis as any).WebGL2RenderingContext !== "undefined") {
      ["drawArrays", "drawElements", "useProgram", "bindBuffer", "bindTexture",
       "compileShader", "linkProgram", "attachShader", "createShader", "createProgram",
       "shaderSource", "texImage2D", "texParameteri", "uniformMatrix4fv"].forEach(method => {
        wrapMethod((globalThis as any).WebGL2RenderingContext, method);
      });
    }
  });
  
  // Listen for error messages
  await page.on("console", (msg) => {
    if (msg.type() === "error" && msg.text().includes("WebGL Error")) {
      // Error will be handled by message event
    }
  });
};