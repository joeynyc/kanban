import { create } from 'zustand';
import type {
  Board,
  Card,
  Column,
  Label,
  Checklist,
  ChecklistItem,
  CreateBoardInput,
  CreateCardInput,
  CreateColumnInput,
  UpdateBoardInput,
  UpdateCardInput,
  UpdateColumnInput,
  CreateLabelInput,
  UpdateLabelInput,
  CreateChecklistInput,
  UpdateChecklistInput,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
  ColumnView,
} from '../types';
import { tauriStorage } from '../lib/tauriStorage';
import { normalizeById, sortByOrder, calculateOrderBetween } from '../lib/utils';

export interface KanbanStore {
  // State
  boards: Record<string, Board>;
  columns: Record<string, Column>;
  cards: Record<string, Card>;
  labels: Record<string, Label>;
  cardLabels: Record<string, string[]>;
  checklists: Record<string, Checklist>;
  checklistItems: Record<string, ChecklistItem>;
  activeBoardId: string | null;
  isLoading: boolean;
  error: string | null;

  // Derived selectors
  getActiveBoard: () => Board | null;
  getColumnsForActiveBoard: () => Column[];
  getCardsForColumn: (columnId: string) => Card[];
  getColumnViews: () => ColumnView[];
  getLabelsForActiveBoard: () => Label[];
  getLabelsForCard: (cardId: string) => Label[];
  getChecklistsForCard: (cardId: string) => Checklist[];
  getChecklistItemsForChecklist: (checklistId: string) => ChecklistItem[];
  getChecklistProgress: (cardId: string) => { checked: number; total: number } | null;

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

  // Label actions
  createLabel: (input: CreateLabelInput) => Promise<Label>;
  updateLabel: (id: string, input: UpdateLabelInput) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
  addLabelToCard: (cardId: string, labelId: string) => Promise<void>;
  removeLabelFromCard: (cardId: string, labelId: string) => Promise<void>;

  // Checklist actions
  createChecklist: (input: CreateChecklistInput) => Promise<Checklist>;
  updateChecklist: (id: string, input: UpdateChecklistInput) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;
  createChecklistItem: (input: CreateChecklistItemInput) => Promise<ChecklistItem>;
  updateChecklistItem: (id: string, input: UpdateChecklistItemInput) => Promise<void>;
  deleteChecklistItem: (id: string) => Promise<void>;
  toggleChecklistItem: (id: string) => Promise<void>;

  // Import
  importBoard: (jsonData: string) => Promise<Board>;
  importTrelloBoard: (jsonData: string, boardName?: string) => Promise<Board>;

  // Utility
  clearError: () => void;
}

export const useKanbanStore = create<KanbanStore>((set, get) => ({
  // Initial state
  boards: {},
  columns: {},
  cards: {},
  labels: {},
  cardLabels: {},
  checklists: {},
  checklistItems: {},
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

  getLabelsForActiveBoard: () => {
    const { labels, activeBoardId } = get();
    if (!activeBoardId) return [];
    return Object.values(labels)
      .filter((l) => l.boardId === activeBoardId)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  getLabelsForCard: (cardId: string) => {
    const { cardLabels, labels } = get();
    const labelIds = cardLabels[cardId] || [];
    return labelIds
      .map((id) => labels[id])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  getChecklistsForCard: (cardId: string) => {
    const { checklists } = get();
    return sortByOrder(
      Object.values(checklists).filter((cl) => cl.cardId === cardId)
    );
  },

  getChecklistItemsForChecklist: (checklistId: string) => {
    const { checklistItems } = get();
    return sortByOrder(
      Object.values(checklistItems).filter((ci) => ci.checklistId === checklistId)
    );
  },

  getChecklistProgress: (cardId: string) => {
    const checklists = get().getChecklistsForCard(cardId);
    if (checklists.length === 0) return null;

    const { checklistItems } = get();
    const checklistIds = new Set(checklists.map((cl) => cl.id));
    const items = Object.values(checklistItems).filter((ci) => checklistIds.has(ci.checklistId));
    if (items.length === 0) return null;

    return {
      checked: items.filter((ci) => ci.checked).length,
      total: items.length,
    };
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
      const [board, columns, cards, labels, cardLabelMappings, checklists, checklistItemsList] = await Promise.all([
        tauriStorage.getBoard(id),
        tauriStorage.getColumnsForBoard(id),
        tauriStorage.getCardsForBoard(id),
        tauriStorage.getLabelsForBoard(id),
        tauriStorage.getCardLabelsForBoard(id),
        tauriStorage.getChecklistsForBoard(id),
        tauriStorage.getChecklistItemsForBoard(id),
      ]);

      if (!board) {
        throw new Error('Board not found');
      }

      await tauriStorage.setLastOpenedBoard(id);

      // Build cardLabels map: cardId -> labelId[]
      const cardLabelsMap: Record<string, string[]> = {};
      for (const mapping of cardLabelMappings) {
        if (!cardLabelsMap[mapping.cardId]) {
          cardLabelsMap[mapping.cardId] = [];
        }
        cardLabelsMap[mapping.cardId].push(mapping.labelId);
      }

      set((state) => ({
        boards: { ...state.boards, [board.id]: board },
        columns: { ...state.columns, ...normalizeById(columns) },
        cards: { ...state.cards, ...normalizeById(cards) },
        labels: { ...state.labels, ...normalizeById(labels) },
        cardLabels: { ...state.cardLabels, ...cardLabelsMap },
        checklists: { ...state.checklists, ...normalizeById(checklists) },
        checklistItems: { ...state.checklistItems, ...normalizeById(checklistItemsList) },
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

  // Label actions
  createLabel: async (input: CreateLabelInput) => {
    try {
      const label = await tauriStorage.createLabel(input);
      set((state) => ({
        labels: { ...state.labels, [label.id]: label },
      }));
      return label;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateLabel: async (id: string, input: UpdateLabelInput) => {
    const previousLabel = get().labels[id];
    if (previousLabel) {
      set((state) => ({
        labels: {
          ...state.labels,
          [id]: { ...previousLabel, ...input, updatedAt: new Date().toISOString() },
        },
      }));
    }

    try {
      const label = await tauriStorage.updateLabel(id, input);
      set((state) => ({
        labels: { ...state.labels, [label.id]: label },
      }));
    } catch (error) {
      if (previousLabel) {
        set((state) => ({
          labels: { ...state.labels, [id]: previousLabel },
        }));
      }
      set({ error: String(error) });
    }
  },

  deleteLabel: async (id: string) => {
    const previousLabels = get().labels;
    const previousCardLabels = get().cardLabels;

    set((state) => {
      const newLabels = { ...state.labels };
      delete newLabels[id];

      // Remove from all card-label mappings
      const newCardLabels = { ...state.cardLabels };
      for (const cardId of Object.keys(newCardLabels)) {
        newCardLabels[cardId] = newCardLabels[cardId].filter((lid) => lid !== id);
      }

      return { labels: newLabels, cardLabels: newCardLabels };
    });

    try {
      await tauriStorage.deleteLabel(id);
    } catch (error) {
      set({ labels: previousLabels, cardLabels: previousCardLabels, error: String(error) });
    }
  },

  addLabelToCard: async (cardId: string, labelId: string) => {
    set((state) => {
      const current = state.cardLabels[cardId] || [];
      if (current.includes(labelId)) return state;
      return {
        cardLabels: { ...state.cardLabels, [cardId]: [...current, labelId] },
      };
    });

    try {
      await tauriStorage.addLabelToCard(cardId, labelId);
    } catch (error) {
      set({ error: String(error) });
    }
  },

  removeLabelFromCard: async (cardId: string, labelId: string) => {
    const previous = get().cardLabels[cardId] || [];

    set((state) => ({
      cardLabels: {
        ...state.cardLabels,
        [cardId]: (state.cardLabels[cardId] || []).filter((id) => id !== labelId),
      },
    }));

    try {
      await tauriStorage.removeLabelFromCard(cardId, labelId);
    } catch (error) {
      set((state) => ({
        cardLabels: { ...state.cardLabels, [cardId]: previous },
        error: String(error),
      }));
    }
  },

  // Checklist actions
  createChecklist: async (input: CreateChecklistInput) => {
    try {
      const checklist = await tauriStorage.createChecklist(input);
      set((state) => ({
        checklists: { ...state.checklists, [checklist.id]: checklist },
      }));
      return checklist;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateChecklist: async (id: string, input: UpdateChecklistInput) => {
    const previous = get().checklists[id];
    if (previous) {
      set((state) => ({
        checklists: {
          ...state.checklists,
          [id]: { ...previous, ...input, updatedAt: new Date().toISOString() },
        },
      }));
    }

    try {
      const checklist = await tauriStorage.updateChecklist(id, input);
      set((state) => ({
        checklists: { ...state.checklists, [checklist.id]: checklist },
      }));
    } catch (error) {
      if (previous) {
        set((state) => ({
          checklists: { ...state.checklists, [id]: previous },
        }));
      }
      set({ error: String(error) });
    }
  },

  deleteChecklist: async (id: string) => {
    const previousChecklists = get().checklists;
    const previousItems = get().checklistItems;

    set((state) => {
      const newChecklists = { ...state.checklists };
      delete newChecklists[id];

      const newItems = { ...state.checklistItems };
      Object.values(state.checklistItems)
        .filter((ci) => ci.checklistId === id)
        .forEach((ci) => delete newItems[ci.id]);

      return { checklists: newChecklists, checklistItems: newItems };
    });

    try {
      await tauriStorage.deleteChecklist(id);
    } catch (error) {
      set({ checklists: previousChecklists, checklistItems: previousItems, error: String(error) });
    }
  },

  createChecklistItem: async (input: CreateChecklistItemInput) => {
    try {
      const item = await tauriStorage.createChecklistItem(input);
      set((state) => ({
        checklistItems: { ...state.checklistItems, [item.id]: item },
      }));
      return item;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateChecklistItem: async (id: string, input: UpdateChecklistItemInput) => {
    const previous = get().checklistItems[id];
    if (previous) {
      set((state) => ({
        checklistItems: {
          ...state.checklistItems,
          [id]: { ...previous, ...input, updatedAt: new Date().toISOString() },
        },
      }));
    }

    try {
      const item = await tauriStorage.updateChecklistItem(id, input);
      set((state) => ({
        checklistItems: { ...state.checklistItems, [item.id]: item },
      }));
    } catch (error) {
      if (previous) {
        set((state) => ({
          checklistItems: { ...state.checklistItems, [id]: previous },
        }));
      }
      set({ error: String(error) });
    }
  },

  deleteChecklistItem: async (id: string) => {
    const previous = get().checklistItems;

    set((state) => {
      const newItems = { ...state.checklistItems };
      delete newItems[id];
      return { checklistItems: newItems };
    });

    try {
      await tauriStorage.deleteChecklistItem(id);
    } catch (error) {
      set({ checklistItems: previous, error: String(error) });
    }
  },

  toggleChecklistItem: async (id: string) => {
    const item = get().checklistItems[id];
    if (!item) return;
    await get().updateChecklistItem(id, { checked: !item.checked });
  },

  // Import
  importBoard: async (jsonData: string) => {
    try {
      const board = await tauriStorage.importBoardJson(jsonData);
      set((state) => ({
        boards: { ...state.boards, [board.id]: board },
      }));
      await get().loadBoard(board.id);
      return board;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  importTrelloBoard: async (jsonData: string, boardName?: string) => {
    try {
      const board = await tauriStorage.importTrelloJson(jsonData, boardName);
      set((state) => ({
        boards: { ...state.boards, [board.id]: board },
      }));
      await get().loadBoard(board.id);
      return board;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  // Utility
  clearError: () => set({ error: null }),
}));
