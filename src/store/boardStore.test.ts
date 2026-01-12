import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useKanbanStore } from './boardStore';
import { invoke } from '@tauri-apps/api/core';
import { createMockBoard, createMockColumn, createMockCard } from '../test/mockTauri';

vi.mock('@tauri-apps/api/core');

describe('boardStore', () => {
  beforeEach(() => {
    // Reset store state
    useKanbanStore.setState({
      boards: {},
      columns: {},
      cards: {},
      activeBoardId: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('loadBoards', () => {
    it('should load all boards successfully', async () => {
      const mockBoards = [createMockBoard(), createMockBoard({ id: 'board-2', name: 'Board 2' })];
      vi.mocked(invoke).mockResolvedValue(mockBoards);

      await useKanbanStore.getState().loadBoards();

      expect(invoke).toHaveBeenCalledWith('get_all_boards');
      const state = useKanbanStore.getState();
      expect(state.boards['board-1']).toBeDefined();
      expect(state.boards['board-2']).toBeDefined();
      expect(state.isLoading).toBe(false);
    });

    it('should handle load error', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Database error'));

      await useKanbanStore.getState().loadBoards();

      expect(useKanbanStore.getState().error).toBeTruthy();
      expect(useKanbanStore.getState().isLoading).toBe(false);
    });

    it('should set loading state during load', async () => {
      vi.mocked(invoke).mockImplementation(
        () => new Promise(resolve => {
          expect(useKanbanStore.getState().isLoading).toBe(true);
          resolve([]);
        })
      );

      await useKanbanStore.getState().loadBoards();
      expect(useKanbanStore.getState().isLoading).toBe(false);
    });
  });

  describe('createBoard', () => {
    it('should create board with default columns', async () => {
      const newBoard = createMockBoard({ id: 'new-board', name: 'New Board' });
      const col1 = createMockColumn({ id: 'col-1', boardId: 'new-board', name: 'To Do', order: 1 });
      const col2 = createMockColumn({ id: 'col-2', boardId: 'new-board', name: 'Doing', order: 2 });
      const col3 = createMockColumn({ id: 'col-3', boardId: 'new-board', name: 'Done', order: 3 });

      vi.mocked(invoke)
        .mockResolvedValueOnce(newBoard)
        .mockResolvedValueOnce(col1)
        .mockResolvedValueOnce(col2)
        .mockResolvedValueOnce(col3);

      await useKanbanStore.getState().createBoard({ name: 'New Board' });

      const state = useKanbanStore.getState();
      expect(state.boards['new-board']).toBeDefined();
      expect(state.columns['col-1']).toBeDefined();
      expect(state.columns['col-2']).toBeDefined();
      expect(state.columns['col-3']).toBeDefined();
    });
  });

  describe('createCard', () => {
    it('should create card and update store', async () => {
      const newCard = createMockCard({ id: 'new-card', title: 'New Task' });
      vi.mocked(invoke).mockResolvedValue(newCard);

      const result = await useKanbanStore.getState().createCard({
        columnId: 'col-1',
        title: 'New Task',
      });

      expect(invoke).toHaveBeenCalledWith('create_card', expect.any(Object));
      expect(result).toEqual(newCard);
      expect(useKanbanStore.getState().cards['new-card']).toEqual(newCard);
    });
  });

  describe('updateCard - Optimistic Updates ⭐', () => {
    it('should optimistically update and persist on success', async () => {
      const existingCard = createMockCard({ title: 'Original Title' });
      useKanbanStore.setState({ cards: { [existingCard.id]: existingCard } });

      const updatedCard = { ...existingCard, title: 'Updated Title' };
      vi.mocked(invoke).mockResolvedValue(updatedCard);

      await useKanbanStore.getState().updateCard(existingCard.id, { title: 'Updated Title' });

      // Verify optimistic update happened
      expect(useKanbanStore.getState().cards[existingCard.id].title).toBe('Updated Title');
    });

    it('should rollback on failure', async () => {
      const existingCard = createMockCard({ title: 'Original Title' });
      useKanbanStore.setState({ cards: { [existingCard.id]: existingCard } });

      vi.mocked(invoke).mockRejectedValue(new Error('Network error'));

      await useKanbanStore.getState().updateCard(existingCard.id, { title: 'Updated Title' });

      // Verify rollback occurred
      expect(useKanbanStore.getState().cards[existingCard.id].title).toBe('Original Title');
      expect(useKanbanStore.getState().error).toBeTruthy();
    });

    it('should handle description updates', async () => {
      const card = createMockCard({ description: null });
      useKanbanStore.setState({ cards: { [card.id]: card } });

      const updated = { ...card, description: 'New description' };
      vi.mocked(invoke).mockResolvedValue(updated);

      await useKanbanStore.getState().updateCard(card.id, { description: 'New description' });

      expect(useKanbanStore.getState().cards[card.id].description).toBe('New description');
    });
  });

  describe('deleteCard', () => {
    it('should delete card optimistically', async () => {
      const card = createMockCard();
      useKanbanStore.setState({ cards: { [card.id]: card } });

      vi.mocked(invoke).mockResolvedValue(undefined);

      await useKanbanStore.getState().deleteCard(card.id);

      expect(useKanbanStore.getState().cards[card.id]).toBeUndefined();
    });

    it('should rollback on delete failure', async () => {
      const card = createMockCard();
      useKanbanStore.setState({ cards: { [card.id]: card } });

      vi.mocked(invoke).mockRejectedValue(new Error('Delete failed'));

      await useKanbanStore.getState().deleteCard(card.id);

      expect(useKanbanStore.getState().cards[card.id]).toBeDefined();
      expect(useKanbanStore.getState().error).toBeTruthy();
    });
  });

  describe('moveCard', () => {
    it('should move card to different column', async () => {
      const col1 = createMockColumn({ id: 'col-1' });
      const col2 = createMockColumn({ id: 'col-2' });
      const card = createMockCard({ columnId: col1.id });

      useKanbanStore.setState({
        columns: { [col1.id]: col1, [col2.id]: col2 },
        cards: { [card.id]: card },
      });

      const movedCard = { ...card, columnId: col2.id, order: 1.0 };
      vi.mocked(invoke).mockResolvedValue(movedCard);

      await useKanbanStore.getState().moveCard(card.id, col2.id, 0);

      const updated = useKanbanStore.getState().cards[card.id];
      expect(updated.columnId).toBe(col2.id);
    });

    it('should handle move within same column', async () => {
      const card1 = createMockCard({ id: 'card-1', order: 1.0 });
      const card2 = createMockCard({ id: 'card-2', order: 2.0 });

      useKanbanStore.setState({
        cards: { [card1.id]: card1, [card2.id]: card2 },
      });

      const movedCard = { ...card1, order: 1.5 };
      vi.mocked(invoke).mockResolvedValue(movedCard);

      await useKanbanStore.getState().moveCard(card1.id, card1.columnId, 1);

      expect(useKanbanStore.getState().cards[card1.id].order).toBe(1.5);
    });

    it('should rollback move on failure', async () => {
      const card = createMockCard({ columnId: 'col-1', order: 1.0 });
      useKanbanStore.setState({ cards: { [card.id]: card } });

      vi.mocked(invoke).mockRejectedValue(new Error('Move failed'));

      await useKanbanStore.getState().moveCard(card.id, 'col-2', 0);

      const current = useKanbanStore.getState().cards[card.id];
      expect(current.columnId).toBe('col-1');
      expect(current.order).toBe(1.0);
    });
  });

  describe('deleteBoard - Cascade Delete', () => {
    it('should delete board with all columns and cards', async () => {
      const board = createMockBoard();
      const col1 = createMockColumn({ id: 'col-1', boardId: board.id });
      const col2 = createMockColumn({ id: 'col-2', boardId: board.id });
      const card1 = createMockCard({ id: 'card-1', columnId: 'col-1' });
      const card2 = createMockCard({ id: 'card-2', columnId: 'col-2' });

      useKanbanStore.setState({
        boards: { [board.id]: board },
        columns: { [col1.id]: col1, [col2.id]: col2 },
        cards: { [card1.id]: card1, [card2.id]: card2 },
      });

      vi.mocked(invoke).mockResolvedValue(undefined);

      await useKanbanStore.getState().deleteBoard(board.id);

      const state = useKanbanStore.getState();
      expect(state.boards[board.id]).toBeUndefined();
      expect(state.columns[col1.id]).toBeUndefined();
      expect(state.columns[col2.id]).toBeUndefined();
      expect(state.cards[card1.id]).toBeUndefined();
      expect(state.cards[card2.id]).toBeUndefined();
    });

    it('should clear active board if deleted', async () => {
      const board = createMockBoard();
      useKanbanStore.setState({
        boards: { [board.id]: board },
        activeBoardId: board.id,
      });

      vi.mocked(invoke).mockResolvedValue(undefined);

      await useKanbanStore.getState().deleteBoard(board.id);

      expect(useKanbanStore.getState().activeBoardId).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('getColumnsForActiveBoard should return sorted columns', () => {
      const board = createMockBoard();
      const col1 = createMockColumn({ id: 'col-1', order: 2.0 });
      const col2 = createMockColumn({ id: 'col-2', order: 1.0 });
      const col3 = createMockColumn({ id: 'col-3', order: 3.0 });

      useKanbanStore.setState({
        boards: { [board.id]: board },
        columns: { [col1.id]: col1, [col2.id]: col2, [col3.id]: col3 },
        activeBoardId: board.id,
      });

      const columns = useKanbanStore.getState().getColumnsForActiveBoard();
      expect(columns.map(c => c.id)).toEqual(['col-2', 'col-1', 'col-3']);
    });

    it('getCardsForColumn should return sorted cards', () => {
      const col = createMockColumn();
      const card1 = createMockCard({ id: 'card-1', columnId: col.id, order: 2.0 });
      const card2 = createMockCard({ id: 'card-2', columnId: col.id, order: 1.0 });

      useKanbanStore.setState({
        columns: { [col.id]: col },
        cards: { [card1.id]: card1, [card2.id]: card2 },
      });

      const cards = useKanbanStore.getState().getCardsForColumn(col.id);
      expect(cards.map(c => c.id)).toEqual(['card-2', 'card-1']);
    });

    it('getColumnViews should return columns with cards', () => {
      const board = createMockBoard();
      const col1 = createMockColumn({ id: 'col-1', boardId: board.id });
      const col2 = createMockColumn({ id: 'col-2', boardId: board.id });
      const card1 = createMockCard({ id: 'card-1', columnId: col1.id });
      const card2 = createMockCard({ id: 'card-2', columnId: col1.id });

      useKanbanStore.setState({
        boards: { [board.id]: board },
        columns: { [col1.id]: col1, [col2.id]: col2 },
        cards: { [card1.id]: card1, [card2.id]: card2 },
        activeBoardId: board.id,
      });

      const views = useKanbanStore.getState().getColumnViews();
      expect(views).toHaveLength(2);
      expect(views[0].column.id).toBe('col-1');
      expect(views[0].cards).toHaveLength(2);
      expect(views[1].column.id).toBe('col-2');
      expect(views[1].cards).toHaveLength(0);
    });
  });
});
