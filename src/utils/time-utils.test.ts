import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatTimeAgo, formatDateTime } from './time-utils.js';

describe('time-utils', () => {
    describe('formatTimeAgo', () => {
        beforeEach(() => {
            // Mock Date.now() to return a fixed timestamp
            vi.useFakeTimers({ now: new Date('2024-01-15T12:00:00Z') });
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should format seconds ago', () => {
            const timestamp = new Date('2024-01-15T11:59:30Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('30 seconds ago');
        });

        it('should handle 1 second ago', () => {
            const timestamp = new Date('2024-01-15T11:59:59Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('1 second ago');
        });

        it('should format minutes ago', () => {
            const timestamp = new Date('2024-01-15T11:45:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('15 minutes ago');
        });

        it('should handle 1 minute ago', () => {
            const timestamp = new Date('2024-01-15T11:59:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('1 minute ago');
        });

        it('should format hours ago', () => {
            const timestamp = new Date('2024-01-15T09:00:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('3 hours ago');
        });

        it('should handle 1 hour ago', () => {
            const timestamp = new Date('2024-01-15T11:00:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('1 hour ago');
        });

        it('should format days ago', () => {
            const timestamp = new Date('2024-01-12T12:00:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('3 days ago');
        });

        it('should handle 1 day ago', () => {
            const timestamp = new Date('2024-01-14T12:00:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('1 day ago');
        });

        it('should format months ago', () => {
            const timestamp = new Date('2023-10-15T12:00:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('3 months ago');
        });

        it('should handle 1 month ago', () => {
            const timestamp = new Date('2023-12-15T12:00:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('1 month ago');
        });

        it('should format years ago', () => {
            const timestamp = new Date('2021-01-15T12:00:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('3 years ago');
        });

        it('should handle 1 year ago', () => {
            const timestamp = new Date('2023-01-15T12:00:00Z').toISOString();
            expect(formatTimeAgo(timestamp)).toBe('1 year ago');
        });
    });

    describe('formatDateTime', () => {
        it('should format date and time in a readable format', () => {
            const timestamp = '2024-01-15T15:45:00Z';
            const result = formatDateTime(timestamp);
            
            // The result depends on locale, but should include the date components
            expect(result).toContain('2024');
            expect(result).toContain('January');
            expect(result).toContain('15');
        });

        it('should handle different timestamps', () => {
            const timestamp = '2023-12-25T10:30:00Z';
            const result = formatDateTime(timestamp);
            
            expect(result).toContain('2023');
            expect(result).toContain('December');
            expect(result).toContain('25');
        });
    });
});
