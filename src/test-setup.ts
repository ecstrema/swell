import { vi } from 'vitest';
import { File as NodeFile } from 'node:buffer';

// Polyfill File API with Node.js native File which has arrayBuffer() method
global.File = NodeFile as typeof File;

// Mock HTMLCanvasElement.getContext to suppress warnings in tests
HTMLCanvasElement.prototype.getContext = vi.fn(() => {
    return {
        fillStyle: '',
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        strokeStyle: '',
        strokeRect: vi.fn(),
        font: '',
        fillText: vi.fn(),
        strokeText: vi.fn(),
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        shadowBlur: 0,
        shadowColor: 'rgba(0, 0, 0, 0)',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        textAlign: 'start',
        textBaseline: 'alphabetic',
        canvas: null
    } as any;
}) as any;

// Mock the backend module for all tests  
vi.mock('../backend/pkg/backend', () => ({
    default: vi.fn(),
    add_file_bytes: vi.fn(),
    get_files: vi.fn(() => []),
    remove_file: vi.fn(),
    get_hierarchy_wasm: vi.fn(),
    get_signal_changes_wasm: vi.fn()
}));
