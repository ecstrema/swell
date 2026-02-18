import { getAllExtensions } from "../../extensions/all-extensions.js";
import { css } from "../../utils/css-utils.js";
import appMainCss from "./app-main.css?inline";
import { DockManager } from "../../extensions/dock-extension/dock-manager.js";
import { MenuBar } from "../../extensions/menu-extension/menu-bar.js";
import { MenuExtension } from "../../extensions/menu-extension/menu-extension.js";
import { ExtensionRegistry } from "../../extensions/extension-registry.js";

export class AppMain extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(appMainCss)];
        this.shadowRoot!.innerHTML = `
        <app-menu-bar></app-menu-bar>
        <dock-manager id="main-dock"></dock-manager>
        `;
    }

    async connectedCallback() {
        const extensionRegistry = new ExtensionRegistry();

        // Register every extension listed in extensions.json directly.
        // The registry handles transitive dependency resolution.
        for (const Extension of getAllExtensions()) {
            await extensionRegistry.register(Extension);
        }

        // Initialize the dock system
        const dockManagerElement = this.shadowRoot!.getElementById('main-dock') as DockManager;
        const dockExtension = await extensionRegistry.getExtension<any>('core/dock');
        if (dockExtension && typeof dockExtension.initializeDockSystem === 'function') {
            dockExtension.initializeDockSystem(dockManagerElement);
        } else {
            console.error('Failed to initialize dock system: Dock extension not found or invalid API');
        }

        // Set up the menu bar
        const menuBarElement = this.shadowRoot!.querySelector('app-menu-bar') as MenuBar;
        const menuExtension = await extensionRegistry.getExtension<MenuExtension>('core/menu');
        if (menuExtension && typeof menuExtension.setMenuBar === 'function') {
            menuExtension.setMenuBar(menuBarElement);
        } else {
            console.error('Failed to initialize menu bar: Menu extension not found or invalid API');
        }
    }

    disconnectedCallback() {
    }
}

if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
