import { isTauri } from "../../backend";
import { themeManager } from "../../theme-manager";
import { createMenu, MenuConfig } from "../../menu-api";

export class MenuBar extends HTMLElement {
  private menuConfig: MenuConfig | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
      await this.initMenu();
      
      if (isTauri) {
          this.style.display = 'none';
      } else {
          this.render();
      }
  }

  async initMenu() {
    try {
        // Define menu structure using unified API
        this.menuConfig = {
            items: [
                {
                    text: 'File',
                    items: [
                        {
                            id: 'open',
                            text: 'Open File...',
                            action: () => {
                                this.dispatchEvent(new CustomEvent('file-open-request', {
                                    bubbles: true,
                                    composed: true
                                }));
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            id: 'quit',
                            text: 'Quit',
                            action: () => {
                               window.close();
                            }
                        }
                    ]
                },
                {
                    text: 'Edit',
                    items: [
                        {
                            id: 'undo',
                            text: 'Undo',
                            action: () => {
                                this.dispatchEvent(new CustomEvent('menu-action', {
                                    bubbles: true,
                                    composed: true,
                                    detail: 'edit-undo'
                                }));
                            }
                        }
                    ]
                },
                {
                    text: 'View',
                    items: [
                        {
                            id: 'theme-light',
                            text: 'Light Theme',
                            action: () => {
                                themeManager.setTheme('light');
                            }
                        },
                        {
                            id: 'theme-dark',
                            text: 'Dark Theme',
                            action: () => {
                                themeManager.setTheme('dark');
                            }
                        },
                        {
                            id: 'theme-auto',
                            text: 'Auto Theme',
                            action: () => {
                                themeManager.setTheme('auto');
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            id: 'settings',
                            text: 'Settings',
                            action: () => {
                                this.dispatchEvent(new CustomEvent('settings-open-request', {
                                    bubbles: true,
                                    composed: true
                                }));
                            }
                        }
                    ]
                }
            ]
        };

        // Create menu using unified API (handles both Tauri and web)
        await createMenu(this.menuConfig);
    } catch (e) {
        console.error("Failed to init menu", e);
    }
  }

  render() {
      if (this.shadowRoot && this.menuConfig) {
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
                  ${this.menuConfig.items.map(submenu => `
                      <div class="menu-group">
                          <div class="menu-title">${submenu.text}</div>
                          <div class="dropdown">
                              ${submenu.items.map(item => {
                                  if ('items' in item) {
                                      // Nested submenu - not rendering for now
                                      return '';
                                  }
                                  if (item.type === 'separator') {
                                      return '<div class="separator"></div>';
                                  }
                                  return `<div class="menu-item" data-id="${item.id}">${item.text}</div>`;
                              }).join('')}
                          </div>
                      </div>
                  `).join('')}
              </div>
          `;

          // Attach event listeners
          this.shadowRoot.querySelectorAll('.menu-item').forEach(item => {
              item.addEventListener('click', (e) => {
                  const target = e.target as HTMLElement;
                  const itemId = target.dataset.id;
                  
                  if (itemId && this.menuConfig) {
                      // Find and execute the action
                      for (const submenu of this.menuConfig.items) {
                          for (const menuItem of submenu.items) {
                              if ('id' in menuItem && menuItem.id === itemId && menuItem.action) {
                                  menuItem.action();
                                  break;
                              }
                          }
                      }
                  }
              });
          });
      }
  }
}

customElements.define('app-menu-bar', MenuBar);
