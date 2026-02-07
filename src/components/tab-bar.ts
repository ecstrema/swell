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

        // Initial Template
        this.shadowRoot!.innerHTML = `
        <style>
            :host {
                display: block;
            }
            .tab-bar {
                display: flex;
                background-color: var(--color-bg-hover);
                border-bottom: 1px solid var(--color-border);
                height: 32px;
                overflow-x: auto;
            }
            .tab {
                padding: 0 10px;
                display: flex;
                align-items: center;
                cursor: pointer;
                background-color: var(--color-bg);
                border-right: 1px solid var(--color-border);
                font-size: 0.9em;
                user-select: none;
                min-width: 100px;
                justify-content: space-between;
                color: var(--color-text);
            }
            .tab:hover {
                background-color: var(--color-bg-surface);
            }
            .tab.active {
                background-color: var(--color-bg-surface);
                border-bottom: 2px solid var(--color-primary);
            }
            .tab-close {
                margin-left: 8px;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
            }
            .tab-close:hover {
                background-color: var(--color-bg-active);
            }
        </style>
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
