# Visual Regression Testing

This directory contains visual regression tests for the Swell waveform viewer. These tests ensure that changes to the rendering logic don't inadvertently alter the visual appearance of the waveforms.

## Overview

Visual regression tests work by:
1. Loading a VCD or FST file
2. Rendering it to a canvas
3. Capturing the canvas as an image
4. Comparing the captured image with a reference snapshot

If the images don't match, the test fails, indicating that the rendering has changed.

## Directory Structure

```
src/tests/
├── fixtures/          # Test waveform files (VCD, FST, etc.)
├── snapshots/         # Reference images for visual comparison
├── visual-test-utils.ts        # Utility functions for visual testing
└── visual-regression.spec.ts   # Visual regression test suite
```

## Running Tests

### Run visual regression tests (compare with snapshots)
```bash
npm run test:visual
```

This will compare the current rendering output with the reference snapshots. If they don't match, the test will fail with information about how many pixels differ.

### Update reference snapshots
```bash
npm run test:visual:update
```

Use this command when you've made intentional changes to the UI that alter the rendering. This will update all reference snapshots with the new rendering output.

**Important:** Only update snapshots when you've verified that the visual changes are correct and intentional!

## Adding New Tests

To add a new visual regression test:

1. **Add a test fixture**: Place your VCD/FST file in `src/tests/fixtures/`

2. **Create a test case**: Add a new test in `visual-regression.spec.ts`:

```typescript
it('should match snapshot when rendering my-file.vcd', async () => {
  const canvas = createTestCanvas(800, 600);
  const ctx = canvas.getContext('2d');
  
  // Load and render your waveform here
  // ... rendering logic ...
  
  const snapshotPath = path.join(snapshotsDir, 'my-file.png');
  const result = compareCanvasWithSnapshot(canvas, snapshotPath);
  
  expect(result.pass).toBe(true);
});
```

3. **Generate the initial snapshot**: Run `npm run test:visual:update` to create the reference image

4. **Verify the snapshot**: Check that the generated snapshot looks correct

5. **Run the test**: Run `npm run test:visual` to verify the test passes

## How It Works

The visual regression testing infrastructure consists of:

### `visual-test-utils.ts`
Provides utility functions for:
- **`compareCanvasWithSnapshot()`**: Main function that compares a canvas with a reference image
- **`captureCanvas()`**: Captures a canvas as an image buffer
- **`compareImages()`**: Uses pixelmatch to compare two images
- **`loadImage()`/`saveImage()`**: Load and save PNG images
- **`isUpdateMode()`**: Checks if running in snapshot update mode

### Environment Variables
- **`UPDATE_SNAPSHOTS`**: Set to `true` or `1` to update reference snapshots instead of comparing

### Image Comparison
The tests use [pixelmatch](https://github.com/mapbox/pixelmatch) for pixel-by-pixel image comparison with configurable threshold (default: 0.1).

## Best Practices

1. **Keep snapshots small**: Use reasonably sized canvases (e.g., 800x600) to keep snapshot files manageable

2. **Commit snapshots**: Reference snapshots should be committed to the repository

3. **Review changes carefully**: When updating snapshots, carefully review the visual changes using `git diff` on the image files

4. **Test meaningful scenarios**: Focus on testing different waveform types, signal representations, and edge cases

5. **Use descriptive names**: Name your snapshot files descriptively (e.g., `clock-signal.png`, `counter-8bit.png`)

## Troubleshooting

### Tests fail with "Images differ by X pixels"
This means the rendering has changed. Either:
- The change is unintentional - fix the rendering bug
- The change is intentional - run `npm run test:visual:update` to update snapshots

### Canvas creation fails
Make sure the `canvas` npm package is installed:
```bash
npm install --save-dev canvas
```

### Font rendering differs between systems
Canvas rendering can vary slightly between different systems due to font rendering differences. The threshold parameter in `compareImages()` accounts for minor differences, but you may need to adjust it if tests are flaky.

## Future Enhancements

- [ ] Integrate with actual VCD/FST file loading from the backend
- [ ] Test different color schemes and themes
- [ ] Test responsive rendering at different canvas sizes
- [ ] Add tests for interactive features (zooming, panning)
- [ ] Generate visual diff images highlighting differences
- [ ] Add CI/CD integration to run visual tests automatically
