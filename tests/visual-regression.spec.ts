import { test, expect } from '@playwright/test';
import { compareScreenshots, updateBaseline } from './utils/visual-comparison';
import path from 'path';

/**
 * Visual regression tests for the Swell waveform viewer.
 * These tests capture screenshots of the canvas after opening VCD/FST files
 * and compare them with baseline images.
 * 
 * To update baselines, run tests with UPDATE_BASELINES=true environment variable:
 * UPDATE_BASELINES=true npx playwright test
 */

const UPDATE_BASELINES = process.env.UPDATE_BASELINES === 'true';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to initialize
    await page.waitForLoadState('networkidle');
    
    // Give WASM time to initialize
    await page.waitForTimeout(1000);
  });

  test('should render empty canvas correctly', async ({ page }) => {
    const testName = 'empty-canvas';
    
    // Wait for the canvas elements to be present
    await page.waitForSelector('canvas', { timeout: 5000 });
    
    // Take screenshot of the entire page
    const screenshot = await page.screenshot({ fullPage: true });
    
    const baselinePath = path.join(__dirname, 'baselines', `${testName}.png`);
    
    if (UPDATE_BASELINES) {
      await updateBaseline(baselinePath, screenshot);
      console.log(`✓ Updated baseline for ${testName}`);
    } else {
      const result = await compareScreenshots(baselinePath, screenshot);
      expect(result.match).toBe(true);
      
      if (!result.match) {
        console.log(`✗ Visual regression detected for ${testName}`);
        console.log(`  Difference: ${result.diffPercentage?.toFixed(2)}%`);
      }
    }
  });

  test('should render canvas with signals tree', async ({ page }) => {
    const testName = 'canvas-with-signals';
    
    // Wait for both trees to render
    await page.waitForSelector('canvas', { timeout: 5000 });
    
    // Get the canvas container
    const signalsTree = page.locator('[class*="resizable"]').last();
    await signalsTree.waitFor({ state: 'visible' });
    
    // Take screenshot
    const screenshot = await page.screenshot({ fullPage: true });
    
    const baselinePath = path.join(__dirname, 'baselines', `${testName}.png`);
    
    if (UPDATE_BASELINES) {
      await updateBaseline(baselinePath, screenshot);
      console.log(`✓ Updated baseline for ${testName}`);
    } else {
      const result = await compareScreenshots(baselinePath, screenshot);
      expect(result.match).toBe(true);
      
      if (!result.match) {
        console.log(`✗ Visual regression detected for ${testName}`);
        console.log(`  Difference: ${result.diffPercentage?.toFixed(2)}%`);
      }
    }
  });

  // This test is a placeholder for when VCD file loading is implemented
  test.skip('should render VCD file correctly', async ({ page }) => {
    const testName = 'vcd-file-simple';
    
    // TODO: Implement file upload/loading mechanism
    // For now, this test is skipped until the file loading feature is complete
    
    // Future implementation:
    // 1. Upload or load the simple.vcd file
    // 2. Wait for signals to render
    // 3. Take screenshot
    // 4. Compare with baseline
    
    const screenshot = await page.screenshot({ fullPage: true });
    const baselinePath = path.join(__dirname, 'baselines', `${testName}.png`);
    
    if (UPDATE_BASELINES) {
      await updateBaseline(baselinePath, screenshot);
      console.log(`✓ Updated baseline for ${testName}`);
    } else {
      const result = await compareScreenshots(baselinePath, screenshot);
      expect(result.match).toBe(true);
    }
  });

  // This test is a placeholder for when FST file loading is implemented
  test.skip('should render FST file correctly', async ({ page }) => {
    const testName = 'fst-file-simple';
    
    // TODO: Implement file upload/loading mechanism
    // For now, this test is skipped until the file loading feature is complete
    
    const screenshot = await page.screenshot({ fullPage: true });
    const baselinePath = path.join(__dirname, 'baselines', `${testName}.png`);
    
    if (UPDATE_BASELINES) {
      await updateBaseline(baselinePath, screenshot);
      console.log(`✓ Updated baseline for ${testName}`);
    } else {
      const result = await compareScreenshots(baselinePath, screenshot);
      expect(result.match).toBe(true);
    }
  });

  test('should handle window resize correctly', async ({ page }) => {
    const testName = 'canvas-resized';
    
    // Resize the viewport
    await page.setViewportSize({ width: 1600, height: 900 });
    
    // Wait for canvas to adjust
    await page.waitForTimeout(500);
    await page.waitForSelector('canvas', { timeout: 5000 });
    
    const screenshot = await page.screenshot({ fullPage: true });
    const baselinePath = path.join(__dirname, 'baselines', `${testName}.png`);
    
    if (UPDATE_BASELINES) {
      await updateBaseline(baselinePath, screenshot);
      console.log(`✓ Updated baseline for ${testName}`);
    } else {
      const result = await compareScreenshots(baselinePath, screenshot);
      expect(result.match).toBe(true);
      
      if (!result.match) {
        console.log(`✗ Visual regression detected for ${testName}`);
        console.log(`  Difference: ${result.diffPercentage?.toFixed(2)}%`);
      }
    }
  });
});
