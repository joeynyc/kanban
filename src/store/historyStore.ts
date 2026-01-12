import { create } from 'zustand';

export type ActionType =
  | 'card_create'
  | 'card_update'
  | 'card_delete'
  | 'card_move'
  | 'column_create'
  | 'column_update'
  | 'column_delete'
  | 'column_move';

export interface HistoryAction {
  type: ActionType;
  data: unknown;
  inverse: unknown;
  description: string;
}

interface HistoryStore {
  past: HistoryAction[];
  future: HistoryAction[];
  maxHistory: number;

  // Actions
  push: (action: HistoryAction) => void;
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  push: (action: HistoryAction) => {
    set((state) => ({
      past: [...state.past.slice(-state.maxHistory + 1), action],
      future: [], // Clear redo stack on new action
    }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;

    const action = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [action, ...future],
    });

    return action;
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;

    const action = future[0];
    set({
      past: [...past, action],
      future: future.slice(1),
    });

    return action;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}));
