/**
 * About Extension
 * 
 * Provides the about page with application information.
 */

import { Extension, ExtensionContext } from "../types.js";
import { AboutPane } from "../../components/about/about-pane.js";

// Ensure the custom element is registered
if (!customElements.get('about-pane')) {
    customElements.define('about-pane', AboutPane);
}

export class AboutExtension implements Extension {
    readonly metadata = {
        id: 'core/about',
        name: 'About Extension',
        description: 'Provides application information and about page',
        version: '1.0.0',
    };

    async activate(context: ExtensionContext): Promise<void> {
        const paneManager = context.app.getPaneManager?.();
        const dockManager = context.app.getDockManager?.();

        if (!paneManager || !dockManager) {
            console.warn('About extension: PaneManager or DockManager not available');
            return;
        }

        // Register the about page
        context.registerPage({
            id: 'about',
            title: 'About',
            icon: 'ℹ️',
            factory: () => {
                const aboutPane = new AboutPane();
                aboutPane.id = 'about-pane';
                return aboutPane;
            },
        });

        // Register content with dock manager
        dockManager.registerContent('about', () => {
            const aboutPane = new AboutPane();
            aboutPane.id = 'about-pane';
            return aboutPane;
        });

        // Register command to show about
        context.registerCommand({
            id: 'core/view/show-about',
            label: 'Show About',
            description: 'Show application information',
            handler: () => {
                paneManager.activatePane('about-pane', 'About', 'about', true);
            },
        });

        // Register menu item
        context.registerMenu({
            type: 'submenu',
            label: 'Help',
            items: [
                {
                    type: 'item',
                    label: 'About',
                    action: 'core/view/show-about',
                },
            ],
        });
    }
}
