# Swell

Be barrelled.

## What is this?

An experiment in building a new waveform viewer.

## Development

### Testing

Swell includes visual regression tests to ensure UI consistency across changes.

```bash
# Run all tests
npm test

# Run visual regression tests
npm run test:visual

# Update visual snapshots (after intentional UI changes)
npm run test:visual:update
```

See [src/tests/README.md](src/tests/README.md) for detailed information about visual regression testing.
