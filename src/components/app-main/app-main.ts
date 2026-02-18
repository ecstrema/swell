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
        const extensionRegistry = this.commandManager.getExtensionRegistry();
        await extensionRegistry.register(CoreUIExtension);
    }

    disconnectedCallback() {
        // Clean up command manager (includes shortcuts and command palette)
        this.commandManager.deactivate();
    }
}


if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
