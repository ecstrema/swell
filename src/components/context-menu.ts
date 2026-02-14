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
    private boundCloseHandler: () => void;
    private boundKeydownHandler: (e: KeyboardEvent) => void;
    private boundMenuClickHandler: (e: Event) => void;
    private boundMenuItemClickHandler: (e: Event) => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(contextMenuCss)];

        this.shadowRoot!.innerHTML = `
            <div class="menu-container"></div>
        `;

        this.menuContainer = this.shadowRoot!.querySelector('.menu-container');

        // Bind event handlers
        this.boundCloseHandler = () => this.close();
        this.boundKeydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.classList.contains('open')) {
                this.close();
            }
        };
        this.boundMenuClickHandler = (e: Event) => e.stopPropagation();
        this.boundMenuItemClickHandler = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('menu-item') && !target.classList.contains('disabled')) {
                const itemId = target.dataset.id;
                const item = this._items.find(i => i.id === itemId);
                if (item?.handler) {
                    item.handler();
                    this.close();
                }
            }
        };
    }

    connectedCallback() {
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.removeEventListeners();
    }

    private setupEventListeners() {
        // Close on click outside
        document.addEventListener('click', this.boundCloseHandler);

        // Close on Escape key
        document.addEventListener('keydown', this.boundKeydownHandler);

        // Prevent clicks inside the menu from bubbling and closing it immediately
        this.menuContainer?.addEventListener('click', this.boundMenuClickHandler);

        // Use event delegation for menu items
        this.menuContainer?.addEventListener('click', this.boundMenuItemClickHandler);
    }

    private removeEventListeners() {
        document.removeEventListener('click', this.boundCloseHandler);
        document.removeEventListener('keydown', this.boundKeydownHandler);
        this.menuContainer?.removeEventListener('click', this.boundMenuClickHandler);
        this.menuContainer?.removeEventListener('click', this.boundMenuItemClickHandler);
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
