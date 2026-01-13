import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Check if the test is running in update mode.
 * This is controlled by the UPDATE_SNAPSHOTS environment variable.
 */
export function isUpdateMode(): boolean {
  return process.env.UPDATE_SNAPSHOTS === 'true' || process.env.UPDATE_SNAPSHOTS === '1';
}

/**
 * Compare two image buffers and return the number of different pixels.
 * @param img1 - First image buffer
 * @param img2 - Second image buffer
 * @param width - Image width
 * @param height - Image height
 * @param threshold - Pixel matching threshold (0-1), default 0.1
 * @returns Number of different pixels
 */
export function compareImages(
  img1: Buffer,
  img2: Buffer,
  width: number,
  height: number,
  threshold = 0.1
): number {
  const diff = new PNG({ width, height });
  return pixelmatch(img1, img2, diff.data, width, height, { threshold });
}

/**
 * Save a PNG image to disk.
 * @param buffer - Image buffer
 * @param width - Image width
 * @param height - Image height
 * @param filepath - Path to save the image
 */
export function saveImage(buffer: Buffer, width: number, height: number, filepath: string): void {
  const dirPath = path.dirname(filepath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const png = new PNG({ width, height });
  png.data = buffer;
  const pngBuffer = PNG.sync.write(png);
  fs.writeFileSync(filepath, pngBuffer);
}

/**
 * Load a PNG image from disk.
 * @param filepath - Path to the image file
 * @returns Object containing the image data, width, and height
 */
export function loadImage(filepath: string): { data: Buffer; width: number; height: number } | null {
  if (!fs.existsSync(filepath)) {
    return null;
  }

  const pngBuffer = fs.readFileSync(filepath);
  const png = PNG.sync.read(pngBuffer);
  return {
    data: png.data,
    width: png.width,
    height: png.height,
  };
}

/**
 * Capture a canvas as an image buffer.
 * @param canvas - HTMLCanvasElement to capture
 * @returns Image buffer with RGBA data
 */
export function captureCanvas(canvas: HTMLCanvasElement): Buffer {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2d context from canvas');
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return Buffer.from(imageData.data);
}

/**
 * Compare a canvas with a reference image.
 * If in update mode, saves the canvas as the new reference.
 * Otherwise, compares with the existing reference and returns the diff count.
 * 
 * @param canvas - HTMLCanvasElement to compare
 * @param snapshotPath - Path to the reference snapshot image
 * @param threshold - Pixel matching threshold (0-1), default 0.1
 * @returns Object with pass status and number of different pixels
 */
export function compareCanvasWithSnapshot(
  canvas: HTMLCanvasElement,
  snapshotPath: string,
  threshold = 0.1
): { pass: boolean; diffPixels: number; message: string } {
  const actualBuffer = captureCanvas(canvas);
  const width = canvas.width;
  const height = canvas.height;

  if (isUpdateMode()) {
    // Save the current canvas as the new reference
    saveImage(actualBuffer, width, height, snapshotPath);
    return {
      pass: true,
      diffPixels: 0,
      message: `Snapshot updated: ${snapshotPath}`,
    };
  }

  // Load the reference image
  const reference = loadImage(snapshotPath);

  if (!reference) {
    // No reference exists, save the current canvas as the first reference
    saveImage(actualBuffer, width, height, snapshotPath);
    return {
      pass: true,
      diffPixels: 0,
      message: `Snapshot created: ${snapshotPath}`,
    };
  }

  // Check dimensions match
  if (reference.width !== width || reference.height !== height) {
    return {
      pass: false,
      diffPixels: -1,
      message: `Image dimensions mismatch. Expected ${reference.width}x${reference.height}, got ${width}x${height}`,
    };
  }

  // Compare images
  const diffPixels = compareImages(actualBuffer, reference.data, width, height, threshold);
  const totalPixels = width * height;
  const diffPercentage = (diffPixels / totalPixels) * 100;

  return {
    pass: diffPixels === 0,
    diffPixels,
    message: diffPixels === 0
      ? 'Images match'
      : `Images differ by ${diffPixels} pixels (${diffPercentage.toFixed(2)}%)`,
  };
}
