# Visual Regression Testing

This directory contains visual regression tests for the Swell waveform viewer. These tests capture screenshots of the canvas after opening VCD/FST files and compare them with baseline images stored in the repository.

## Directory Structure

```
tests/
├── baselines/           # Baseline images for comparison
│   ├── empty-canvas.png
│   ├── canvas-with-signals.png
│   └── ...
├── fixtures/            # Test data files (VCD, FST, etc.)
│   └── simple.vcd
├── utils/              # Utility functions for image comparison
│   └── visual-comparison.ts
└── visual-regression.spec.ts  # Test specifications
```

## Running Tests

### Run visual regression tests
```bash
npm run test:visual
```

### Update baseline images
When you make intentional UI changes, you need to update the baseline images:

```bash
npm run test:visual:update
```

Or with environment variable:
```bash
UPDATE_BASELINES=true npm run test:visual
```

### Run tests with UI mode (interactive)
```bash
npm run test:visual:ui
```

## How It Works

1. **Test Execution**: Tests navigate to the app, wait for it to load, and capture screenshots
2. **Comparison**: Screenshots are compared pixel-by-pixel with baseline images using `pixelmatch`
3. **Thresholds**: A default threshold of 0.1 (10%) difference is allowed to account for minor rendering variations
4. **Artifacts**: If differences are detected:
   - `*-diff.png`: Highlights the differences in red
   - `*-actual.png`: The current screenshot for manual comparison

## Writing New Tests

To add a new visual regression test:

1. Add your test to `visual-regression.spec.ts`:
```typescript
test('should render my new feature', async ({ page }) => {
  const testName = 'my-new-feature';
  
  // Set up your test scenario
  await page.click('button#my-feature');
  await page.waitForTimeout(500);
  
  // Capture screenshot
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
```

2. Run the test with `UPDATE_BASELINES=true` to create the initial baseline
3. Commit the baseline image to the repository

## CI Integration

Visual regression tests should be run in CI to catch unintended UI changes. The baseline images are stored in the repository and compared against in the CI environment.

## Notes

- Baseline images should be committed to the repository
- When making intentional UI changes, update baselines and commit them with your PR
- Use `.gitignore` to exclude diff and actual artifacts (`*-diff.png`, `*-actual.png`)
- Tests currently skip VCD/FST file loading tests until the feature is fully implemented

## Troubleshooting

### Tests failing with dimension mismatch
This can happen if screenshots are taken on different screen sizes or device pixel ratios. Ensure consistent viewport sizes in test configuration.

### High diff percentage on minor changes
Adjust the threshold parameter in `compareScreenshots()` if needed, but be cautious not to make it too lenient.

### Baseline not found
If a baseline doesn't exist, the test will automatically create it on first run. Review the generated baseline before committing.
