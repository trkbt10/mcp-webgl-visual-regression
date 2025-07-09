export type ScreenshotOptions = {
  testCase?: string;
  format?: "png" | "jpeg";
  fullPage?: boolean;
  encoding?: "base64" | "binary";
  quality?: number; // For JPEG only
  selector?: string; // CSS selector for element to capture
  captureCanvas?: boolean; // Capture only canvas elements
};

export type ScreenshotResult = {
  path: string;
  filename: string;
  data: string | Buffer;
  timestamp: Date;
  metadata: {
    testCase?: string;
    viewport: {
      width: number;
      height: number;
    };
  };
};

export type ComparisonResult = {
  match: boolean;
  difference?: number; // Percentage difference
  diffImagePath?: string;
  diffImageData?: Buffer;
};