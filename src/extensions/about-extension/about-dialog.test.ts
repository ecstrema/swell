import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AboutDialog } from './about-dialog.js';

describe('AboutDialog', () => {
    let dialog: AboutDialog;

    beforeEach(() => {
        dialog = new AboutDialog();
        document.body.appendChild(dialog);
    });

    afterEach(() => {
        if (dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
    });

    it('should be hidden by default', () => {
        expect(dialog.classList.contains('open')).toBe(false);
    });

    it('should open when open() is called', () => {
        dialog.open();
        expect(dialog.classList.contains('open')).toBe(true);
    });

    it('should close when close() is called', () => {
        dialog.open();
        expect(dialog.classList.contains('open')).toBe(true);
        
        dialog.close();
        expect(dialog.classList.contains('open')).toBe(false);
    });

    it('should toggle between open and closed states', () => {
        expect(dialog.classList.contains('open')).toBe(false);
        
        dialog.toggle();
        expect(dialog.classList.contains('open')).toBe(true);
        
        dialog.toggle();
        expect(dialog.classList.contains('open')).toBe(false);
    });

    it('should contain the application name', () => {
        const shadowRoot = dialog.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        const title = shadowRoot!.querySelector('.dialog-title');
        expect(title).not.toBeNull();
        expect(title!.textContent).toContain('Swell');
    });

    it('should contain GitHub link', () => {
        const shadowRoot = dialog.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        const link = shadowRoot!.querySelector('.github-link');
        expect(link).not.toBeNull();
        expect(link!.getAttribute('href')).toBe('https://github.com/ecstrema/swell');
    });

    it('should display build commit information', () => {
        const shadowRoot = dialog.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        const infoRows = shadowRoot!.querySelectorAll('.info-row');
        expect(infoRows.length).toBeGreaterThan(0);
        
        // Check if there's a row for build commit
        const commitRow = Array.from(infoRows).find(row => 
            row.textContent?.includes('Build Commit')
        );
        expect(commitRow).not.toBeNull();
    });

    it('should have a close button', () => {
        const shadowRoot = dialog.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        const closeBtn = shadowRoot!.querySelector('.close-btn');
        expect(closeBtn).not.toBeNull();
    });

    it('should close when close button is clicked', () => {
        dialog.open();
        expect(dialog.classList.contains('open')).toBe(true);
        
        const shadowRoot = dialog.shadowRoot;
        const closeBtn = shadowRoot!.querySelector('.close-btn') as HTMLButtonElement;
        closeBtn.click();
        
        expect(dialog.classList.contains('open')).toBe(false);
    });

    it('should display build time information when available', () => {
        const shadowRoot = dialog.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        // If build timestamp is available, should display build time info
        if (import.meta.env.VITE_BUILD_TIMESTAMP) {
            const infoRows = shadowRoot!.querySelectorAll('.info-row');
            const buildTimeRow = Array.from(infoRows).find(row => 
                row.textContent?.includes('Built')
            );
            expect(buildTimeRow).not.toBeNull();
            
            // Should have a tooltip with the exact date
            const buildTimeValue = buildTimeRow!.querySelector('.build-time');
            expect(buildTimeValue).not.toBeNull();
            expect(buildTimeValue!.getAttribute('title')).toBeTruthy();
        }
    });
});
