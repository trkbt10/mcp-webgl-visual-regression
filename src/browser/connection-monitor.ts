import type { Browser } from "puppeteer";

export type ConnectionMonitorOptions = {
  idleTimeout?: number; // milliseconds (default: 5 minutes)
  checkInterval?: number; // milliseconds (default: 30 seconds)
  onIdleTimeout?: () => Promise<void>;
};

type MonitorState = {
  lastActiveTime: number;
  intervalId?: NodeJS.Timeout;
  isRunning: boolean;
};

export const createConnectionMonitor = (
  browser: Browser,
  options: ConnectionMonitorOptions = {}
) => {
  const idleTimeout = options.idleTimeout ?? 5 * 60 * 1000; // 5 minutes
  const checkInterval = options.checkInterval ?? 30 * 1000; // 30 seconds
  const onIdleTimeout = options.onIdleTimeout;

  const state: MonitorState = {
    lastActiveTime: Date.now(),
    intervalId: undefined,
    isRunning: false,
  };

  const getActiveConnectionCount = async (): Promise<number> => {
    try {
      // Check if browser has any pages open
      const pages = await browser.pages();
      const pageCount = pages.length;
      
      // In Puppeteer, an "idle" browser typically has 1 page (the default blank page)
      // Active usage means more than 1 page or active targets
      const targets = await browser.targets();
      const activeTargets = targets.filter(target => 
        target.type() === 'page' && 
        target.url() !== 'about:blank'
      ).length;

      console.log(`Pages: ${pageCount}, Active targets: ${activeTargets}`);
      
      // Consider browser active if there are pages other than the default blank page
      return activeTargets;
    } catch (error) {
      console.error("Error getting connection count:", error);
      return 0;
    }
  };

  const checkConnections = async (): Promise<void> => {
    try {
      const connectionCount = await getActiveConnectionCount();

      if (connectionCount > 0) {
        // Reset idle timer if there are active connections
        state.lastActiveTime = Date.now();
      } else {
        // Check if idle timeout has been exceeded
        const idleDuration = Date.now() - state.lastActiveTime;

        if (idleDuration >= idleTimeout) {
          console.log(
            `Browser has been idle for ${Math.round(
              idleDuration / 1000
            )}s, triggering idle timeout...`
          );

          // Stop monitoring before triggering callback
          stop();

          // Trigger idle timeout callback
          if (onIdleTimeout) {
            await onIdleTimeout();
          }
        }
      }
    } catch (error) {
      console.error("Failed to check connection count:", error);
    }
  };

  const start = async (): Promise<void> => {
    if (state.isRunning) {
      return;
    }

    state.isRunning = true;
    state.lastActiveTime = Date.now();

    // Start monitoring
    state.intervalId = setInterval(async () => {
      try {
        await checkConnections();
      } catch (error) {
        console.error("Error checking connections:", error);
      }
    }, checkInterval);
  };

  const stop = (): void => {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = undefined;
    }
    state.isRunning = false;
  };

  const getLastActiveTime = (): Date => {
    return new Date(state.lastActiveTime);
  };

  const getIdleDuration = (): number => {
    return Date.now() - state.lastActiveTime;
  };

  return {
    start,
    stop,
    getLastActiveTime,
    getIdleDuration,
  };
};