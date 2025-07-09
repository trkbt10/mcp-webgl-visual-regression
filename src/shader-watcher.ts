import { watch, type FSWatcher } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { sendWebGLNotification } from "./server.js";
import type { WebGLNotification } from "./debugger/types.js";

type ShaderWatchConfig = {
  files: string[];
  directories: string[];
  extensions: string[];
  onChange: (filePath: string, content: string) => Promise<void>;
};

export class ShaderWatcher {
  private watchers: FSWatcher[] = [];
  private config: ShaderWatchConfig;
  private fileCache = new Map<string, string>();

  constructor(config: ShaderWatchConfig) {
    this.config = {
      ...config,
      extensions: config.extensions.length > 0 ? config.extensions : [".glsl", ".vert", ".frag", ".vs", ".fs"],
    };
  }

  async start(): Promise<void> {
    // Watch individual files
    for (const file of this.config.files) {
      await this.watchFile(file);
    }

    // Watch directories
    for (const dir of this.config.directories) {
      await this.watchDirectory(dir);
    }
  }

  private async watchFile(filePath: string): Promise<void> {
    try {
      // Cache initial content
      const content = await fs.readFile(filePath, "utf-8");
      this.fileCache.set(filePath, content);

      const watcher = watch(filePath, async (eventType) => {
        if (eventType === "change") {
          try {
            const newContent = await fs.readFile(filePath, "utf-8");
            const oldContent = this.fileCache.get(filePath);
            
            if (newContent !== oldContent) {
              this.fileCache.set(filePath, newContent);
              console.log(`Shader file changed: ${filePath}`);
              await this.config.onChange(filePath, newContent);
            }
          } catch (error) {
            console.error(`Error reading shader file ${filePath}:`, error);
          }
        }
      });

      this.watchers.push(watcher);
      console.log(`Watching shader file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to watch file ${filePath}:`, error);
    }
  }

  private async watchDirectory(dirPath: string): Promise<void> {
    try {
      const watcher = watch(dirPath, { recursive: true }, async (eventType, filename) => {
        if (!filename || eventType !== "change") return;

        const filePath = path.join(dirPath, filename);
        const ext = path.extname(filePath);

        if (this.config.extensions.includes(ext)) {
          try {
            const newContent = await fs.readFile(filePath, "utf-8");
            const oldContent = this.fileCache.get(filePath);
            
            if (newContent !== oldContent) {
              this.fileCache.set(filePath, newContent);
              console.log(`Shader file changed: ${filePath}`);
              await this.config.onChange(filePath, newContent);
            }
          } catch (error) {
            console.error(`Error reading shader file ${filePath}:`, error);
          }
        }
      });

      this.watchers.push(watcher);
      console.log(`Watching shader directory: ${dirPath}`);
    } catch (error) {
      console.error(`Failed to watch directory ${dirPath}:`, error);
    }
  }

  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    this.fileCache.clear();
    console.log("Stopped watching shader files");
  }
}

// Global shader watcher instance
let shaderWatcher: ShaderWatcher | undefined;

export const startShaderWatching = async (
  files: string[],
  directories: string[],
  onReloadRequired: () => Promise<void>
): Promise<void> => {
  if (shaderWatcher) {
    shaderWatcher.stop();
  }

  shaderWatcher = new ShaderWatcher({
    files,
    directories,
    extensions: [".glsl", ".vert", ".frag", ".vs", ".fs"],
    onChange: async (filePath) => {
      // Send notification about shader file change
      const notification: WebGLNotification = {
        type: "webgl.error.general",
        timestamp: new Date(),
        error: {
          id: `shader-file-change-${Date.now()}`,
          message: `Shader file changed: ${filePath}`,
          timestamp: new Date(),
          count: 1,
        },
        severity: "info",
      };
      await sendWebGLNotification(notification);

      // Trigger reload
      await onReloadRequired();
    },
  });

  await shaderWatcher.start();
};

export const stopShaderWatching = (): void => {
  if (shaderWatcher) {
    shaderWatcher.stop();
    shaderWatcher = undefined;
  }
};