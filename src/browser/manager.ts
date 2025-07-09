import type { BrowserInstance } from "./types.js";

export class BrowserManager {
  private instances = new Map<string, BrowserInstance>();
  private cleanupHandlers = new Map<string, () => Promise<void>>();

  async addInstance(id: string, instance: BrowserInstance): Promise<void> {
    this.instances.set(id, instance);
  }

  getInstance(id: string): BrowserInstance | undefined {
    return this.instances.get(id);
  }

  async removeInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (instance) {
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