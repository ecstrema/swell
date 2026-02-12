# Settings System Documentation

## Overview

The settings system provides a flexible way to manage application settings with a type-safe registry, persistent storage, and a user-friendly UI.

## Architecture

### Components

1. **Settings Register** (`src/settings/settings-register.ts`)
   - Central registry for settings metadata
   - Defines setting types, paths, descriptions, and constraints
   - Provides methods to query and group settings

2. **Settings Storage** (`src/settings/settings-storage.ts`)
   - Handles reading and writing settings values
   - Supports both Tauri (native) and web modes
   - Persists to `settings.json` file in Tauri or localStorage in web mode

3. **Settings Page** (`src/components/settings-page.ts`)
   - Modal dialog UI component
   - Automatically generates form fields based on registered settings
   - Groups settings by category

## Setting Types

The system supports four setting types:

- **enum**: Dropdown selection with predefined options
- **boolean**: Checkbox for true/false values  
- **string**: Text input field
- **number**: Number input with optional min/max/step constraints

## Setting Structure

Each setting is defined with the following metadata:

```typescript
interface SettingMetadata {
    path: string;              // Hierarchical path (e.g., "Application/Color Theme")
    description: string;        // User-friendly description
    type: SettingType;         // enum | boolean | string | number
    defaultValue: any;         // Default value
    enumOptions?: string[];    // For enum type: list of possible values
    options?: EnumOption[];    // For enum type: values with custom labels
    min?: number;              // For number type: minimum value
    max?: number;              // For number type: maximum value
    step?: number;             // For number type: step increment
}
```

## Example: Color Theme Setting

```typescript
settingsRegister.register({
    path: 'Application/Color Theme',
    description: 'Choose the color theme for the application',
    type: 'enum',
    defaultValue: 'system',
    enumOptions: ['light', 'dark', 'system'],
    options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System' }
    ]
});
```

## Adding New Settings

### Step 1: Register the Setting

Add your setting registration to `src/settings/settings-register.ts`:

```typescript
settingsRegister.register({
    path: 'Category/Setting Name',
    description: 'Description of what this setting does',
    type: 'string', // or 'enum', 'boolean', 'number'
    defaultValue: 'default value'
});
```

### Step 2: Use the Setting

Read a setting value:

```typescript
import { getSetting } from './settings/settings-storage';

const value = await getSetting('Category/Setting Name');
```

Write a setting value:

```typescript
import { setSetting } from './settings/settings-storage';

await setSetting('Category/Setting Name', 'new value');
```

Listen for setting changes:

```typescript
// In a component
this.addEventListener('setting-changed', (e: Event) => {
    const customEvent = e as CustomEvent;
    const { path, value } = customEvent.detail;
    
    if (path === 'Category/Setting Name') {
        // React to setting change
        console.log('Setting changed:', value);
    }
});
```

## Backend Implementation

### Rust Commands (Tauri)

Three Tauri commands handle settings persistence:

1. **get_setting(path)**: Retrieve a single setting value
2. **set_setting(path, value)**: Update a single setting value
3. **get_all_settings()**: Retrieve all settings

Settings are stored in `settings.json` using the `tauri-plugin-store`.

### Web Mode

In web mode, settings are stored in localStorage under the key `settings.json`.

## Menu Integration

The settings page is accessible from the File menu:

```
File
├── Open File...
├── ───────────
├── Settings...  <-- Opens settings page
├── ───────────
└── Quit
```

## UI Features

- **Modal Dialog**: Settings page appears as an overlay
- **Category Grouping**: Settings are grouped by top-level path segment
- **Auto-save**: Changes are saved immediately when modified
- **Validation**: Number inputs respect min/max/step constraints
- **Accessibility**: Proper labels and keyboard navigation

## Storage Format

Settings are stored in a nested JSON structure:

```json
{
  "Application": {
    "Color Theme": "dark"
  },
  "Editor": {
    "Font Size": 14,
    "Show Line Numbers": true
  }
}
```

## Type Safety

The settings system provides type information through the registry, allowing components to query setting types and constraints before rendering or validating user input.

## Future Enhancements

Potential improvements:

- Setting validation rules
- Setting dependencies (enable/disable based on other settings)
- Search/filter settings in the UI
- Import/export settings profiles
- Reset to defaults functionality
