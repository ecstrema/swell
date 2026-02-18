import { isTauri } from "../../backend/index.js";
import { createMenu, MenuConfig, MenuItemConfig, SubmenuConfig } from "../../menu-api/index.js";
import { css } from "../../utils/css-utils.js";
import menuBarCss from "./menu-bar.css?inline";
import { renderMenuItems, findAndExecuteAction } from "./menu-item-renderer.js";
import { ShortcutExtension } from "../shortcut-extension/shortcut-extension.js";

export class MenuBar extends HTMLElement {
  private menuConfig: MenuConfig | null = null;
  private shortcutManager: ShortcutExtension | null = null;

  // Map menu item IDs to command IDs for shortcut lookup
  private menuItemToCommandIdMap: Record<string, string> = {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [css(menuBarCss)];
  }

  async connectedCallback() {
      // Wait for configuration via setMenuConfig
      if (this.menuConfig) {
        if (isTauri) {
            this.style.display = 'none';
        } else {
            this.render();
        }
      }
  }

  /**
   * Set the full menu configuration and re-render
   */
  async setMenuConfig(config: MenuConfig) {
      this.menuConfig = config;
      try {
          await createMenu(this.menuConfig);
      } catch (e) {
          console.error("Failed to sync menu:", e);
      }

      if (!isTauri) {
          this.render();
          this.style.display = 'block';
      } else {
          this.style.display = 'none';
      }
  }

  /**
   * Set all command mappings at once
   */
  setCommandMappings(mappings: Record<string, string>) {
      this.menuItemToCommandIdMap = { ...mappings };
  }


  /**
   * Set the shortcut manager to display shortcuts in menu items
   */
  setShortcutManager(shortcutManager: ShortcutExtension) {
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
