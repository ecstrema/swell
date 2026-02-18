import { CoreUIExtension } from "../../extensions/core-ui-extension/index.js";
import { CommandManager } from "../command/command-manager.js";
import { css } from "../../utils/css-utils.js";
import appMainCss from "./app-main.css?inline";
import { DockManager } from "../../extensions/dock-extension/dock-manager.js";
import { MenuBar } from "../../extensions/menu-extension/menu-bar.js";
import { MenuExtension } from "../../extensions/menu-extension/menu-extension.js";

export class AppMain extends HTMLElement {
    private commandManager: CommandManager;

     constructor() {
        super();

        // Initialize command manager (extension registry)
        this.commandManager = new CommandManager();

        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(appMainCss)];

        this.shadowRoot!.innerHTML = `
        <app-menu-bar></app-menu-bar>
        <dock-manager id="main-dock"></dock-manager>
        `;
    }

    async connectedCallback() {
        // Register the Core UI extension (which will recursively register dependencies)
        const extensionRegistry = this.commandManager.getExtensionRegistry();
        await extensionRegistry.register(CoreUIExtension);

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
        // Clean up command manager (includes shortcuts and command palette)
        this.commandManager.deactivate();
    }
}


if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
