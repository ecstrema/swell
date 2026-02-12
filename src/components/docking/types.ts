export type DockDirection = 'row' | 'column';

export interface DockNodeBase {
    id: string;
    weight: number; // Relative size (flex-grow)
}

export interface DockBox extends DockNodeBase {
    type: 'box';
    direction: DockDirection;
    children: DockNode[];
}

export interface DockStack extends DockNodeBase {
    type: 'stack';
    children: DockPane[];
    activeId: string | null;
}

export interface DockPane {
    id: string;
    title: string;
    contentId: string;
    closable?: boolean;
}

export type DockNode = DockBox | DockStack;

export interface DockLayout {
    root: DockNode;
}
