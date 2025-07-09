import sharp from "sharp";
import path from "path";
import { promises as fs } from "fs";
import type { ComparisonResult } from "./types.js";
import { ensureDirectory, generateTimestamp } from "../utils/file.js";

const DIFF_DIR = path.join(process.cwd(), "screenshots", "diffs");

export const compareScreenshots = async (
  baselinePath: string,
  currentPath: string,
  threshold = 0.1, // 0.1% difference threshold
): Promise<ComparisonResult> => {
  try {
    // Ensure diff directory exists
    await ensureDirectory(DIFF_DIR);

    // Load images
    const baseline = sharp(baselinePath);
    const current = sharp(currentPath);

    // Get metadata
    const baselineMeta = await baseline.metadata();
    const currentMeta = await current.metadata();

    // Check dimensions
    if (
      baselineMeta.width !== currentMeta.width ||
      baselineMeta.height !== currentMeta.height
    ) {
      return {
        match: false,
        difference: 100,
        diffImagePath: undefined,
      };
    }

    // Convert to raw pixel data
    const baselineBuffer = await baseline.raw().toBuffer();
    const currentBuffer = await current.raw().toBuffer();

    // Calculate pixel differences
    let diffPixels = 0;
    const totalPixels = baselineMeta.width! * baselineMeta.height!;
    const channels = baselineMeta.channels || 3;

    // Create diff image buffer
    const diffBuffer = Buffer.alloc(baselineBuffer.length);

    for (let i = 0; i < baselineBuffer.length; i += channels) {
      let pixelDiff = false;

      for (let c = 0; c < channels; c++) {
        if (Math.abs(baselineBuffer[i + c] - currentBuffer[i + c]) > 5) {
          pixelDiff = true;
          break;
        }
      }

      if (pixelDiff) {
        diffPixels++;
        // Mark different pixels in red
        diffBuffer[i] = 255; // R
        diffBuffer[i + 1] = 0; // G
        diffBuffer[i + 2] = 0; // B
        if (channels === 4) diffBuffer[i + 3] = 255; // A
      } else {
        // Keep original pixel
        for (let c = 0; c < channels; c++) {
          diffBuffer[i + c] = currentBuffer[i + c];
        }
      }
    }

    const differencePercentage = (diffPixels / totalPixels) * 100;
    const match = differencePercentage <= threshold;

    let diffImagePath: string | undefined;
    let diffImageData: Buffer | undefined;

    if (!match) {
      // Save diff image
      const timestamp = generateTimestamp();
      const diffFilename = `diff_${timestamp}.png`;
      diffImagePath = path.join(DIFF_DIR, diffFilename);

      const diffImage = sharp(diffBuffer, {
        raw: {
          width: baselineMeta.width!,
          height: baselineMeta.height!,
          channels: channels as 1 | 2 | 3 | 4,
        },
      });

      diffImageData = await diffImage.png().toBuffer();
      await fs.writeFile(diffImagePath, diffImageData);
    }

    return {
      match,
      difference: differencePercentage,
      diffImagePath,
      diffImageData,
    };
  } catch (error) {
    console.error("Error comparing screenshots:", error);
    throw error;
  }
};