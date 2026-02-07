import { isTauri } from "../../backend";

export class MenuBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
      if (isTauri) {
          this.style.display = 'none';
          await this.initNativeMenu();
      } else {
          this.render();
      }
  }

  async initNativeMenu() {
    try {
        const { Menu, Submenu, MenuItem } = await import('@tauri-apps/api/menu');

        const fileMenu = await Submenu.new({
            text: 'File',
            items: [
                await MenuItem.new({
                    id: 'open',
                    text: 'Open File...',
                    action: () => {
                        this.dispatchEvent(new CustomEvent('file-open-request', {
                            bubbles: true,
                            composed: true
                        }));
                    }
                }),
                await MenuItem.new({
                    id: 'quit',
                    text: 'Quit',
                    action: () => {
                       window.close();
                    }
                })
            ]
        });

        const editMenu = await Submenu.new({
            text: 'Edit',
            items: [
                await MenuItem.new({
                    id: 'undo',
                    text: 'Undo',
                    action: () => {
                        this.dispatchEvent(new CustomEvent('menu-action', {
                            bubbles: true,
                            composed: true,
                            detail: 'edit-undo'
                        }));
                    }
                }),
                await MenuItem.new({
                    id: 'redo',
                    text: 'Redo',
                    action: () => {
                        this.dispatchEvent(new CustomEvent('menu-action', {
                            bubbles: true,
                            composed: true,
                            detail: 'edit-redo'
                        }));
                    }
                })
            ]
        });

        const menu = await Menu.new({
            items: [fileMenu, editMenu]
        });

        await menu.setAsAppMenu();
    } catch (e) {
        console.error("Failed to init native menu", e);
    }
  }

  render() {
      if (this.shadowRoot) {
          this.shadowRoot.innerHTML = `
              <style>
                  :host {
                      display: block;
                      background: var(--menu-bg);
                      border-bottom: 1px solid var(--menu-border);
                      font-family: sans-serif;
                      font-size: 14px;
                      user-select: none;
                      color: var(--color-text);
                  }
                  .menu-bar {
                      display: flex;
                  }
                  .menu-group {
                      position: relative;
                  }
                  .menu-title {
                      padding: 5px 10px;
                      cursor: pointer;
                  }
                  .menu-title:hover {
                      background: var(--menu-item-hover);
                  }
                  .dropdown {
                      display: none;
                      position: absolute;
                      top: 100%;
                      left: 0;
                      background: var(--menu-dropdown-bg);
                      border: 1px solid var(--menu-border);
                      box-shadow: 2px 2px 5px var(--menu-shadow);
                      min-width: 150px;
                      z-index: 1000;
                  }
                  .menu-group:hover .dropdown {
                      display: block;
                  }
                  .menu-item {
                      padding: 8px 15px;
                      cursor: pointer;
                  }
                  .menu-item:hover {
                      background: var(--menu-item-hover);
                  }
                  .separator {
                      height: 1px;
                      background: var(--menu-border);
                      margin: 4px 0;
                  }
              </style>
              <div class="menu-bar">
                  <div class="menu-group">
                      <div class="menu-title">File</div>
                      <div class="dropdown">
                          <div class="menu-item" data-action="file-open">Open File...</div>
                          <div class="separator"></div>
                          <div class="menu-item" data-action="file-quit">Quit</div>
                      </div>
                  </div>
                  <div class="menu-group">
                      <div class="menu-title">Edit</div>
                      <div class="dropdown">
                          <div class="menu-item" data-action="edit-undo">Undo</div>
                          <div class="menu-item" data-action="edit-redo">Redo</div>
                      </div>
                  </div>
                  <div class="menu-group">
                      <div class="menu-title">View</div>
                      <div class="dropdown">
                          <div class="menu-item" data-action="view-zoom-in">Zoom In</div>
                          <div class="menu-item" data-action="view-zoom-out">Zoom Out</div>
                      </div>
                  </div>
              </div>
          `;

          this.shadowRoot.querySelectorAll('.menu-item').forEach(item => {
              item.addEventListener('click', (e) => {
                  const target = e.target as HTMLElement;
                  const action = target.dataset.action;
                  if (action) {
                      this.dispatchEvent(new CustomEvent('menu-action', {
                          bubbles: true,
                          composed: true,
                          detail: action
                      }));

                      // Also dispatch specific event for backward compat or ease of use
                      if (action === 'file-open') {
                           this.dispatchEvent(new CustomEvent('file-open-request', {
                             bubbles: true,
                             composed: true
                         }));
                      }
                  }
              });
          });
      }
  }
}

customElements.define('app-menu-bar', MenuBar);
