import { UndoManager } from './undo-manager.js';
import { UndoableOperation } from './undo-tree.js';

interface TestState {
    signals: string[];
}

function createAddSignalOperation(
    state: TestState,
    signalName: string
): UndoableOperation {
    return {
        do: () => {
            console.log(`DO: Adding ${signalName}, current state:`, state.signals);
            state.signals.push(signalName);
            console.log(`DO: After adding ${signalName}, state:`, state.signals);
        },
        undo: () => {
            console.log(`UNDO: Removing ${signalName}, current state:`, state.signals);
            const index = state.signals.indexOf(signalName);
            if (index > -1) {
                state.signals.splice(index, 1);
            }
            console.log(`UNDO: After removing ${signalName}, state:`, state.signals);
        },
        redo: () => {
            console.log(`REDO: Adding ${signalName}, current state:`, state.signals);
            state.signals.push(signalName);
            console.log(`REDO: After adding ${signalName}, state:`, state.signals);
        },
        getDescription: () => `Add signal ${signalName}`
    };
}

const undoManager = new UndoManager();
const state: TestState = { signals: [] };

console.log('=== Starting batch ===');
undoManager.startBatch('Add multiple signals');

console.log('\n=== Executing signal1 ===');
undoManager.execute(createAddSignalOperation(state, 'signal1'));

console.log('\n=== Executing signal2 ===');
undoManager.execute(createAddSignalOperation(state, 'signal2'));

console.log('\n=== Executing signal3 ===');
undoManager.execute(createAddSignalOperation(state, 'signal3'));

console.log('\n=== Ending batch ===');
undoManager.endBatch();

console.log('\nState after batch:', state.signals);
console.log('Tree size:', undoManager.getUndoTree().size());
console.log('Can undo?', undoManager.canUndo());

console.log('\n=== Calling undo ===');
undoManager.undo();

console.log('\nState after undo:', state.signals);
