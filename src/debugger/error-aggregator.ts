import type { WebGLError, ShaderCompilationError, WebGLNotification } from "./types.js";
import { sendWebGLNotification } from "../server.js";

type ErrorBatch = {
  errors: (WebGLError | ShaderCompilationError)[];
  firstSeen: Date;
  lastSeen: Date;
  totalCount: number;
};

type AggregatorConfig = {
  batchInterval?: number;
  maxBatchSize?: number;
  collectionDuration?: number; // Total collection duration in ms
  maxErrorsBeforeStop?: number; // Stop collecting after this many total errors
};

class ErrorAggregator {
  private batchInterval: number;
  private maxBatchSize: number;
  private collectionDuration: number;
  private maxErrorsBeforeStop: number;
  private errorBatch: Map<string, ErrorBatch> = new Map();
  private batchTimer: NodeJS.Timeout | undefined;
  private collectionTimer: NodeJS.Timeout | undefined;
  private isProcessing = false;
  private isActive = false;
  private totalErrorCount = 0;
  private collectionStartTime: Date | undefined;

  constructor(config: AggregatorConfig = {}) {
    this.batchInterval = config.batchInterval ?? 1000; // 1 second
    this.maxBatchSize = config.maxBatchSize ?? 50;
    this.collectionDuration = config.collectionDuration ?? 10000; // 10 seconds
    this.maxErrorsBeforeStop = config.maxErrorsBeforeStop ?? 1000; // Stop after 1000 errors
  }

  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.totalErrorCount = 0;
    this.collectionStartTime = new Date();
    this.errorBatch.clear();

    console.log(`[ErrorAggregator] Starting error collection for ${this.collectionDuration}ms`);

    // Start batch processing timer
    this.startBatchTimer();

    // Set collection duration timer
    this.collectionTimer = setTimeout(() => {
      this.stop();
    }, this.collectionDuration);
  }

  private startBatchTimer(): void {
    if (!this.isActive || this.batchTimer) {
      return;
    }

    this.batchTimer = setTimeout(() => {
      if (this.isActive) {
        this.processBatch();
        this.batchTimer = undefined;
        this.startBatchTimer();
      }
    }, this.batchInterval);
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    
    // Clear timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    if (this.collectionTimer) {
      clearTimeout(this.collectionTimer);
      this.collectionTimer = undefined;
    }

    // Process final batch
    await this.processBatch();

    // Send final summary
    await this.sendFinalSummary();

    console.log(`[ErrorAggregator] Stopped. Total errors collected: ${this.totalErrorCount}`);
  }

  async addError(error: WebGLError | ShaderCompilationError): Promise<void> {
    if (!this.isActive) {
      return;
    }

    const errorCount = 'count' in error ? error.count : 1;
    this.totalErrorCount += errorCount;

    // Check if we should stop due to too many errors
    if (this.totalErrorCount >= this.maxErrorsBeforeStop) {
      console.log(`[ErrorAggregator] Max error count reached (${this.totalErrorCount}). Stopping collection.`);
      await this.stop();
      return;
    }

    const key = this.getErrorKey(error);
    const existing = this.errorBatch.get(key);

    if (existing) {
      existing.errors.push(error);
      existing.lastSeen = new Date();
      existing.totalCount += errorCount;
    } else {
      this.errorBatch.set(key, {
        errors: [error],
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalCount: errorCount,
      });
    }

    // Process immediately if batch is getting too large
    if (this.errorBatch.size >= this.maxBatchSize && !this.isProcessing) {
      await this.processBatch();
    }
  }

  private getErrorKey(error: WebGLError | ShaderCompilationError): string {
    if ('type' in error && (error.type === 'shader_compilation' || error.type === 'program_linking')) {
      // Group shader errors by type and shader type
      return `shader:${error.type}:${error.shaderType || 'program'}`;
    } else {
      // Group WebGL errors by error type
      const webglError = error as WebGLError;
      const errorType = this.extractErrorType(webglError.message);
      return `webgl:${errorType}`;
    }
  }

  private extractErrorType(message: string): string {
    // Extract error patterns like "INVALID_OPERATION: useProgram" or "INVALID_OPERATION: drawElements"
    const match = message.match(/WebGL.*?:\s*([A-Z_]+):\s*(\w+)/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    
    // Fallback to simpler pattern
    const simpleMatch = message.match(/([A-Z_]+)/);
    return simpleMatch ? simpleMatch[1] : 'UNKNOWN';
  }

  private async processBatch(): Promise<void> {
    if (!this.isActive || this.isProcessing || this.errorBatch.size === 0) {
      return;
    }

    this.isProcessing = true;
    const currentBatch = new Map(this.errorBatch);
    this.errorBatch.clear();

    try {
      // Process each error group
      for (const [key, batch] of currentBatch) {
        await this.sendAggregatedNotification(key, batch);
      }
    } catch (error) {
      console.error('Failed to process error batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendFinalSummary(): Promise<void> {
    if (!this.collectionStartTime || this.totalErrorCount === 0) {
      return;
    }

    const duration = Date.now() - this.collectionStartTime.getTime();
    const durationSec = Math.round(duration / 1000);
    
    const summaryMessage = `📊 Error Collection Complete
━━━━━━━━━━━━━━━━━━━━━━━
Total Errors: ${this.totalErrorCount}
Collection Duration: ${durationSec}s
${this.totalErrorCount >= this.maxErrorsBeforeStop ? '⚠️ Collection stopped early due to high error volume' : '✅ Collection period completed'}`;

    const notification: WebGLNotification = {
      type: "webgl.error.general",
      timestamp: new Date(),
      error: {
        id: `summary-${Date.now()}`,
        message: summaryMessage,
        timestamp: new Date(),
        count: 1,
      },
      severity: "info",
    };

    await sendWebGLNotification(notification);
  }

  private async sendAggregatedNotification(key: string, batch: ErrorBatch): Promise<void> {
    const [category, ...typeParts] = key.split(':');
    const errorType = typeParts.join(':');
    
    let notification: WebGLNotification;

    if (category === 'shader') {
      const shaderErrors = batch.errors as ShaderCompilationError[];
      const firstError = shaderErrors[0];
      
      const aggregatedMessage = this.createShaderErrorSummary(shaderErrors, errorType);
      
      notification = {
        type: errorType.includes('compilation') 
          ? "webgl.error.shader_compilation" 
          : "webgl.error.program_linking",
        timestamp: new Date(),
        error: {
          ...firstError,
          errorLog: aggregatedMessage,
        },
        severity: "error",
      };
    } else {
      const webglErrors = batch.errors as WebGLError[];
      const uniqueMessages = new Set(webglErrors.map(e => e.message));
      
      const aggregatedMessage = this.createWebGLErrorSummary(
        errorType,
        batch.totalCount,
        uniqueMessages
      );
      
      notification = {
        type: "webgl.error.general",
        timestamp: new Date(),
        error: {
          id: `batch-${Date.now()}`,
          message: aggregatedMessage,
          timestamp: new Date(),
          count: batch.totalCount,
        },
        severity: batch.totalCount > 100 ? "error" : "warning",
      };
    }

    await sendWebGLNotification(notification);
  }

  private createShaderErrorSummary(errors: ShaderCompilationError[], errorType: string): string {
    const count = errors.length;
    const shaderType = errors[0].shaderType || 'program';
    
    if (count === 1) {
      return errors[0].errorLog;
    }

    const uniqueErrors = new Set(errors.map(e => e.errorLog));
    const errorList = Array.from(uniqueErrors).slice(0, 3).join('\n');
    
    return `${count} ${shaderType} ${errorType} errors:\n${errorList}${
      uniqueErrors.size > 3 ? `\n... and ${uniqueErrors.size - 3} more` : ''
    }`;
  }

  private createWebGLErrorSummary(
    errorType: string,
    totalCount: number,
    uniqueMessages: Set<string>
  ): string {
    const [errorCode, operation] = errorType.split(':');
    
    if (totalCount === 1) {
      return Array.from(uniqueMessages)[0];
    }

    // Special handling for common repetitive errors
    if (errorCode === 'INVALID_OPERATION' && operation === 'useProgram') {
      return `WebGL: INVALID_OPERATION: useProgram: program not valid (${totalCount} occurrences)`;
    }
    
    if (errorCode === 'INVALID_OPERATION' && operation === 'drawElements') {
      return `WebGL: INVALID_OPERATION: drawElements: no valid shader program in use (${totalCount} occurrences)`;
    }

    // Generic aggregation
    const messagePreview = Array.from(uniqueMessages).slice(0, 2).join('; ');
    return `${errorCode} in ${operation} (${totalCount} occurrences): ${messagePreview}${
      uniqueMessages.size > 2 ? ` ... and ${uniqueMessages.size - 2} more variations` : ''
    }`;
  }

  destroy(): void {
    this.stop();
  }

  isCollecting(): boolean {
    return this.isActive;
  }

  getTotalErrorCount(): number {
    return this.totalErrorCount;
  }
}

// Create instance with configuration
export const createErrorAggregator = (config?: AggregatorConfig): ErrorAggregator => {
  return new ErrorAggregator(config);
};

// Default instance
export const errorAggregator = new ErrorAggregator();