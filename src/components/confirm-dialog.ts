import { css } from "../utils/css-utils.js";

const confirmDialogCss = `
:host {
    display: contents;
}

dialog {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0;
    min-width: 400px;
    max-width: 500px;
    background: var(--color-bg);
    color: var(--color-text);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
}

.dialog-header {
    padding: 20px 30px;
    border-bottom: 1px solid var(--color-border);
}

.dialog-title {
    font-size: 18px;
    font-weight: bold;
    margin: 0;
}

.dialog-content {
    padding: 20px 30px;
    line-height: 1.5;
}

.dialog-footer {
    padding: 15px 30px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

button {
    padding: 8px 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.cancel-btn {
    background: var(--button-secondary-bg, #6c757d);
    color: var(--button-text, white);
}

.cancel-btn:hover {
    background: var(--button-secondary-hover-bg, #5a6268);
}

.confirm-btn {
    background: var(--button-bg, #007bff);
    color: var(--button-text, white);
}

.confirm-btn:hover {
    background: var(--button-hover-bg, #0056b3);
}

.confirm-btn.danger {
    background: var(--button-danger-bg, #dc3545);
}

.confirm-btn.danger:hover {
    background: var(--button-danger-hover-bg, #c82333);
}
`;

export class ConfirmDialog extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private resolvePromise: ((value: boolean) => void) | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(confirmDialogCss)];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <dialog>
                <div class="dialog-header">
                    <h2 class="dialog-title"></h2>
                </div>
                <div class="dialog-content"></div>
                <div class="dialog-footer">
                    <button class="cancel-btn">Cancel</button>
                    <button class="confirm-btn">Confirm</button>
                </div>
            </dialog>
        `;
        this.dialog = this.shadowRoot!.querySelector('dialog');
    }

    private setupEventListeners() {
        if (!this.dialog) return;

        // Cancel button
        const cancelBtn = this.shadowRoot!.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.close(false);
            });
        }

        // Confirm button
        const confirmBtn = this.shadowRoot!.querySelector('.confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.close(true);
            });
        }

        // Handle ESC key and backdrop click (built-in to <dialog>)
        this.dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this.close(false);
        });

        // Handle backdrop click
        this.dialog.addEventListener('click', (e) => {
            const rect = this.dialog!.getBoundingClientRect();
            const isInDialog = (
                rect.top <= e.clientY &&
                e.clientY <= rect.top + rect.height &&
                rect.left <= e.clientX &&
                e.clientX <= rect.left + rect.width
            );
            if (!isInDialog) {
                this.close(false);
            }
        });
    }

    /**
     * Show a confirmation dialog
     * @param options Dialog options
     * @returns Promise that resolves to true if confirmed, false if cancelled
     */
    show(options: {
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        danger?: boolean;
    }): Promise<boolean> {
        if (!this.dialog) return Promise.resolve(false);

        // Set title
        const titleElement = this.shadowRoot!.querySelector('.dialog-title');
        if (titleElement) {
            titleElement.textContent = options.title;
        }

        // Set message
        const contentElement = this.shadowRoot!.querySelector('.dialog-content');
        if (contentElement) {
            contentElement.textContent = options.message;
        }

        // Set button labels
        const cancelBtn = this.shadowRoot!.querySelector('.cancel-btn');
        if (cancelBtn && options.cancelLabel) {
            cancelBtn.textContent = options.cancelLabel;
        }

        const confirmBtn = this.shadowRoot!.querySelector('.confirm-btn');
        if (confirmBtn) {
            if (options.confirmLabel) {
                confirmBtn.textContent = options.confirmLabel;
            }
            // Add or remove danger class
            if (options.danger) {
                confirmBtn.classList.add('danger');
            } else {
                confirmBtn.classList.remove('danger');
            }
        }

        // Show the dialog as modal
        this.dialog.showModal();

        // Return a promise that resolves when the dialog is closed
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    private close(confirmed: boolean) {
        if (this.dialog) {
            this.dialog.close();
        }
        if (this.resolvePromise) {
            this.resolvePromise(confirmed);
            this.resolvePromise = null;
        }
    }
}

customElements.define('confirm-dialog', ConfirmDialog);
