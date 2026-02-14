# Example Waveform Files

This directory contains small example waveform files for testing and demonstration purposes.

## Files

### VCD (Value Change Dump) Files

- **simple.vcd** (1.6 KB)
  - Source: ModelSim 10.5b
  - Contains: Clock divider testbench with scopes, comments, and various signal types
  - Features: Demonstrates scope hierarchy, comments in VCD, register and wire signals
  
- **counter.vcd** (927 bytes)
  - Source: Icarus Verilog
  - Contains: Simple testbench with nested module hierarchy
  - Features: Shows nested scopes and 8-bit bus signals

### FST (Fast Signal Trace) Files

- **example.fst** (497 bytes)
  - Compressed waveform format used by GTKWave
  - Features: Small example demonstrating FST format capabilities
  - More efficient storage than VCD for large waveforms

### GHW (GHDL Waveform) Files

- **simple.ghw** (524 bytes)
  - Source: GHDL (VHDL simulator)
  - Features: Demonstrates VHDL signal trace format
  
- **time_test.ghw** (440 bytes)
  - Source: GHDL
  - Features: Time-based signal changes in VHDL format

## Usage

These files can be loaded in Swell to test waveform visualization:

1. Launch Swell application
2. Use **File > Open Example** from the menu bar to quickly load any example file
3. Alternatively, use File > Open or drag-and-drop to load any example file
4. Explore the signal hierarchy and waveform display

**Note:** Example files are also available in `src/public/examples/` for the web version and are automatically copied to the build output.

## License

These example files are derived from the [wellen](https://github.com/ekiwi/wellen) library test suite, which is licensed under MIT.
