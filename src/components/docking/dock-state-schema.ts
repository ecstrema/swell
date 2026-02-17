import { scope, type } from 'arktype';

/**
 * Arktype schema for dock state persistence
 * This defines the structure and validation rules for saved dock layouts
 */

// Create a scope to handle recursive type definitions
export const dockSchemas = scope({
    DockPane: {
        id: 'string',
        title: 'string',
        contentId: 'string',
        'closable?': 'boolean'
    },
    DockBox: {
        id: 'string',
        type: "'box'",
        weight: 'number',
        direction: "'row'|'column'",
        children: 'DockNode[]'
    },
    DockStack: {
        id: 'string',
        type: "'stack'",
        weight: 'number',
        children: 'DockPane[]',
        activeId: 'string|null'
    },
    DockNode: 'DockBox|DockStack',
    DockLayout: {
        root: 'DockNode'
    }
});

// Export individual schemas
export const DockPaneSchema = dockSchemas.export().DockPane;
export const DockBoxSchema = dockSchemas.export().DockBox;
export const DockStackSchema = dockSchemas.export().DockStack;
export const DockNodeSchema = dockSchemas.export().DockNode;
export const DockLayoutSchema = dockSchemas.export().DockLayout;

// Export the inferred types for TypeScript
export type DockPaneData = typeof DockPaneSchema.infer;
export type DockBoxData = typeof DockBoxSchema.infer;
export type DockStackData = typeof DockStackSchema.infer;
export type DockNodeData = typeof DockNodeSchema.infer;
export type DockLayoutData = typeof DockLayoutSchema.infer;
