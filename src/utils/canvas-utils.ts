/**
 * Utility functions for canvas element handling with high-DPI display support
 */

/**
 * Sets up a canvas element with proper device pixel ratio scaling to prevent blurry rendering.
 * 
 * On high-DPI displays (like Retina), the canvas internal resolution must be scaled by the
 * device pixel ratio to match the physical pixel density. This function:
 * 1. Sets the canvas internal dimensions to displaySize * devicePixelRatio
 * 2. Sets the canvas CSS size to displaySize
 * 3. Scales the 2D context by devicePixelRatio so drawing code works with CSS pixels
 * 
 * @param canvas - The canvas element to configure
 * @param width - The display width in CSS pixels
 * @param height - The display height in CSS pixels
 * @returns The 2D rendering context if available, null otherwise
 */
export function setupCanvasForHighDPI(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  
  // Set the internal canvas size to match physical pixels
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  // Set the CSS size to match the desired display size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  // Get the context and scale it so drawing code can use CSS pixels
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  
  return ctx;
}
