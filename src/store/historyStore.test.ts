import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore, type HistoryAction } from './historyStore';

const createMockAction = (overrides?: Partial<HistoryAction>): HistoryAction => ({
  type: 'card_create',
  data: { id: 'card-1', title: 'Test Card' },
  inverse: { id: 'card-1' },
  description: 'Created card',
  ...overrides,
});

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({
      past: [],
      future: [],
      maxHistory: 50,
    });
  });

  describe('push', () => {
    it('should push action to past stack', () => {
      const action = createMockAction();
      useHistoryStore.getState().push(action);

      const state = useHistoryStore.getState();
      expect(state.past).toHaveLength(1);
      expect(state.past[0]).toEqual(action);
    });

    it('should clear future stack on new push', () => {
      const action1 = createMockAction({ description: 'Action 1' });
      const action2 = createMockAction({ description: 'Action 2' });
      const action3 = createMockAction({ description: 'Action 3' });

      useHistoryStore.getState().push(action1);
      useHistoryStore.getState().push(action2);
      useHistoryStore.getState().push(action3);

      // Undo twice to populate future
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo();

      let state = useHistoryStore.getState();
      expect(state.future).toHaveLength(2);

      // Push new action should clear future
      const newAction = createMockAction({ description: 'New Action' });
      useHistoryStore.getState().push(newAction);

      state = useHistoryStore.getState();
      expect(state.future).toHaveLength(0);
      expect(state.past).toHaveLength(2); // action1 + newAction
    });

    it('should enforce max history limit', () => {
      useHistoryStore.setState({ maxHistory: 3 });

      for (let i = 0; i < 5; i++) {
        const action = createMockAction({ description: `Action ${i}` });
        useHistoryStore.getState().push(action);
      }

      const state = useHistoryStore.getState();
      expect(state.past).toHaveLength(3); // Only keeps last 3
      expect(state.past[0].description).toBe('Action 2');
      expect(state.past[1].description).toBe('Action 3');
      expect(state.past[2].description).toBe('Action 4');
    });
  });

  describe('undo', () => {
    it('should move action from past to future', () => {
      const action = createMockAction();
      useHistoryStore.getState().push(action);

      const undoResult = useHistoryStore.getState().undo();

      const state = useHistoryStore.getState();
      expect(undoResult).toEqual(action);
      expect(state.past).toHaveLength(0);
      expect(state.future).toHaveLength(1);
      expect(state.future[0]).toEqual(action);
    });

    it('should return null when past is empty', () => {
      const result = useHistoryStore.getState().undo();

      expect(result).toBeNull();
      const state = useHistoryStore.getState();
      expect(state.past).toHaveLength(0);
      expect(state.future).toHaveLength(0);
    });

    it('should undo multiple actions in reverse order', () => {
      const action1 = createMockAction({ description: 'Action 1' });
      const action2 = createMockAction({ description: 'Action 2' });
      const action3 = createMockAction({ description: 'Action 3' });

      useHistoryStore.getState().push(action1);
      useHistoryStore.getState().push(action2);
      useHistoryStore.getState().push(action3);

      // Undo in reverse order
      let undone = useHistoryStore.getState().undo();
      expect(undone?.description).toBe('Action 3');

      undone = useHistoryStore.getState().undo();
      expect(undone?.description).toBe('Action 2');

      undone = useHistoryStore.getState().undo();
      expect(undone?.description).toBe('Action 1');

      const state = useHistoryStore.getState();
      expect(state.past).toHaveLength(0);
      expect(state.future).toHaveLength(3);
    });

    it('should preserve future order during undo', () => {
      const action1 = createMockAction({ description: 'Action 1' });
      const action2 = createMockAction({ description: 'Action 2' });

      useHistoryStore.getState().push(action1);
      useHistoryStore.getState().push(action2);

      useHistoryStore.getState().undo();

      const state = useHistoryStore.getState();
      expect(state.future[0].description).toBe('Action 2');
    });
  });

  describe('redo', () => {
    it('should move action from future to past', () => {
      const action = createMockAction();
      useHistoryStore.getState().push(action);
      useHistoryStore.getState().undo();

      const redoResult = useHistoryStore.getState().redo();

      const state = useHistoryStore.getState();
      expect(redoResult).toEqual(action);
      expect(state.past).toHaveLength(1);
      expect(state.past[0]).toEqual(action);
      expect(state.future).toHaveLength(0);
    });

    it('should return null when future is empty', () => {
      const result = useHistoryStore.getState().redo();

      expect(result).toBeNull();
      const state = useHistoryStore.getState();
      expect(state.past).toHaveLength(0);
      expect(state.future).toHaveLength(0);
    });

    it('should redo multiple actions in order', () => {
      const action1 = createMockAction({ description: 'Action 1' });
      const action2 = createMockAction({ description: 'Action 2' });
      const action3 = createMockAction({ description: 'Action 3' });

      useHistoryStore.getState().push(action1);
      useHistoryStore.getState().push(action2);
      useHistoryStore.getState().push(action3);

      // Undo all
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo();

      // Redo in order
      let redone = useHistoryStore.getState().redo();
      expect(redone?.description).toBe('Action 1');

      redone = useHistoryStore.getState().redo();
      expect(redone?.description).toBe('Action 2');

      redone = useHistoryStore.getState().redo();
      expect(redone?.description).toBe('Action 3');

      const state = useHistoryStore.getState();
      expect(state.past).toHaveLength(3);
      expect(state.future).toHaveLength(0);
    });
  });

  describe('canUndo / canRedo', () => {
    it('should return false when no actions in past', () => {
      expect(useHistoryStore.getState().canUndo()).toBe(false);
    });

    it('should return true when actions in past', () => {
      const action = createMockAction();
      useHistoryStore.getState().push(action);

      expect(useHistoryStore.getState().canUndo()).toBe(true);
    });

    it('should return false when no actions in future', () => {
      expect(useHistoryStore.getState().canRedo()).toBe(false);
    });

    it('should return true when actions in future', () => {
      const action = createMockAction();
      useHistoryStore.getState().push(action);
      useHistoryStore.getState().undo();

      expect(useHistoryStore.getState().canRedo()).toBe(true);
    });

    it('should toggle canUndo on push/undo', () => {
      expect(useHistoryStore.getState().canUndo()).toBe(false);

      const action = createMockAction();
      useHistoryStore.getState().push(action);
      expect(useHistoryStore.getState().canUndo()).toBe(true);

      useHistoryStore.getState().undo();
      expect(useHistoryStore.getState().canUndo()).toBe(false);
    });

    it('should toggle canRedo on undo/redo', () => {
      expect(useHistoryStore.getState().canRedo()).toBe(false);

      const action = createMockAction();
      useHistoryStore.getState().push(action);
      expect(useHistoryStore.getState().canRedo()).toBe(false);

      useHistoryStore.getState().undo();
      expect(useHistoryStore.getState().canRedo()).toBe(true);

      useHistoryStore.getState().redo();
      expect(useHistoryStore.getState().canRedo()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      const action1 = createMockAction();
      const action2 = createMockAction();

      useHistoryStore.getState().push(action1);
      useHistoryStore.getState().push(action2);
      useHistoryStore.getState().undo();

      const state = useHistoryStore.getState();
      expect(state.past).toHaveLength(1);
      expect(state.future).toHaveLength(1);

      useHistoryStore.getState().clear();

      const clearedState = useHistoryStore.getState();
      expect(clearedState.past).toHaveLength(0);
      expect(clearedState.future).toHaveLength(0);
      expect(clearedState.canUndo()).toBe(false);
      expect(clearedState.canRedo()).toBe(false);
    });
  });
});
