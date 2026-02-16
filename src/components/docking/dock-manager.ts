import { DockBox, DockLayout, DockNode, DockPane, DockStack } from "./types.js";
import { css } from "../../utils/css-utils.js";
import { scrollbarSheet } from "../../styles/shared-sheets.js";
import dockManagerCss from "./dock-manager.css?inline";

export class DockManager extends HTMLElement {
  private _layout: DockLayout | null = null;
  private _contentRegistry: Map<string, (id: string) => HTMLElement> =
    new Map();
  private _draggedPane: { pane: DockPane; sourceStack: DockStack } | null =
    null;
  private _draggedStack: DockStack | null = null;
  private _dropOverlay: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(dockManagerCss)];
  }

  set layout(value: DockLayout) {
    this._layout = value;
    this.render();
  }

  get layout(): DockLayout | null {
    return this._layout;
  }

  registerContent(contentId: string, builder: (id: string) => HTMLElement) {
    this._contentRegistry.set(contentId, builder);
  }

  getContent(contentId: string, id: string): HTMLElement {
    const builder = this._contentRegistry.get(contentId);
    if (builder) {
      return builder(id);
    }
    const fallback = document.createElement("div");
    fallback.textContent = `Content not found: ${contentId}`;
    return fallback;
  }

  connectedCallback() {
    this.render();
    this.addEventListener("dragover", (e) => e.preventDefault());
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

  public renderNode(node: DockNode, container: Element) {
    let element: HTMLElement;
    if (node.type === "box") {
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
    // 1. Remove from source
    sourceStack.children = sourceStack.children.filter((p) => p.id !== pane.id);
    if (sourceStack.activeId === pane.id) {
      sourceStack.activeId =
        sourceStack.children.length > 0 ? sourceStack.children[0].id : null;
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

    const parent = this.findParent(this._layout!.root, sourceStack.id) as DockBox;
    if (!parent) return; // Can't move root

    // Remove the source stack from its parent
    const sourceIndex = parent.children.indexOf(sourceStack);
    if (sourceIndex === -1) return;
    parent.children.splice(sourceIndex, 1);

    // If parent now has only one child, collapse it
    if (parent.children.length === 1) {
      const grandParent = this.findParent(this._layout!.root, parent.id) as DockBox;
      if (grandParent) {
        const parentIndex = grandParent.children.indexOf(parent);
        const remainingChild = parent.children[0];
        remainingChild.weight = parent.weight;
        grandParent.children[parentIndex] = remainingChild;
      }
    }

    // Insert the source stack next to the target stack
    const targetParent = this.findParent(this._layout!.root, targetStack.id) as DockBox;
    const dir: "row" | "column" =
      zone === "left" || zone === "right" ? "row" : "column";
    const isAfter = zone === "right" || zone === "bottom";

    if (!targetParent) {
      // Target is root - wrap both in a new box
      const oldRoot = this._layout!.root;
      sourceStack.weight = 1;
      this._layout!.root = {
        id: "box-" + Math.random().toString(36).substring(2, 11),
        type: "box",
        direction: dir,
        weight: 1,
        children: isAfter ? [oldRoot, sourceStack] : [sourceStack, oldRoot],
      };
    } else if (targetParent.direction === dir) {
      // Same direction - just insert
      const targetIndex = targetParent.children.indexOf(targetStack);
      sourceStack.weight = targetStack.weight / 2;
      targetStack.weight /= 2;
      targetParent.children.splice(isAfter ? targetIndex + 1 : targetIndex, 0, sourceStack);
    } else {
      // Different direction - need to wrap target and source in a new box
      const targetIndex = targetParent.children.indexOf(targetStack);
      sourceStack.weight = targetStack.weight / 2;
      targetStack.weight /= 2;
      const newBox: DockBox = {
        id: "box-" + Math.random().toString(36).substring(2, 11),
        type: "box",
        direction: dir,
        weight: targetStack.weight * 2,
        children: isAfter ? [targetStack, sourceStack] : [sourceStack, targetStack],
      };
      targetParent.children[targetIndex] = newBox;
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
    ) as DockBox;

    if (!parent) {
      // Target is root!
      const oldRoot = this._layout!.root;
      const dir: "row" | "column" =
        direction === "left" || direction === "right" ? "row" : "column";
      const isAfter = direction === "right" || direction === "bottom";

      const newStack: DockStack = {
        id: "stack-" + Math.random().toString(36).substring(2, 11),
        type: "stack",
        weight: 1,
        children: [pane],
        activeId: pane.id,
      };

      this._layout!.root = {
        id: "box-root",
        type: "box",
        direction: dir,
        weight: 1,
        children: isAfter ? [oldRoot, newStack] : [newStack, oldRoot],
      };
      return;
    }

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
    targetStack.weight /= 2;

    if (parent.direction === dir) {
      const index = parent.children.indexOf(targetStack);
      parent.children.splice(isAfter ? index + 1 : index, 0, newStack);
    } else {
      // Need to wrap targetStack in a new Box
      const index = parent.children.indexOf(targetStack);
      const newBox: DockBox = {
        id: "box-" + Math.random().toString(36).substring(2, 11),
        type: "box",
        direction: dir,
        weight: targetStack.weight * 2,
        children: isAfter ? [targetStack, newStack] : [newStack, targetStack],
      };
      parent.children[index] = newBox;
    }
  }

  private findParent(node: DockNode, targetId: string): DockNode | null {
    if (node.type === "box") {
      for (const child of node.children) {
        if (child.id === targetId) return node;
        const found = this.findParent(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  private cleanupEmptyNodes(node: DockNode): boolean {
    if (node.type === "box") {
      node.children = node.children.filter((child) => {
        if (child.type === "stack" && child.children.length === 0) return false;
        if (child.type === "box") return !this.cleanupEmptyNodes(child);
        return true;
      });
      return node.children.length === 0;
    }
    return false;
  }

  private countStacks(node: DockNode): number {
    if (node.type === "stack") {
      return 1;
    }
    let count = 0;
    for (const child of node.children) {
      count += this.countStacks(child);
    }
    return count;
  }

  private shouldCleanupEmptyStacks(): boolean {
    if (!this._layout) return false;
    return this.countStacks(this._layout.root) > 1;
  }

  /**
   * Public method to cleanup empty stacks and redistribute space.
   * Called when panes are closed to remove empty docks.
   */
  public cleanupEmptyStacks(): void {
    if (!this._layout) return;
    if (this.shouldCleanupEmptyStacks()) {
      this.cleanupEmptyNodes(this._layout.root);
      this.render();
    }
  }
}
customElements.define("dock-manager", DockManager);

import "./dock-box.js";
import "./dock-stack.js";
