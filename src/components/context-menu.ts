import { css } from "../utils/css-utils.js";
import contextMenuCss from "./context-menu.css?inline";

export interface ContextMenuItem {
    id: string;
    label: string;
    disabled?: boolean;
    separator?: boolean;
    handler?: () => void;
}

/**
 * Context Menu - A reusable right-click context menu component
 * Shows a list of menu items at the cursor position when opened
 */
export class ContextMenu extends HTMLElement {
    private _items: ContextMenuItem[] = [];
    private menuContainer: HTMLDivElement | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(contextMenuCss)];

        this.shadowRoot!.innerHTML = `
            <div class="menu-container"></div>
        `;

        this.menuContainer = this.shadowRoot!.querySelector('.menu-container');
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Close on click outside
        document.addEventListener('click', () => {
            this.close();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.classList.contains('open')) {
                this.close();
            }
        });

        // Prevent clicks inside the menu from bubbling and closing it immediately
        this.menuContainer?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    get items(): ContextMenuItem[] {
        return this._items;
    }

    set items(value: ContextMenuItem[]) {
        this._items = value;
        this.render();
    }

    private render() {
        if (!this.menuContainer) return;

        this.menuContainer.innerHTML = '';

        if (this._items.length === 0) {
            this.menuContainer.innerHTML = '<div class="empty-state">No items</div>';
            return;
        }

        this._items.forEach((item) => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.className = 'menu-separator';
                this.menuContainer!.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                if (item.disabled) {
                    menuItem.classList.add('disabled');
                }
                menuItem.textContent = item.label;
                menuItem.dataset.id = item.id;

                if (!item.disabled && item.handler) {
                    menuItem.addEventListener('click', () => {
                        item.handler!();
                        this.close();
                    });
                }

                this.menuContainer!.appendChild(menuItem);
            }
        });
    }

    /**
     * Opens the context menu at the specified position
     * @param x X coordinate (typically mouse event clientX)
     * @param y Y coordinate (typically mouse event clientY)
     */
    open(x: number, y: number) {
        this.classList.add('open');

        // Position the menu
        if (this.menuContainer) {
            this.menuContainer.style.left = `${x}px`;
            this.menuContainer.style.top = `${y}px`;

            // Adjust position if menu would go off-screen
            requestAnimationFrame(() => {
                if (this.menuContainer) {
                    const rect = this.menuContainer.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;

                    let adjustedX = x;
                    let adjustedY = y;

                    // Adjust horizontal position
                    if (rect.right > viewportWidth) {
                        adjustedX = viewportWidth - rect.width - 5;
                    }

                    // Adjust vertical position
                    if (rect.bottom > viewportHeight) {
                        adjustedY = viewportHeight - rect.height - 5;
                    }

                    // Ensure menu doesn't go off the left or top edge
                    adjustedX = Math.max(5, adjustedX);
                    adjustedY = Math.max(5, adjustedY);

                    this.menuContainer.style.left = `${adjustedX}px`;
                    this.menuContainer.style.top = `${adjustedY}px`;
                }
            });
        }
    }

    close() {
        this.classList.remove('open');
    }

    toggle(x: number, y: number) {
        if (this.classList.contains('open')) {
            this.close();
        } else {
            this.open(x, y);
        }
    }
}

customElements.define('context-menu', ContextMenu);
