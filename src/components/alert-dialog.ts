import { css } from "../utils/css-utils.js";

const alertDialogCss = `
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
}

button {
    padding: 8px 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    background: var(--button-bg, #007bff);
    color: var(--button-text, white);
}

button:hover {
    background: var(--button-hover-bg, #0056b3);
}
`;

export class AlertDialog extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private resolvePromise: (() => void) | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(alertDialogCss)];
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
                    <button class="ok-btn">OK</button>
                </div>
            </dialog>
        `;
        this.dialog = this.shadowRoot!.querySelector('dialog');
    }

    private setupEventListeners() {
        if (!this.dialog) return;

        // OK button
        const okBtn = this.shadowRoot!.querySelector('.ok-btn');
        if (okBtn) {
            okBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // Handle ESC key (built-in to <dialog>)
        this.dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this.close();
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
                this.close();
            }
        });
    }

    /**
     * Show an alert dialog
     * @param options Dialog options
     * @returns Promise that resolves when the dialog is closed
     */
    show(options: {
        title: string;
        message: string;
        okLabel?: string;
    }): Promise<void> {
        if (!this.dialog) return Promise.resolve();

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

        // Set button label
        const okBtn = this.shadowRoot!.querySelector('.ok-btn');
        if (okBtn) {
            okBtn.textContent = options.okLabel || 'OK';
        }

        // Show the dialog as modal
        this.dialog.showModal();

        // Return a promise that resolves when the dialog is closed
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    private close() {
        if (this.dialog) {
            this.dialog.close();
        }
        if (this.resolvePromise) {
            this.resolvePromise();
            this.resolvePromise = null;
        }
    }
}

customElements.define('alert-dialog', AlertDialog);
