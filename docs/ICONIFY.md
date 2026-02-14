# Iconify Integration

Swell now includes [Iconify](https://iconify.design/) via [unplugin-icons](https://github.com/unplugin/unplugin-icons), which provides access to thousands of icons from over 150 icon sets with automatic tree-shaking - only the icons you use are bundled.

## What is Iconify?

Iconify is a unified icon framework that allows you to use icons from multiple icon sets (Material Design Icons, Font Awesome, Bootstrap Icons, etc.) with a single, simple API. With unplugin-icons, icons are imported as ES modules and bundled at build time, ensuring optimal performance.

## Installation

Iconify is already installed and configured in the project. The `unplugin-icons` Vite plugin is configured in `vite.config.js`.

## Usage

You can use Iconify icons by importing them from the virtual `~icons` module. Icons are imported using the pattern `~icons/{collection}/{icon-name}`.

### Basic Usage in TypeScript/JavaScript

```typescript
// Import icons as SVG strings
import HomeIcon from '~icons/mdi/home?raw';
import UserIcon from '~icons/fa-solid/user?raw';
import HeartIcon from '~icons/bi/heart?raw';

// Use in your code
const icon = document.createElement('span');
icon.innerHTML = HomeIcon;
icon.style.color = 'blue';
container.appendChild(icon);
```

### Using Icons as Inline SVG

```typescript
import CheckIcon from '~icons/mdi/check-circle?raw';

// Create a helper function for easy icon usage
function createIcon(iconSvg: string, className?: string): HTMLElement {
  const span = document.createElement('span');
  span.innerHTML = iconSvg;
  span.className = className || 'icon';
  return span;
}

// Use it
const checkIcon = createIcon(CheckIcon, 'success-icon');
container.appendChild(checkIcon);
```

### Styling Icons

Icons are imported as inline SVG, so you can style them with CSS:

```css
.icon {
  width: 24px;
  height: 24px;
  display: inline-block;
  color: currentColor;
}

.icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.icon.success-icon {
  color: green;
}
```

### Common Icon Sets

Here are some popular icon sets you can use:

- **Material Design Icons**: `~icons/mdi/{icon-name}` (e.g., `~icons/mdi/home`, `~icons/mdi/search`, `~icons/mdi/settings`)
- **Font Awesome**: `~icons/fa-solid/{icon-name}` or `~icons/fa-brands/{icon-name}` (e.g., `~icons/fa-solid/user`, `~icons/fa-brands/github`)
- **Bootstrap Icons**: `~icons/bi/{icon-name}` (e.g., `~icons/bi/heart`, `~icons/bi/check-circle`)
- **Heroicons**: `~icons/heroicons/{icon-name}` (e.g., `~icons/heroicons/home`, `~icons/heroicons/user`)
- **Tabler Icons**: `~icons/tabler/{icon-name}` (e.g., `~icons/tabler/home`, `~icons/tabler/user`)
- **Lucide**: `~icons/lucide/{icon-name}` (e.g., `~icons/lucide/home`, `~icons/lucide/user`)

### Finding Icons

You can search for icons on the [Iconify website](https://icon-sets.iconify.design/). The site provides:
- A searchable catalog of all available icons
- Preview of each icon
- The exact icon name to use (convert the format: `mdi:home` becomes `~icons/mdi/home`)
- Multiple icon sets to choose from

## Examples

### Button with Icon

```typescript
import PlusIcon from '~icons/mdi/plus?raw';

const button = document.createElement('button');
button.innerHTML = `${PlusIcon} <span>Add Timeline</span>`;
container.appendChild(button);
```

### Icon Utility Function

```typescript
// Create a reusable icon utility
export function createSvgIcon(iconSvg: string, options?: {
  size?: string;
  color?: string;
  className?: string;
}): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.innerHTML = iconSvg;
  wrapper.classList.add('icon-wrapper');
  
  if (options?.className) {
    wrapper.classList.add(options.className);
  }
  
  const svg = wrapper.querySelector('svg');
  if (svg) {
    if (options?.size) {
      svg.style.width = options.size;
      svg.style.height = options.size;
    }
    if (options?.color) {
      svg.style.color = options.color;
    }
  }
  
  return wrapper;
}

// Usage
import SettingsIcon from '~icons/mdi/settings?raw';
const icon = createSvgIcon(SettingsIcon, { size: '24px', color: 'blue' });
```

### Menu Item with Icon

```typescript
import FolderOpenIcon from '~icons/mdi/folder-open?raw';

const menuItem = document.createElement('div');
menuItem.className = 'menu-item';
menuItem.innerHTML = `
  <span class="icon">${FolderOpenIcon}</span>
  <span>Open File</span>
`;
```

### Status Indicator

```typescript
import CheckCircleIcon from '~icons/mdi/check-circle?raw';

const status = document.createElement('span');
status.className = 'status';
status.innerHTML = `
  <span class="icon success">${CheckCircleIcon}</span>
  <span>Connected</span>
`;
```

## Accessibility

Always provide appropriate ARIA labels when using icons without accompanying text:

```typescript
import CloseIcon from '~icons/mdi/close?raw';

const button = document.createElement('button');
button.setAttribute('aria-label', 'Close dialog');
button.innerHTML = CloseIcon;
```

## Performance

- Icons are imported at build time and bundled with your code
- Only icons you actually import are included in the bundle (tree-shaking)
- No runtime dependencies or CDN requests
- Icons are optimized SVGs, typically 1-2KB each

## TypeScript Support

To get TypeScript support for icon imports, add this to your type definitions:

```typescript
declare module '~icons/*' {
  const content: string;
  export default content;
}
```

## Build-Time Benefits

Unlike the web component approach, unplugin-icons:
- ✅ Bundles only used icons (smaller bundle size)
- ✅ No runtime icon loading (faster initial render)
- ✅ No CDN dependencies (works offline)
- ✅ Better for production builds
- ✅ Type-safe imports

## Further Reading

- [unplugin-icons Documentation](https://github.com/unplugin/unplugin-icons)
- [Icon Sets Browser](https://icon-sets.iconify.design/)
- [Iconify Documentation](https://iconify.design/docs/)
