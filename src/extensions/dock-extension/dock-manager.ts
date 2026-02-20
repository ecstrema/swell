import { DockLayout, DockNode, DockPane, DockStack } from "./types.js";
import { css } from "../../utils/css-utils.js";
import { scrollbarSheet } from "../../styles/shared-sheets.js";
import dockManagerCss from "./dock-manager.css?inline";

export class DockManager extends HTMLElement {
  private _layout: DockLayout | null = null;
  private _contentRegistry: Map<string, { title: string; closable: boolean; builder: (id: string) => HTMLElement }> =
    new Map();
  private _draggedPane: { pane: DockPane; sourceStack: DockStack } | null =
    null;
  private _draggedStack: DockStack | null = null;
  private _dropOverlay: HTMLElement | null = null;
  private _onLayoutChange: ((layout: DockLayout) => void) | null = null;
  private _suppressLayoutChangeNotification: boolean = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(dockManagerCss)];
  }

  /**
   * Register a callback to be invoked when the layout changes
   * @param callback Function to call with the new layout
   */
  public onLayoutChange(callback: (layout: DockLayout) => void): void {
    this._onLayoutChange = callback;
  }

  /**
   * Notify listeners that the layout has changed
   */
  private notifyLayoutChange(): void {
    // Respect explicit suppression and ensure there's a layout to report
    if (!this._layout || this._suppressLayoutChangeNotification) return;

    // Notify registered listener if present
    if (this._onLayoutChange) this._onLayoutChange(this._layout);
  }

  set layout(value: DockLayout) {
    this._layout = value;
    this.render();
    this.notifyLayoutChange();
  }

  /**
   * Set layout without triggering change notifications (used when restoring saved state)
   */
  public setLayoutSilent(value: DockLayout): void {
    this._suppressLayoutChangeNotification = true;
    this.layout = value;
    this._suppressLayoutChangeNotification = false;
  }

  get layout(): DockLayout | null {
    return this._layout;
  }

  registerContent(contentId: string, title: string, builder: (id: string) => HTMLElement, closable: boolean = true) {
    this._contentRegistry.set(contentId, { title, closable, builder });
  }

  getContent(contentId: string, id: string): HTMLElement {
    const info = this._contentRegistry.get(contentId);
    if (info) {
      return info.builder(id);
    }
    const fallback = document.createElement("div");
    fallback.textContent = `Content not found: ${contentId}`;
    return fallback;
  }

  getContentInfo(contentId: string): { title: string; closable: boolean } | null {
    const info = this._contentRegistry.get(contentId);
    if (!info) return null;
    return { title: info.title, closable: info.closable };
  }

  connectedCallback() {
    this.render();

    // Listen for pane-close events from dock-stack components
    this.addEventListener("pane-close", ((e: CustomEvent) => {
      const { id } = e.detail;
      this.handlePaneClose(id);
    }) as EventListener);

    this.addEventListener("dragover", (e) => {
      // Only prevent default for tab or dock drags (check types if available)
      const hasTypes = e.dataTransfer?.types !== undefined;
      if (hasTypes) {
        const isTab = e.dataTransfer?.types.includes('application/x-swell-tab') ?? false;
        const isDock = e.dataTransfer?.types.includes('application/x-swell-dock') ?? false;
        if (isTab || isDock) {
          e.preventDefault();
        }
      } else {
        // In test environments, types might not be set, allow all
        e.preventDefault();
      }
    });
  }

  render() {
    if (!this._layout) {
      this.shadowRoot!.innerHTML = `<div>No layout defined</div>`;
      return;
    }

    this.shadowRoot!.innerHTML = `
            <div class="dock-root"></div>
            <div id="drop-overlay"></div>
        `;

    const rootContainer = this.shadowRoot!.querySelector(".dock-root")!;
    this._dropOverlay = this.shadowRoot!.querySelector(
      "#drop-overlay",
    ) as HTMLElement;
    this.renderNode(this._layout.root, rootContainer);
  }

  // Type guards for the new single-node model (container stacks vs leaf stacks)
  private isContainer(node: DockNode): node is DockStack & { direction: 'row' | 'column'; children: DockStack[] } {
    return (node as any).direction !== undefined;
  }

  private isLeaf(node: DockNode): node is DockStack & { children: DockPane[] } {
    return (node as any).direction === undefined;
  }

  public renderNode(node: DockNode, container: Element) {
    let element: HTMLElement;
    if (this.isContainer(node)) {
      // Reuse the existing dock-box component for container stacks
      element = document.createElement("dock-box") as any;
      (element as any).manager = this;
      (element as any).node = node;
    } else {
      element = document.createElement("dock-stack") as any;
      (element as any).manager = this;
      (element as any).node = node;
    }

    element.style.flex = `${node.weight}`;
    container.appendChild(element);
  }

  // Drag and Drop Logic
  handleDragStart(pane: DockPane, sourceStack: DockStack) {
    this._draggedPane = { pane, sourceStack };
  }

  handleStackDragStart(stack: DockStack) {
    this._draggedStack = stack;
  }

  handleTabReorder(
    pane: DockPane,
    stack: DockStack,
    targetIndex: number
  ) {
    const currentIndex = stack.children.findIndex(p => p.id === pane.id);
    if (currentIndex === -1 || currentIndex === targetIndex) return;

    // Remove from current position
    stack.children.splice(currentIndex, 1);

    // Insert at new position
    const insertIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
    stack.children.splice(insertIndex, 0, pane);

    this.render();
    this.notifyLayoutChange();
  }

  getDraggedPane() {
    return this._draggedPane;
  }

  getDraggedStack() {
    return this._draggedStack;
  }

  handleDragOver(
    e: DragEvent,
    targetStack: DockStack,
    targetElement: HTMLElement,
  ) {
    if (!this._draggedPane && !this._draggedStack) return;

    // Only accept tab or dock drags, reject tree items (check types if available)
    const hasTypes = e.dataTransfer?.types !== undefined;
    if (hasTypes) {
      const isTab = e.dataTransfer?.types.includes('application/x-swell-tab') ?? false;
      const isDock = e.dataTransfer?.types.includes('application/x-swell-dock') ?? false;
      if (!isTab && !isDock) {
        return;
      }
    }

    e.preventDefault();

    const rect = targetElement.getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const zone = this.getDropZone(x, y, rect.width, rect.height);
    this.showDropOverlay(rect, hostRect, zone);
  }

  handleDragLeave() {
    if (this._dropOverlay) this._dropOverlay.style.display = "none";
  }

  handleDrop(e: DragEvent, targetStack: DockStack, targetElement: HTMLElement) {
    if (!this._draggedPane && !this._draggedStack) return;

    // Only accept tab or dock drags, reject tree items (check types if available)
    const hasTypes = e.dataTransfer?.types !== undefined;
    if (hasTypes) {
      const isTab = e.dataTransfer?.types.includes('application/x-swell-tab') ?? false;
      const isDock = e.dataTransfer?.types.includes('application/x-swell-dock') ?? false;
      if (!isTab && !isDock) {
        return;
      }
    }

    this.handleDragLeave();

    const rect = targetElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const zone = this.getDropZone(x, y, rect.width, rect.height);

    if (this._draggedStack) {
      // Handle stack drop
      if (this._draggedStack.id !== targetStack.id) {
        this.moveStack(this._draggedStack, targetStack, zone);
      }
      this._draggedStack = null;
    } else if (this._draggedPane) {
      // Handle pane drop
      this.movePane(
        this._draggedPane.pane,
        this._draggedPane.sourceStack,
        targetStack,
        zone,
      );
      this._draggedPane = null;
    }

    this.render();
    this.notifyLayoutChange();
  }

  private getDropZone(
    x: number,
    y: number,
    w: number,
    h: number,
  ): "top" | "bottom" | "left" | "right" | "center" {
    const threshold = 0.2;
    if (x < w * threshold) return "left";
    if (x > w * (1 - threshold)) return "right";
    if (y < h * threshold) return "top";
    if (y > h * (1 - threshold)) return "bottom";
    return "center";
  }

  private showDropOverlay(rect: DOMRect, hostRect: DOMRect, zone: string) {
    if (!this._dropOverlay) return;

    let top = rect.top - hostRect.top;
    let left = rect.left - hostRect.left;
    let width = rect.width;
    let height = rect.height;

    if (zone === "left") width /= 2;
    if (zone === "right") {
      left += width / 2;
      width /= 2;
    }
    if (zone === "top") height /= 2;
    if (zone === "bottom") {
      top += height / 2;
      height /= 2;
    }

    Object.assign(this._dropOverlay.style, {
      display: "block",
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  private movePane(
    pane: DockPane,
    sourceStack: DockStack,
    targetStack: DockStack,
    zone: string,
  ) {
    // Ensure source/target are leaf stacks (contain panes)
    if (!this.isLeaf(sourceStack) || !this.isLeaf(targetStack)) return;

    // 1. Remove from source
    sourceStack.children = sourceStack.children.filter((p) => p.id !== pane.id);
    if (sourceStack.activeId === pane.id) {
      sourceStack.activeId =
        sourceStack.children.length > 0 ? (sourceStack.children[0] as DockPane).id : null;
    }

    // 2. Add to target
    if (zone === "center") {
      targetStack.children.push(pane);
      targetStack.activeId = pane.id;
    } else {
      this.splitStack(targetStack, pane, zone as any);
    }

    // 3. Clean up empty stacks if there are multiple stacks
    if (this.shouldCleanupEmptyStacks()) {
      this.cleanupEmptyNodes(this._layout!.root);
    }
  }

  private moveStack(
    sourceStack: DockStack,
    targetStack: DockStack,
    zone: string,
  ) {
    // Can't drop center when dragging a whole stack
    if (zone === "center") return;

    const parent = this.findParent(this._layout!.root, sourceStack.id) as DockStack | null;
    if (!parent || (parent as any).direction === undefined) return; // Can't move root or non-container

    // Remove the source stack from its parent (parent is a container stack)
    const parentChildren = parent.children as DockStack[];
    const sourceIndex = parentChildren.indexOf(sourceStack);
    if (sourceIndex === -1) return;
    parentChildren.splice(sourceIndex, 1);

    // If parent now has only one child, collapse it
    if (parentChildren.length === 1) {
      const grandParent = this.findParent(this._layout!.root, parent.id) as DockStack | null;
      if (grandParent && (grandParent as any).direction !== undefined) {
        const grandChildren = grandParent.children as DockStack[];
        const parentIndex = grandChildren.indexOf(parent);
        const remainingChild = parentChildren[0];
        remainingChild.weight = parent.weight;
        grandChildren[parentIndex] = remainingChild;
      }
    }

    // Insert the source stack next to the target stack
    const targetParent = this.findParent(this._layout!.root, targetStack.id) as DockStack | null;
    const dir: "row" | "column" =
      zone === "left" || zone === "right" ? "row" : "column";
    const isAfter = zone === "right" || zone === "bottom";

    if (!targetParent) {
      // Target is root - wrap both in a new container-stack
      const oldRoot = this._layout!.root;
      sourceStack.weight = 1;
      this._layout!.root = {
        id: "stack-" + Math.random().toString(36).substring(2, 11),
        type: "stack",
        direction: dir,
        weight: 1,
        children: isAfter ? [oldRoot, sourceStack] : [sourceStack, oldRoot],
      } as any;
    } else if ((targetParent as any).direction === dir) {
      // Same direction - just insert into the container
      const targetIndex = (targetParent.children as DockStack[]).indexOf(targetStack);
      sourceStack.weight = targetStack.weight / 2;
      targetStack.weight /= 2;
      (targetParent.children as DockStack[]).splice(isAfter ? targetIndex + 1 : targetIndex, 0, sourceStack);
    } else {
      // Different direction - need to wrap target and source in a new container-stack
      const targetIndex = (targetParent.children as DockStack[]).indexOf(targetStack);
      sourceStack.weight = targetStack.weight / 2;
      targetStack.weight /= 2;
      const newContainer: DockStack = {
        id: "stack-" + Math.random().toString(36).substring(2, 11),
        type: "stack",
        direction: dir,
        weight: targetStack.weight * 2,
        children: isAfter ? [targetStack, sourceStack] : [sourceStack, targetStack],
      } as any;
      (targetParent.children as DockStack[])[targetIndex] = newContainer;
    }

    // Collapse any trivial single-child container stacks introduced by the move to avoid
    // chains of alternating row/column containers — flatten them.
    if (this._layout && this.isContainer(this._layout.root)) {
      this.simplifyBoxes(this._layout.root);
      const rootContainer = this._layout.root as DockStack;
      if ((rootContainer.children as DockStack[]).length === 1) {
        const onlyChild = (rootContainer.children as DockStack[])[0];
        onlyChild.weight = 1;
        this._layout.root = onlyChild;
      }
    }
  }

  private splitStack(
    targetStack: DockStack,
    pane: DockPane,
    direction: "top" | "bottom" | "left" | "right",
  ) {
    const parent = this.findParent(
      this._layout!.root,
      targetStack.id,
    );

    const dir: "row" | "column" =
      direction === "left" || direction === "right" ? "row" : "column";
    const isAfter = direction === "right" || direction === "bottom";

    const newStack: DockStack = {
      id: "stack-" + Math.random().toString(36).substring(2, 11),
      type: "stack",
      weight: targetStack.weight / 2,
      children: [pane],
      activeId: pane.id,
    };

    if (!parent) {
      // Target is root — wrap old root + newStack in a container-stack
      const oldRoot = this._layout!.root;
      this._layout!.root = {
        id: "stack-" + Math.random().toString(36).substring(2, 11),
        type: "stack",
        direction: dir,
        weight: 1,
        children: isAfter ? [oldRoot, newStack] : [newStack, oldRoot],
      } as any;
      // fall through to simplify below
    } else {
      targetStack.weight /= 2;

      if ((parent as any).direction === dir) {
        const index = (parent.children as DockStack[]).indexOf(targetStack);
        (parent.children as DockStack[]).splice(isAfter ? index + 1 : index, 0, newStack);
      } else {
        // Need to wrap targetStack in a new container-stack
        const index = (parent.children as DockStack[]).indexOf(targetStack);
        const newContainer: DockStack = {
          id: "stack-" + Math.random().toString(36).substring(2, 11),
          type: "stack",
          direction: dir,
          weight: targetStack.weight * 2,
          children: isAfter ? [targetStack, newStack] : [newStack, targetStack],
        } as any;
        (parent.children as DockStack[])[index] = newContainer;
      }
    }

    // Flatten any trivial single-child container stacks that may have been introduced by splitting.
    if (this._layout && this.isContainer(this._layout.root)) {
      this.simplifyBoxes(this._layout.root);
      const rootContainer = this._layout.root as DockStack;
      if ((rootContainer.children as DockStack[]).length === 1) {
        const onlyChild = (rootContainer.children as DockStack[])[0];
        onlyChild.weight = 1;
        this._layout.root = onlyChild;
      }
    }
  }

  private findParent(node: DockNode, targetId: string): DockStack | null {
    // Only container stacks can hold other stacks as children
    if (this.isContainer(node)) {
      for (const child of node.children as DockStack[]) {
        if (child.id === targetId) return node;
        const found = this.findParent(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  private cleanupEmptyNodes(node: DockNode): boolean {
    if (!this.isContainer(node)) return false;

    // First, recursively clean children (process nested containers first)
    node.children = (node.children as DockStack[]).filter((child) => {
      if (this.isContainer(child)) {
        return !this.cleanupEmptyNodes(child);
      }
      return true;
    }) as any;

    // Then filter out empty stacks - but keep at least one if this is the root
    // and all stacks are empty (to preserve placeholder)
    const isRoot = node === this._layout!.root;
    const totalStacks = this.countStacks(node);
    const emptyStacks = this.countEmptyStacks(node);

    // Remove empty stacks, but keep one if this is root and all are empty
    node.children = (node.children as DockStack[]).filter((child) => {
      if (this.isLeaf(child) && (child.children as DockPane[]).length === 0) {
        // Keep only if this is root, all stacks in this container are empty, and only 1 stack
        if (isRoot && emptyStacks === totalStacks && totalStacks === 1) {
          return true;
        }
        return false;
      }
      return true;
    }) as any;

    return (node.children as DockStack[]).length === 0;
  }

  /**
   * Simplify the layout tree by collapsing single-child container stacks
   */
  private simplifyBoxes(node: DockNode): void {
    if (!this.isContainer(node)) return;

    // First, recursively simplify all container children (bottom-up)
    const children = node.children as DockStack[];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (this.isContainer(child)) {
        this.simplifyBoxes(child);

        // After simplifying the child, if it is a container with exactly one child,
        // replace the child with its sole grandchild (flatten)
        const cc = child.children as DockStack[];
        if (cc.length === 1) {
          const grandchild = cc[0];
          grandchild.weight = child.weight;
          (node.children as DockStack[])[i] = grandchild;
        }
      }
    }
  }

  private countStacks(node: DockNode): number {
    if (this.isLeaf(node)) return 1;
    let count = 0;
    for (const child of node.children as DockStack[]) {
      count += this.countStacks(child);
    }
    return count;
  }

  private countEmptyStacks(node: DockNode): number {
    if (this.isLeaf(node)) {
      return (node.children as DockPane[]).length === 0 ? 1 : 0;
    }
    let count = 0;
    for (const child of node.children as DockStack[]) {
      count += this.countEmptyStacks(child);
    }
    return count;
  }

  private shouldCleanupEmptyStacks(): boolean {
    if (!this._layout) return false;
    // Only cleanup if there are empty stacks AND there's more than one stack total
    // (to preserve the last stack for placeholder display)
    return this.countStacks(this._layout.root) > 1 && this.countEmptyStacks(this._layout.root) > 0;
  }

  /**
   * Handle pane-close event from dock-stack components
   */
  private handlePaneClose(paneId: string): void {
    if (!this._layout) return;

    // Find and remove the pane from its stack
    this.removePaneFromNode(this._layout.root, paneId);

    // Clean up empty stacks and redistribute their space
    const didCleanup = this.cleanupEmptyStacks();

    // If cleanup didn't happen, trigger re-render to update UI
    if (!didCleanup) {
      this.render();
    }

    this.notifyLayoutChange();
  }

  /**
   * Recursively remove a pane from a dock node and its children
   */
  private removePaneFromNode(node: DockNode, paneId: string): void {
    if (this.isLeaf(node)) {
      node.children = (node.children as DockPane[]).filter(p => p.id !== paneId) as any;
      if (node.activeId === paneId) {
        node.activeId = (node.children as DockPane[]).length > 0 ? (node.children as DockPane[])[0].id : null;
      }
    } else if (this.isContainer(node)) {
      for (const child of node.children as DockStack[]) {
        this.removePaneFromNode(child, paneId);
      }
    }
  }

  /**
   * Public method to cleanup empty stacks and redistribute space.
   * Called when panes are closed to remove empty docks.
   * @returns true if cleanup was performed, false otherwise
   */
  public cleanupEmptyStacks(): boolean {
    if (!this._layout) return false;
    const hadEmptyStacks = this.shouldCleanupEmptyStacks();

    if (hadEmptyStacks) {
      this.cleanupEmptyNodes(this._layout.root);
    }

    // Always simplify container-stacks after potential cleanup, or when explicitly called
    // This handles cases where nested containers have single children
    if (this.isContainer(this._layout.root)) {
      this.simplifyBoxes(this._layout.root);
      // After simplifying, check if root container has only one child
      // If so, replace root with that child
      const rootContainer = this._layout.root as DockStack;
      if ((rootContainer.children as DockStack[]).length === 1) {
        const onlyChild = (rootContainer.children as DockStack[])[0];
        onlyChild.weight = 1; // Ensure full weight
        this._layout.root = onlyChild;
      }
    }

    if (hadEmptyStacks) {
      this.render();
      this.notifyLayoutChange();
      return true;
    }
    return false;
  }

  /**
   * Simplify the layout tree by collapsing boxes with only one child.
   * This can be called to clean up nested box structures.
   */
  public simplifyLayout(): void {
    if (!this._layout) return;

    if (this.isContainer(this._layout.root)) {
      this.simplifyBoxes(this._layout.root);
      // After simplifying, check if root container has only one child
      const rootContainer = this._layout.root as DockStack;
      if ((rootContainer.children as DockStack[]).length === 1) {
        const onlyChild = (rootContainer.children as DockStack[])[0];
        onlyChild.weight = 1;
        this._layout.root = onlyChild;
      }
      this.render();
      this.notifyLayoutChange();
    }
  }
}
customElements.define("dock-manager", DockManager);

import "./dock-box.js";
import "./dock-stack.js";
