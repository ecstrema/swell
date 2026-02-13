import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateDocumentTitle } from './title-utils';

describe('updateDocumentTitle', () => {
    let originalTitle: string;

    beforeEach(() => {
        originalTitle = document.title;
    });

    afterEach(() => {
        document.title = originalTitle;
    });

    it('should set title to "Swell" when fileId is null', () => {
        updateDocumentTitle(null);
        expect(document.title).toBe('Swell');
    });

    it('should set title with filename and "Swell" for simple filename', () => {
        updateDocumentTitle('example.vcd');
        expect(document.title).toBe('example.vcd - Swell');
    });

    it('should extract filename from Unix path', () => {
        updateDocumentTitle('/path/to/file/test.fst');
        expect(document.title).toBe('test.fst - Swell');
    });

    it('should extract filename from Windows path', () => {
        updateDocumentTitle('C:\\Users\\Documents\\waveform.ghw');
        expect(document.title).toBe('waveform.ghw - Swell');
    });

    it('should extract filename from mixed path separators', () => {
        updateDocumentTitle('/path/to\\mixed/file.vcd');
        expect(document.title).toBe('file.vcd - Swell');
    });

    it('should handle empty string by setting to "Swell"', () => {
        updateDocumentTitle('');
        expect(document.title).toBe('Swell');
    });

    it('should use full path if no separators found', () => {
        updateDocumentTitle('standalone.vcd');
        expect(document.title).toBe('standalone.vcd - Swell');
    });
});
