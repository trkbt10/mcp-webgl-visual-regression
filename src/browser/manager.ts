import type { BrowserInstance } from "./types.js";
import { createConnectionMonitor } from "./connection-monitor.js";

export class BrowserManager {
  private instances = new Map<string, BrowserInstance>();
  private cleanupHandlers = new Map<string, () => Promise<void>>();
  private connectionMonitors = new Map<string, ReturnType<typeof createConnectionMonitor>>();

  async addInstance(
    id: string, 
    instance: BrowserInstance, 
    monitoringOptions?: {
      enabled?: boolean;
      idleTimeout?: number;
      checkInterval?: number;
    }
  ): Promise<void> {
    this.instances.set(id, instance);

    const { enabled = true, idleTimeout = 5 * 60 * 1000, checkInterval = 30 * 1000 } = monitoringOptions ?? {};

    // Start connection monitoring if requested
    if (enabled) {
      const monitor = createConnectionMonitor(instance.browser, {
        idleTimeout,
        checkInterval,
        onIdleTimeout: async () => {
          console.log(`Browser ${id} idle timeout reached after ${idleTimeout / 1000}s, closing...`);
          await this.removeInstance(id);
        },
      });
      
      this.connectionMonitors.set(id, monitor);
      await monitor.start();
      console.log(`Connection monitoring started for browser ${id} (idle timeout: ${idleTimeout / 1000}s, check interval: ${checkInterval / 1000}s)`);
    }
  }

  getInstance(id: string): BrowserInstance | undefined {
    return this.instances.get(id);
  }

  async removeInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (instance) {
      // Stop connection monitoring if active
      const monitor = this.connectionMonitors.get(id);
      if (monitor) {
        monitor.stop();
        this.connectionMonitors.delete(id);
      }

      await instance.browser.close();
      this.instances.delete(id);
      
      const cleanup = this.cleanupHandlers.get(id);
      if (cleanup) {
        await cleanup();
        this.cleanupHandlers.delete(id);
      }
    }
  }

  getAllInstances(): Map<string, BrowserInstance> {
    return new Map(this.instances);
  }

  setCleanupHandler(id: string, handler: () => Promise<void>): void {
    this.cleanupHandlers.set(id, handler);
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.instances.keys()).map(id => 
      this.removeInstance(id)
    );
    await Promise.all(promises);
  }

  // Keep browser alive and handle graceful shutdown
  async keepAlive(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Browser instance ${id} not found`);
    }

    // Setup signal handlers
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    const cleanup = async (signal: NodeJS.Signals) => {
      console.log(`\n🛑 Received ${signal}, closing browser ${id}...`);
      await this.removeInstance(id);
      process.exit(0);
    };

    signals.forEach(signal => {
      process.once(signal, () => cleanup(signal));
    });

    // Setup browser disconnect handler
    instance.browser.on('disconnected', () => {
      console.log(`\n⚠️ Browser ${id} disconnected`);
      this.instances.delete(id);
      process.exit(1);
    });

    // Wait indefinitely
    await new Promise(() => {});
  }
}

// Singleton instance
export const browserManager = new BrowserManager();