import { css } from "../../utils/css-utils.js";
import { scrollbarSheet } from "../../styles/shared-sheets.js";
import tabBarCss from "./tab-bar.css?inline";

export interface Tab {
    id: string;
    label: string;
    active: boolean;
}

export class TabBar extends HTMLElement {
    private _tabs: Tab[] = [];
    private tabContainer: HTMLDivElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(tabBarCss)];

        this.shadowRoot!.innerHTML = `
        <div class="tab-bar"></div>
        `;

        this.tabContainer = this.shadowRoot!.querySelector('.tab-bar') as HTMLDivElement;
    }

    set tabs(newTabs: Tab[]) {
        this._tabs = newTabs;
        this.render();
    }

    get tabs() {
        return this._tabs;
    }

    render() {
        this.tabContainer.innerHTML = '';

        this._tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = `tab ${tab.active ? 'active' : ''}`;

            const label = document.createElement('span');
            label.textContent = tab.label;
            tabEl.appendChild(label);

            const closeBtn = document.createElement('div');
            closeBtn.className = 'tab-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('tab-close', {
                    detail: { id: tab.id },
                    bubbles: true,
                    composed: true
                }));
            });
            tabEl.appendChild(closeBtn);

            tabEl.addEventListener('click', () => {
                 this.dispatchEvent(new CustomEvent('tab-select', {
                    detail: { id: tab.id },
                    bubbles: true,
                    composed: true
                }));
            });

            this.tabContainer.appendChild(tabEl);
        });
    }
}

if (!customElements.get('app-tab-bar')) {
    customElements.define('app-tab-bar', TabBar);
}
