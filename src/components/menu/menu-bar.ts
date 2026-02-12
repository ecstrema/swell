import { isTauri } from "../../backend.js";
import { themeManager } from "../../theme-manager.js";
import { createMenu, MenuConfig } from "../../menu-api.js";
import { css } from "../../utils/css-utils.js";
import menuBarCss from "./menu-bar.css?inline";

export class MenuBar extends HTMLElement {
  private menuConfig: MenuConfig | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [css(menuBarCss)];
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
        // Build file menu items conditionally
        const fileMenuItems = [
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
                type: 'separator' as const
            },
            {
                id: 'settings',
                text: 'Settings...',
                action: () => {
                    this.dispatchEvent(new CustomEvent('settings-open-request', {
                        bubbles: true,
                        composed: true
                    }));
                }
            }
        ];

        // Only add quit option for Tauri (not for web)
        if (isTauri) {
            fileMenuItems.push(
                {
                    type: 'separator' as const
                },
                {
                    id: 'quit',
                    text: 'Quit',
                    action: async () => {
                        const { getCurrentWindow } = await import('@tauri-apps/api/window');
                        await getCurrentWindow().close();
                    }
                }
            );
        }

        // Define menu structure using unified API
        this.menuConfig = {
            items: [
                {
                    text: 'File',
                    items: fileMenuItems
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
