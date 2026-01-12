import { create } from 'zustand';
import type {
  Board,
  Card,
  Column,
  CreateBoardInput,
  CreateCardInput,
  CreateColumnInput,
  UpdateBoardInput,
  UpdateCardInput,
  UpdateColumnInput,
  ColumnView,
} from '../types';
import { tauriStorage } from '../lib/tauriStorage';
import { normalizeById, sortByOrder, calculateOrderBetween } from '../lib/utils';

export interface KanbanStore {
  // State
  boards: Record<string, Board>;
  columns: Record<string, Column>;
  cards: Record<string, Card>;
  activeBoardId: string | null;
  isLoading: boolean;
  error: string | null;

  // Derived selectors
  getActiveBoard: () => Board | null;
  getColumnsForActiveBoard: () => Column[];
  getCardsForColumn: (columnId: string) => Card[];
  getColumnViews: () => ColumnView[];

  // Board actions
  loadBoards: () => Promise<void>;
  loadBoard: (id: string) => Promise<void>;
  createBoard: (input: CreateBoardInput) => Promise<Board>;
  updateBoard: (id: string, input: UpdateBoardInput) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  setActiveBoard: (id: string) => Promise<void>;

  // Column actions
  createColumn: (input: CreateColumnInput) => Promise<Column>;
  updateColumn: (id: string, input: UpdateColumnInput) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  moveColumn: (id: string, newIndex: number) => Promise<void>;

  // Card actions
  createCard: (input: CreateCardInput) => Promise<Card>;
  updateCard: (id: string, input: UpdateCardInput) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, targetColumnId: string, targetIndex: number) => Promise<void>;

  // Utility
  clearError: () => void;
}

export const useKanbanStore = create<KanbanStore>((set, get) => ({
  // Initial state
  boards: {},
  columns: {},
  cards: {},
  activeBoardId: null,
  isLoading: false,
  error: null,

  // Derived selectors
  getActiveBoard: () => {
    const { boards, activeBoardId } = get();
    return activeBoardId ? boards[activeBoardId] ?? null : null;
  },

  getColumnsForActiveBoard: () => {
    const { columns, activeBoardId } = get();
    if (!activeBoardId) return [];
    return sortByOrder(
      Object.values(columns).filter((col) => col.boardId === activeBoardId)
    );
  },

  getCardsForColumn: (columnId: string) => {
    const { cards } = get();
    return sortByOrder(
      Object.values(cards).filter((card) => card.columnId === columnId)
    );
  },

  getColumnViews: () => {
    const columns = get().getColumnsForActiveBoard();
    return columns.map((column) => ({
      column,
      cards: get().getCardsForColumn(column.id),
    }));
  },

  // Board actions
  loadBoards: async () => {
    set({ isLoading: true, error: null });
    try {
      const boards = await tauriStorage.getAllBoards();
      set({ boards: normalizeById(boards), isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadBoard: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const [board, columns, cards] = await Promise.all([
        tauriStorage.getBoard(id),
        tauriStorage.getColumnsForBoard(id),
        tauriStorage.getCardsForBoard(id),
      ]);

      if (!board) {
        throw new Error('Board not found');
      }

      await tauriStorage.setLastOpenedBoard(id);

      set((state) => ({
        boards: { ...state.boards, [board.id]: board },
        columns: { ...state.columns, ...normalizeById(columns) },
        cards: { ...state.cards, ...normalizeById(cards) },
        activeBoardId: id,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  createBoard: async (input: CreateBoardInput) => {
    set({ isLoading: true, error: null });
    try {
      const board = await tauriStorage.createBoard(input);

      // Create default columns
      const defaultColumns = ['To Do', 'Doing', 'Done'];
      const columns: Column[] = [];
      for (let i = 0; i < defaultColumns.length; i++) {
        const column = await tauriStorage.createColumn({
          boardId: board.id,
          name: defaultColumns[i],
          order: i + 1,
        });
        columns.push(column);
      }

      set((state) => ({
        boards: { ...state.boards, [board.id]: board },
        columns: { ...state.columns, ...normalizeById(columns) },
        isLoading: false,
      }));

      return board;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  updateBoard: async (id: string, input: UpdateBoardInput) => {
    // Optimistic update
    const previousBoard = get().boards[id];
    if (previousBoard && input.name) {
      set((state) => ({
        boards: {
          ...state.boards,
          [id]: { ...previousBoard, name: input.name!, updatedAt: new Date().toISOString() },
        },
      }));
    }

    try {
      const board = await tauriStorage.updateBoard(id, input);
      set((state) => ({
        boards: { ...state.boards, [board.id]: board },
      }));
    } catch (error) {
      // Rollback on failure
      if (previousBoard) {
        set((state) => ({
          boards: { ...state.boards, [id]: previousBoard },
        }));
      }
      set({ error: String(error) });
    }
  },

  deleteBoard: async (id: string) => {
    const previousBoards = get().boards;
    const previousColumns = get().columns;
    const previousCards = get().cards;

    // Optimistic update
    set((state) => {
      const newBoards = { ...state.boards };
      delete newBoards[id];

      const newColumns = { ...state.columns };
      const newCards = { ...state.cards };

      // Remove columns and cards for this board
      Object.values(state.columns)
        .filter((col) => col.boardId === id)
        .forEach((col) => {
          delete newColumns[col.id];
          Object.values(state.cards)
            .filter((card) => card.columnId === col.id)
            .forEach((card) => delete newCards[card.id]);
        });

      return {
        boards: newBoards,
        columns: newColumns,
        cards: newCards,
        activeBoardId: state.activeBoardId === id ? null : state.activeBoardId,
      };
    });

    try {
      await tauriStorage.deleteBoard(id);
    } catch (error) {
      // Rollback on failure
      set({
        boards: previousBoards,
        columns: previousColumns,
        cards: previousCards,
        error: String(error),
      });
    }
  },

  setActiveBoard: async (id: string) => {
    await get().loadBoard(id);
  },

  // Column actions
  createColumn: async (input: CreateColumnInput) => {
    try {
      const column = await tauriStorage.createColumn(input);
      set((state) => ({
        columns: { ...state.columns, [column.id]: column },
      }));
      return column;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateColumn: async (id: string, input: UpdateColumnInput) => {
    const previousColumn = get().columns[id];

    // Optimistic update
    if (previousColumn) {
      set((state) => ({
        columns: {
          ...state.columns,
          [id]: {
            ...previousColumn,
            ...input,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    }

    try {
      const column = await tauriStorage.updateColumn(id, input);
      set((state) => ({
        columns: { ...state.columns, [column.id]: column },
      }));
    } catch (error) {
      // Rollback
      if (previousColumn) {
        set((state) => ({
          columns: { ...state.columns, [id]: previousColumn },
        }));
      }
      set({ error: String(error) });
    }
  },

  deleteColumn: async (id: string) => {
    const previousColumns = get().columns;
    const previousCards = get().cards;

    // Optimistic update
    set((state) => {
      const newColumns = { ...state.columns };
      delete newColumns[id];

      const newCards = { ...state.cards };
      Object.values(state.cards)
        .filter((card) => card.columnId === id)
        .forEach((card) => delete newCards[card.id]);

      return { columns: newColumns, cards: newCards };
    });

    try {
      await tauriStorage.deleteColumn(id);
    } catch (error) {
      set({
        columns: previousColumns,
        cards: previousCards,
        error: String(error),
      });
    }
  },

  moveColumn: async (id: string, newIndex: number) => {
    const columns = get().getColumnsForActiveBoard();
    const currentIndex = columns.findIndex((col) => col.id === id);
    if (currentIndex === -1 || currentIndex === newIndex) return;

    const before = newIndex > 0 ? columns[newIndex - 1]?.order : null;
    const after = newIndex < columns.length - 1 ? columns[newIndex]?.order : null;
    const newOrder = calculateOrderBetween(
      newIndex > currentIndex ? columns[newIndex]?.order ?? null : before,
      newIndex > currentIndex ? after : columns[newIndex]?.order ?? null
    );

    const previousColumn = get().columns[id];

    // Optimistic update
    set((state) => ({
      columns: {
        ...state.columns,
        [id]: { ...state.columns[id], order: newOrder },
      },
    }));

    try {
      await tauriStorage.updateColumn(id, { order: newOrder });
    } catch (error) {
      set((state) => ({
        columns: { ...state.columns, [id]: previousColumn },
        error: String(error),
      }));
    }
  },

  // Card actions
  createCard: async (input: CreateCardInput) => {
    try {
      const card = await tauriStorage.createCard(input);
      set((state) => ({
        cards: { ...state.cards, [card.id]: card },
      }));
      return card;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateCard: async (id: string, input: UpdateCardInput) => {
    const previousCard = get().cards[id];

    // Optimistic update
    if (previousCard) {
      set((state) => ({
        cards: {
          ...state.cards,
          [id]: {
            ...previousCard,
            ...input,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    }

    try {
      const card = await tauriStorage.updateCard(id, input);
      set((state) => ({
        cards: { ...state.cards, [card.id]: card },
      }));
    } catch (error) {
      // Rollback
      if (previousCard) {
        set((state) => ({
          cards: { ...state.cards, [id]: previousCard },
        }));
      }
      set({ error: String(error) });
    }
  },

  deleteCard: async (id: string) => {
    const previousCards = get().cards;

    // Optimistic update
    set((state) => {
      const newCards = { ...state.cards };
      delete newCards[id];
      return { cards: newCards };
    });

    try {
      await tauriStorage.deleteCard(id);
    } catch (error) {
      set({ cards: previousCards, error: String(error) });
    }
  },

  moveCard: async (cardId: string, targetColumnId: string, targetIndex: number) => {
    const card = get().cards[cardId];
    if (!card) return;

    const targetCards = get().getCardsForColumn(targetColumnId);

    // Calculate new order
    let newOrder: number;
    if (targetCards.length === 0) {
      newOrder = 1.0;
    } else if (targetIndex === 0) {
      newOrder = targetCards[0].order / 2;
    } else if (targetIndex >= targetCards.length) {
      newOrder = targetCards[targetCards.length - 1].order + 1;
    } else {
      const before = targetCards[targetIndex - 1].order;
      const after = targetCards[targetIndex].order;
      newOrder = (before + after) / 2;
    }

    const previousCard = get().cards[cardId];

    // Optimistic update
    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: {
          ...card,
          columnId: targetColumnId,
          order: newOrder,
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    try {
      await tauriStorage.moveCard(cardId, {
        columnId: targetColumnId,
        order: newOrder,
      });
    } catch (error) {
      // Rollback
      set((state) => ({
        cards: { ...state.cards, [cardId]: previousCard },
        error: String(error),
      }));
    }
  },

  // Utility
  clearError: () => set({ error: null }),
}));
