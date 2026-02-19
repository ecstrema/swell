export type DockDirection = 'row' | 'column';

export interface DockNodeBase {
    id: string;
    weight: number; // Relative size (flex-grow)
}

export interface DockStack extends DockNodeBase {
    // Keep `type` permissive for backward compatibility: serialized layouts may
    // still use the legacy 'box' token. Runtime distinguishes container vs leaf
    // stacks using the optional `direction` property.
    type: 'stack' | 'box';
    direction?: DockDirection; // presence => container node
    // For containers `children` is DockStack[]; for leaves it's DockPane[]
    children: DockPane[] | DockStack[];
    activeId?: string | null; // meaningful only for leaf stacks
}

export interface DockPane {
    id: string;
    title: string;
    contentId: string;
    closable?: boolean;
}

export type DockNode = DockStack;

export interface DockLayout {
    root: DockNode;
}
