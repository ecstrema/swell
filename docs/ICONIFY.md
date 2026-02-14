# Iconify Integration

Swell now includes [Iconify](https://iconify.design/), a unified icon framework that provides access to thousands of icons from over 150 icon sets.

## What is Iconify?

Iconify is a modern icon framework that allows you to use icons from multiple icon sets (Material Design Icons, Font Awesome, Bootstrap Icons, etc.) with a single, simple API. Icons are loaded on-demand, so only the icons you actually use are downloaded.

## Installation

Iconify is already installed and configured in the project. The `iconify-icon` web component is imported in `src/main.ts`.

## Usage

You can use Iconify icons anywhere in your HTML or TypeScript components using the `<iconify-icon>` custom element.

### Basic Usage

```html
<!-- Material Design Icons -->
<iconify-icon icon="mdi:home"></iconify-icon>

<!-- Font Awesome -->
<iconify-icon icon="fa-solid:user"></iconify-icon>

<!-- Bootstrap Icons -->
<iconify-icon icon="bi:heart"></iconify-icon>
```

### Styling Icons

You can style icons using CSS just like regular elements:

```html
<iconify-icon icon="mdi:heart" style="color: red; font-size: 24px;"></iconify-icon>
```

Or with classes:

```css
.my-icon {
    color: var(--color-primary);
    font-size: 20px;
    cursor: pointer;
}
```

```html
<iconify-icon icon="mdi:settings" class="my-icon"></iconify-icon>
```

### Using in TypeScript Components

```typescript
// In your component's render method or template
const icon = document.createElement('iconify-icon');
icon.setAttribute('icon', 'mdi:check-circle');
icon.style.color = 'green';
icon.style.fontSize = '24px';
container.appendChild(icon);
```

### Common Icon Sets

Here are some popular icon sets you can use:

- **Material Design Icons**: `mdi:icon-name` (e.g., `mdi:home`, `mdi:search`, `mdi:settings`)
- **Font Awesome**: `fa-solid:icon-name` or `fa-brands:icon-name` (e.g., `fa-solid:user`, `fa-brands:github`)
- **Bootstrap Icons**: `bi:icon-name` (e.g., `bi:heart`, `bi:check-circle`)
- **Heroicons**: `heroicons:icon-name` (e.g., `heroicons:home`, `heroicons:user`)
- **Tabler Icons**: `tabler:icon-name` (e.g., `tabler:home`, `tabler:user`)
- **Lucide**: `lucide:icon-name` (e.g., `lucide:home`, `lucide:user`)

### Finding Icons

You can search for icons on the [Iconify website](https://icon-sets.iconify.design/). The site provides:
- A searchable catalog of all available icons
- Preview of each icon
- The exact icon name to use
- Multiple icon sets to choose from

## Examples

### Button with Icon

```html
<button>
    <iconify-icon icon="mdi:plus"></iconify-icon>
    Add Timeline
</button>
```

### Icon Button

```html
<button class="icon-button" aria-label="Settings">
    <iconify-icon icon="mdi:settings"></iconify-icon>
</button>
```

### Menu Item with Icon

```html
<div class="menu-item">
    <iconify-icon icon="mdi:folder-open"></iconify-icon>
    <span>Open File</span>
</div>
```

### Status Indicator

```html
<span class="status">
    <iconify-icon icon="mdi:check-circle" style="color: green;"></iconify-icon>
    Connected
</span>
```

## Accessibility

Always provide appropriate ARIA labels when using icons without accompanying text:

```html
<button aria-label="Close dialog">
    <iconify-icon icon="mdi:close"></iconify-icon>
</button>
```

## Performance

- Icons are loaded on-demand from Iconify's CDN
- Only icons you actually use are downloaded
- Icons are cached by the browser
- The web component is lightweight (~10KB gzipped)

## TypeScript Support

If you're using TypeScript and need type definitions for the custom element, you can declare it:

```typescript
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'iconify-icon': any;
        }
    }
}
```

## Further Reading

- [Iconify Documentation](https://iconify.design/docs/)
- [Icon Sets Browser](https://icon-sets.iconify.design/)
- [iconify-icon Web Component](https://iconify.design/docs/iconify-icon/)
