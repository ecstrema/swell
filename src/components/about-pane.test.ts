import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AboutPane } from './about-pane.js';

describe('AboutPane', () => {
    let pane: AboutPane;

    beforeEach(() => {
        pane = new AboutPane();
        document.body.appendChild(pane);
    });

    afterEach(() => {
        if (pane.parentNode) {
            pane.parentNode.removeChild(pane);
        }
    });

    it('should be visible when added to DOM', () => {
        expect(pane.isConnected).toBe(true);
    });

    it('should contain the application name', () => {
        const shadowRoot = pane.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        const title = shadowRoot!.querySelector('.about-title');
        expect(title).not.toBeNull();
        expect(title!.textContent).toContain('Swell');
    });

    it('should contain GitHub link', () => {
        const shadowRoot = pane.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        const link = shadowRoot!.querySelector('.github-link');
        expect(link).not.toBeNull();
        expect(link!.getAttribute('href')).toBe('https://github.com/ecstrema/swell');
    });

    it('should display build commit information', () => {
        const shadowRoot = pane.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        const infoRows = shadowRoot!.querySelectorAll('.info-row');
        expect(infoRows.length).toBeGreaterThan(0);
        
        // Check if there's a row for build commit
        const commitRow = Array.from(infoRows).find(row => 
            row.textContent?.includes('Build Commit')
        );
        expect(commitRow).not.toBeNull();
    });

    it('should display version information', () => {
        const shadowRoot = pane.shadowRoot;
        expect(shadowRoot).not.toBeNull();
        
        const version = shadowRoot!.querySelector('.about-version');
        expect(version).not.toBeNull();
        expect(version!.textContent).toContain('Version');
    });
});
