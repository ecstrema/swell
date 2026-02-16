import { isTauri } from "../../backend.js";
import { themeManager } from "../../theme-manager.js";
import { createMenu, MenuConfig, MenuItemConfig, SubmenuConfig } from "../../menu-api.js";
import { css } from "../../utils/css-utils.js";
import menuBarCss from "./menu-bar.css?inline";
import { renderMenuItems, findAndExecuteAction } from "./menu-item-renderer.js";
import { ShortcutManager } from "../../shortcuts/index.js";

export class MenuBar extends HTMLElement {
  private menuConfig: MenuConfig | null = null;
  private shortcutManager: ShortcutManager | null = null;
  
  // Map menu item IDs to command IDs for shortcut lookup
  private readonly menuItemToCommandIdMap: Record<string, string> = {
      'open': 'file-open',
      'quit': 'file-quit',
      'undo': 'edit-undo',
      'redo': 'edit-redo',
      'zoom-in': 'view-zoom-in',
      'zoom-out': 'view-zoom-out',
      'zoom-fit': 'view-zoom-fit',
      'toggle-signal-selection': 'view-toggle-signal-selection',
  };

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
                id: 'open-example',
                text: 'Open Example...',
                action: () => {
                    this.dispatchEvent(new CustomEvent('open-example-request', {
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
                        },
                        {
                            id: 'redo',
                            text: 'Redo',
                            action: () => {
                                this.dispatchEvent(new CustomEvent('menu-action', {
                                    bubbles: true,
                                    composed: true,
                                    detail: 'edit-redo'
                                }));
                            }
                        }
                    ]
                },
                {
                    text: 'View',
                    items: [
                        {
                            text: 'Zoom',
                            items: [
                                {
                                    id: 'zoom-in',
                                    text: 'Zoom In',
                                    action: () => {
                                        this.dispatchEvent(new CustomEvent('menu-action', {
                                            bubbles: true,
                                            composed: true,
                                            detail: 'view-zoom-in'
                                        }));
                                    }
                                },
                                {
                                    id: 'zoom-out',
                                    text: 'Zoom Out',
                                    action: () => {
                                        this.dispatchEvent(new CustomEvent('menu-action', {
                                            bubbles: true,
                                            composed: true,
                                            detail: 'view-zoom-out'
                                        }));
                                    }
                                },
                                {
                                    id: 'zoom-fit',
                                    text: 'Zoom to Fit',
                                    action: () => {
                                        this.dispatchEvent(new CustomEvent('menu-action', {
                                            bubbles: true,
                                            composed: true,
                                            detail: 'view-zoom-fit'
                                        }));
                                    }
                                }
                            ]
                        },
                        {
                            type: 'separator' as const
                        },
                        {
                            text: 'Theme',
                            items: [
                                {
                                    id: 'theme-light',
                                    text: 'Light',
                                    action: () => {
                                        themeManager.setTheme('light');
                                    }
                                },
                                {
                                    id: 'theme-dark',
                                    text: 'Dark',
                                    action: () => {
                                        themeManager.setTheme('dark');
                                    }
                                },
                                {
                                    id: 'theme-auto',
                                    text: 'Auto',
                                    action: () => {
                                        themeManager.setTheme('auto');
                                    }
                                }
                            ]
                        },
                        {
                            type: 'separator' as const
                        },
                        {
                            text: 'Panes',
                            items: [
                                {
                                    id: 'toggle-signal-selection',
                                    text: 'Signal Selection',
                                    type: 'checkbox' as const,
                                    // Initial state - will be updated dynamically when files are loaded
                                    checked: true,
                                    action: () => {
                                        this.dispatchEvent(new CustomEvent('menu-action', {
                                            bubbles: true,
                                            composed: true,
                                            detail: 'view-toggle-signal-selection'
                                        }));
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    text: 'Help',
                    items: [
                        {
                            id: 'about',
                            text: 'About',
                            action: () => {
                                this.dispatchEvent(new CustomEvent('about-open-request', {
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

  /**
   * Set the shortcut manager to display shortcuts in menu items
   */
  setShortcutManager(shortcutManager: ShortcutManager) {
      this.shortcutManager = shortcutManager;
      // Re-render if already rendered
      if (this.shadowRoot && this.shadowRoot.childNodes.length > 0) {
          this.render();
      }
  }

  /**
   * Update a menu item's checked state
   */
  updateMenuItemChecked(menuItemId: string, checked: boolean) {
      if (!this.menuConfig) return;

      // Find and update the menu item in the config
      const findAndUpdate = (items: (MenuItemConfig | SubmenuConfig)[]): boolean => {
          for (const item of items) {
              if ('items' in item) {
                  // Recursively search in nested submenu
                  if (findAndUpdate(item.items)) {
                      return true;
                  }
              } else {
                  const menuItem = item as MenuItemConfig;
                  if (menuItem.id === menuItemId) {
                      menuItem.checked = checked;
                      return true;
                  }
              }
          }
          return false;
      };

      // Update in all submenus
      for (const submenu of this.menuConfig.items) {
          if (findAndUpdate(submenu.items)) {
              break;
          }
      }

      // Re-render the menu
      this.render();
  }

  /**
   * Map menu item IDs to command IDs for shortcut lookup
   */
  private mapMenuItemIdToCommandId(menuItemId: string): string | undefined {
      return this.menuItemToCommandIdMap[menuItemId];
  }

  render() {
      if (this.shadowRoot && this.menuConfig) {
          const menuBar = document.createElement('div');
          menuBar.className = 'menu-bar';

          // Render each top-level submenu
          this.menuConfig.items.forEach(submenu => {
              const menuGroup = document.createElement('div');
              menuGroup.className = 'menu-group';

              const menuTitle = document.createElement('div');
              menuTitle.className = 'menu-title';
              menuTitle.textContent = submenu.text;

              const dropdown = document.createElement('div');
              dropdown.className = 'dropdown';

              // Use shared renderer for menu items
              const menuItems = renderMenuItems(submenu.items, {
                  shortcutManager: this.shortcutManager ?? undefined,
                  commandIdMapper: this.shortcutManager ? this.mapMenuItemIdToCommandId.bind(this) : undefined
              });
              menuItems.forEach(({ element }) => {
                  dropdown.appendChild(element);
              });

              menuGroup.appendChild(menuTitle);
              menuGroup.appendChild(dropdown);
              menuBar.appendChild(menuGroup);
          });

          // Clear and append to shadow root
          this.shadowRoot.innerHTML = '';
          this.shadowRoot.appendChild(menuBar);

          // Attach event listeners
          this.shadowRoot.querySelectorAll('.menu-item').forEach(item => {
              item.addEventListener('click', (e) => {
                  const target = e.target as HTMLElement;
                  // Handle clicks on both the menu item and its child elements
                  const menuItem = target.classList.contains('menu-item') ? target : target.closest('.menu-item');
                  const itemId = menuItem?.getAttribute('data-id');

                  if (itemId && this.menuConfig) {
                      // Find and execute the action recursively
                      for (const submenu of this.menuConfig.items) {
                          if (findAndExecuteAction(itemId, submenu.items)) {
                              break;
                          }
                      }
                  }
              });
          });
      }
  }
}

customElements.define('app-menu-bar', MenuBar);
