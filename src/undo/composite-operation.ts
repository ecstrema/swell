/**
 * Composite operation that groups multiple operations together
 * All operations are executed/undone/redone as a single unit
 * 
 * Note: Operations should NOT be executed when added to the composite.
 * They will be executed when the composite's do() method is called.
 */
export class CompositeOperation implements UndoableOperation {
    private operations: UndoableOperation[] = [];
    private description: string;

    constructor(description: string) {
        this.description = description;
    }

    /**
     * Add an operation to the composite
     * The operation is NOT executed immediately - it will be executed when do() is called
     */
    addOperation(operation: UndoableOperation): void {
        this.operations.push(operation);
    }

    /**
     * Get the number of operations in the composite
     */
    getOperationCount(): number {
        return this.operations.length;
    }

    /**
     * Execute all operations in order
     */
    do(): void {
        for (const operation of this.operations) {
            operation.do();
        }
    }

    /**
     * Undo all operations in reverse order
     */
    undo(): void {
        for (let i = this.operations.length - 1; i >= 0; i--) {
            this.operations[i].undo();
        }
    }

    /**
     * Redo all operations in order
     */
    redo(): void {
        for (const operation of this.operations) {
            operation.redo();
        }
    }

    /**
     * Get the description of the composite operation
     */
    getDescription(): string {
        if (this.operations.length === 0) {
            return this.description;
        }
        if (this.operations.length === 1) {
            return `${this.description} (1 operation)`;
        }
        return `${this.description} (${this.operations.length} operations)`;
    }
}
