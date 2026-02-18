import { CoreUIExtension } from "../../extensions/core-ui-extension/index.js";
import { CommandManager } from "../command/command-manager.js";
import { css } from "../../utils/css-utils.js";
import appMainCss from "./app-main.css?inline";
import { DockManager } from "../../extensions/dock-extension/dock-manager.js";
import { Extension } from "../../extensions/types.js";

// Setting paths
const SETTING_NETLIST_VISIBLE = 'Interface/Netlist Visible';
const SETTING_UNDO_HISTORY_VISIBLE = 'Interface/Undo History Visible';

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
        // The dock manager element is in the shadow DOM, created by the template
        const dockManagerElement = this.shadowRoot!.getElementById('main-dock') as DockManager;

        // Get the dock extension API
        // It returns the extension instance which implements the API
        const dockExtension = await extensionRegistry.getExtension<any>('core/dock');

        if (dockExtension && typeof dockExtension.initializeDockSystem === 'function') {
            dockExtension.initializeDockSystem(dockManagerElement);
        } else {
            console.error('Failed to initialize dock system: Dock extension not found or invalid API');
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
