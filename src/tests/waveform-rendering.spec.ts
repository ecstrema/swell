import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { TreeItem } from '$lib/canvas/TreeItem.svelte';
import { SwellState } from '$lib/data/SwellState.svelte';
import { getTimelinePainter } from '$lib/canvas/TimelineTreeItem';
import { clockPainter } from '$lib/canvas/painters/clockPainter';
import type { ChangesGenerator } from '$lib/canvas/interfaces';
import { compareCanvasWithSnapshot } from './visual-test-utils';

/**
 * Visual Regression Tests for Canvas Rendering
 * 
 * These tests verify that the canvas rendering output remains consistent
 * when rendering waveforms and timelines.
 * 
 * To update snapshots when UI changes are intentional, run:
 *   npm run test:visual:update
 */

describe('Visual Regression Tests', () => {
  const snapshotsDir = path.join(__dirname, 'snapshots');

  /**
   * Create a canvas element for testing.
   * Uses the canvas package in Node.js environment.
   */
  function createTestCanvas(width: number, height: number): HTMLCanvasElement {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createCanvas } = require('canvas');
      return createCanvas(width, height) as HTMLCanvasElement;
    } catch (error) {
      throw new Error(
        'Canvas creation failed. Make sure the "canvas" npm package is installed.'
      );
    }
  }

  /**
   * Mock changes generator for a clock signal.
   * Generates a simple clock pattern with transitions at regular intervals.
   */
  function* mockClockChanges(start: number): ChangesGenerator<boolean> {
    const CLOCK_PERIOD = 10; // Clock period in time units
    
    // Start with the last value before start
    let time = Math.floor(start / CLOCK_PERIOD) * CLOCK_PERIOD;
    let value = (Math.floor(time / CLOCK_PERIOD) % 2) === 0;

    // Yield initial value
    yield [time, value];

    // Generate transitions
    while (time < 200) {
      time += CLOCK_PERIOD;
      value = !value;
      yield [time, value];
    }
  }

  /**
   * Mock changes generator for an 8-bit counter.
   * Generates a counter pattern that increments at regular intervals.
   */
  function* mockCounterChanges(start: number): ChangesGenerator<number> {
    const COUNTER_PERIOD = 10; // Counter increment period
    const COUNTER_MAX_VALUE = 256; // 8-bit counter max value
    
    let time = Math.floor(start / COUNTER_PERIOD) * COUNTER_PERIOD;
    let value = Math.floor(time / COUNTER_PERIOD) % COUNTER_MAX_VALUE;

    // Yield initial value
    yield [time, value];

    // Generate increments
    while (time < 200) {
      time += COUNTER_PERIOD;
      value = (value + 1) % COUNTER_MAX_VALUE;
      yield [time, value];
    }
  }

  it('should match snapshot when rendering timeline', async () => {
    const canvas = createTestCanvas(800, 60);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Create a SwellState with test configuration
    const swellState = new SwellState();
    swellState.settings.viewStart = 0;
    swellState.settings.viewEnd = 100;
    swellState.settings.simulationStart = 0;
    swellState.settings.simulationEnd = 100;
    swellState.settings.itemHeight = 60;
    swellState.temp.signalsCanvas.width = canvas.width;
    
    // Create a timeline TreeItem
    const timelineItem = new TreeItem({
      name: 'timeline',
      state: swellState,
      painter: getTimelinePainter(swellState),
      children: []
    });
    
    timelineItem.ctx = ctx;
    
    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Paint the timeline
    timelineItem.paintWithChildren();
    
    const snapshotPath = path.join(snapshotsDir, 'timeline.png');
    const result = compareCanvasWithSnapshot(canvas, snapshotPath, 0.1);
    
    expect(result.pass).toBe(true);
    if (!result.pass) {
      console.error(result.message);
    }
  });

  it('should match snapshot when rendering clock signal', async () => {
    const canvas = createTestCanvas(800, 60);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Create a SwellState with test configuration
    const swellState = new SwellState();
    swellState.settings.viewStart = 0;
    swellState.settings.viewEnd = 100;
    swellState.settings.simulationStart = 0;
    swellState.settings.simulationEnd = 100;
    swellState.settings.itemHeight = 60;
    swellState.temp.signalsCanvas.width = canvas.width;
    
    // Create a clock signal TreeItem
    const clockItem = new TreeItem({
      name: 'clk',
      state: swellState,
      painter: clockPainter,
      changes: mockClockChanges,
      children: []
    });
    
    clockItem.ctx = ctx;
    
    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Setup drawing context
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Paint the clock signal
    clockItem.paintWithChildren();
    
    const snapshotPath = path.join(snapshotsDir, 'clock-signal.png');
    const result = compareCanvasWithSnapshot(canvas, snapshotPath, 0.1);
    
    expect(result.pass).toBe(true);
    if (!result.pass) {
      console.error(result.message);
    }
  });

  it('should match snapshot when rendering complete waveform view', async () => {
    const canvas = createTestCanvas(800, 180);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Create a SwellState with test configuration
    const swellState = new SwellState();
    swellState.settings.viewStart = 0;
    swellState.settings.viewEnd = 100;
    swellState.settings.simulationStart = 0;
    swellState.settings.simulationEnd = 100;
    swellState.settings.itemHeight = 60;
    swellState.temp.signalsCanvas.width = canvas.width;
    
    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create timeline
    const timelineCanvas = createTestCanvas(800, 60);
    const timelineCtx = timelineCanvas.getContext('2d')!;
    timelineCtx.fillStyle = 'white';
    timelineCtx.fillRect(0, 0, 800, 60);
    
    const timelineItem = new TreeItem({
      name: 'timeline',
      state: swellState,
      painter: getTimelinePainter(swellState),
      children: []
    });
    timelineItem.ctx = timelineCtx;
    timelineItem.paintWithChildren();
    
    // Create clock signal
    const clockCanvas = createTestCanvas(800, 60);
    const clockCtx = clockCanvas.getContext('2d')!;
    clockCtx.fillStyle = 'white';
    clockCtx.fillRect(0, 0, 800, 60);
    clockCtx.strokeStyle = 'blue';
    clockCtx.lineWidth = 2;
    clockCtx.beginPath();
    
    const clockItem = new TreeItem({
      name: 'clk',
      state: swellState,
      painter: clockPainter,
      changes: mockClockChanges,
      children: []
    });
    clockItem.ctx = clockCtx;
    clockItem.paintWithChildren();
    
    // Create a second clock signal with different phase for variety
    const clock2Canvas = createTestCanvas(800, 60);
    const clock2Ctx = clock2Canvas.getContext('2d')!;
    clock2Ctx.fillStyle = 'white';
    clock2Ctx.fillRect(0, 0, 800, 60);
    clock2Ctx.strokeStyle = 'blue';
    clock2Ctx.lineWidth = 2;
    clock2Ctx.beginPath();
    
    const clock2Item = new TreeItem({
      name: 'clk2',
      state: swellState,
      painter: clockPainter,
      changes: mockClockChanges,
      children: []
    });
    clock2Item.ctx = clock2Ctx;
    clock2Item.paintWithChildren();
    
    // Composite the views: timeline, clock1, clock2
    ctx.drawImage(timelineCanvas, 0, 0);
    ctx.drawImage(clockCanvas, 0, 60);
    ctx.drawImage(clock2Canvas, 0, 120);
    
    const snapshotPath = path.join(snapshotsDir, 'complete-waveform.png');
    const result = compareCanvasWithSnapshot(canvas, snapshotPath, 0.1);
    
    expect(result.pass).toBe(true);
    if (!result.pass) {
      console.error(result.message);
    }
  });
});
