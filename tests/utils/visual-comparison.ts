import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs/promises';
import path from 'path';

export interface ComparisonResult {
  match: boolean;
  diffPixels?: number;
  diffPercentage?: number;
  diffImage?: Buffer;
}

/**
 * Compare two screenshots and return the result.
 * @param baselinePath - Path to the baseline image
 * @param screenshot - Buffer of the new screenshot
 * @param threshold - Matching threshold (0 to 1), defaults to 0.1 (10%)
 * @returns Comparison result
 */
export async function compareScreenshots(
  baselinePath: string,
  screenshot: Buffer,
  threshold: number = 0.1
): Promise<ComparisonResult> {
  try {
    // Check if baseline exists
    try {
      await fs.access(baselinePath);
    } catch {
      // Baseline doesn't exist, create it
      console.warn(`⚠ Baseline not found at ${baselinePath}. Creating new baseline.`);
      await updateBaseline(baselinePath, screenshot);
      return { match: true };
    }

    // Read baseline image
    const baselineBuffer = await fs.readFile(baselinePath);
    const baselineImg = PNG.sync.read(baselineBuffer);
    const screenshotImg = PNG.sync.read(screenshot);

    // Check if dimensions match
    if (
      baselineImg.width !== screenshotImg.width ||
      baselineImg.height !== screenshotImg.height
    ) {
      console.warn(
        `⚠ Image dimensions don't match. Baseline: ${baselineImg.width}x${baselineImg.height}, Screenshot: ${screenshotImg.width}x${screenshotImg.height}`
      );
      return {
        match: false,
        diffPixels: baselineImg.width * baselineImg.height,
        diffPercentage: 100,
      };
    }

    // Create diff image
    const { width, height } = baselineImg;
    const diff = new PNG({ width, height });

    // Compare images
    const diffPixels = pixelmatch(
      baselineImg.data,
      screenshotImg.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 } // pixelmatch threshold (0 to 1), lower = more strict
    );

    const totalPixels = width * height;
    const diffPercentage = (diffPixels / totalPixels) * 100;

    // Consider a match if less than threshold% of pixels are different
    const match = diffPercentage < threshold;

    if (!match) {
      // Save diff image for inspection
      const diffPath = baselinePath.replace('.png', '-diff.png');
      await fs.writeFile(diffPath, PNG.sync.write(diff));
      console.log(`💾 Diff image saved to: ${diffPath}`);

      // Save the actual screenshot for comparison
      const actualPath = baselinePath.replace('.png', '-actual.png');
      await fs.writeFile(actualPath, screenshot);
      console.log(`💾 Actual screenshot saved to: ${actualPath}`);
    }

    return {
      match,
      diffPixels,
      diffPercentage,
      diffImage: PNG.sync.write(diff),
    };
  } catch (error) {
    console.error('Error comparing screenshots:', error);
    throw error;
  }
}

/**
 * Update the baseline image with a new screenshot.
 * @param baselinePath - Path where the baseline should be saved
 * @param screenshot - Buffer of the new screenshot
 */
export async function updateBaseline(
  baselinePath: string,
  screenshot: Buffer
): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(baselinePath);
    await fs.mkdir(dir, { recursive: true });

    // Write baseline
    await fs.writeFile(baselinePath, screenshot);
    console.log(`✓ Baseline saved to: ${baselinePath}`);
  } catch (error) {
    console.error('Error updating baseline:', error);
    throw error;
  }
}

/**
 * Clean up diff and actual images from previous test runs.
 * @param baselinesDir - Directory containing baseline images
 */
export async function cleanupTestArtifacts(baselinesDir: string): Promise<void> {
  try {
    const files = await fs.readdir(baselinesDir);
    const artifactFiles = files.filter(
      (f) => f.endsWith('-diff.png') || f.endsWith('-actual.png')
    );

    for (const file of artifactFiles) {
      await fs.unlink(path.join(baselinesDir, file));
    }

    if (artifactFiles.length > 0) {
      console.log(`🧹 Cleaned up ${artifactFiles.length} test artifact(s)`);
    }
  } catch (error) {
    // Ignore errors if directory doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error cleaning up test artifacts:', error);
    }
  }
}
