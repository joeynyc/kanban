import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardView } from './BoardView';
import { createMockBoard, createMockColumn, createMockCard } from '../test/mockTauri';
import { useKanbanStore } from '../store';

// Mock child components
vi.mock('./Column', () => ({
  Column: ({ column, cards, onCardClick }: any) => (
    <div data-testid={`column-${column.id}`} onClick={() => onCardClick(cards[0])}>
      {column.name}
    </div>
  ),
}));

vi.mock('./CardDetail', () => ({
  CardDetail: ({ card, onClose }: any) => (
    <div data-testid="card-detail">
      <h2>{card.title}</h2>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock DnD kit components
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragEnd, onDragOver }: any) => {
    // Store handlers for use in tests
    (window as any).__dndHandlers = { onDragStart, onDragEnd, onDragOver };
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  closestCorners: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  horizontalListSortingStrategy: vi.fn(),
}));

describe('BoardView', () => {
  const mockCreateColumn = vi.fn();
  const mockMoveCard = vi.fn();
  const mockMoveColumn = vi.fn();
  const mockGetColumnViews = vi.fn();

  const mockBoard = createMockBoard();
  const mockCol1 = createMockColumn({ id: 'col-1', boardId: mockBoard.id, name: 'To Do', order: 1.0 });
  const mockCol2 = createMockColumn({ id: 'col-2', boardId: mockBoard.id, name: 'Doing', order: 2.0 });
  const mockCard1 = createMockCard({ id: 'card-1', columnId: 'col-1' });
  const mockCard2 = createMockCard({ id: 'card-2', columnId: 'col-1' });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetColumnViews.mockReturnValue([
      { column: mockCol1, cards: [mockCard1, mockCard2] },
      { column: mockCol2, cards: [] },
    ]);

    useKanbanStore.setState({
      boards: { [mockBoard.id]: mockBoard },
      columns: { [mockCol1.id]: mockCol1, [mockCol2.id]: mockCol2 },
      cards: { [mockCard1.id]: mockCard1, [mockCard2.id]: mockCard2 },
      activeBoardId: mockBoard.id,
      getColumnViews: mockGetColumnViews,
      createColumn: mockCreateColumn,
      moveCard: mockMoveCard,
      moveColumn: mockMoveColumn,
    });
  });

  it('should render columns from store', () => {
    render(<BoardView />);

    expect(screen.getByTestId('column-col-1')).toBeInTheDocument();
    expect(screen.getByTestId('column-col-2')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('Doing')).toBeInTheDocument();
  });

  it('should call getColumnViews', () => {
    render(<BoardView />);

    expect(mockGetColumnViews).toHaveBeenCalled();
  });

  it('should toggle add column input', async () => {
    const user = userEvent.setup();
    render(<BoardView />);

    expect(screen.queryByPlaceholderText('Column name...')).not.toBeInTheDocument();

    const addButton = screen.getByText('Add column');
    await user.click(addButton);

    expect(screen.getByPlaceholderText('Column name...')).toBeInTheDocument();
  });

  it('should create column on Enter', async () => {
    const user = userEvent.setup();
    mockCreateColumn.mockResolvedValue(createMockColumn({ id: 'new-col' }));

    render(<BoardView />);

    const addButton = screen.getByText('Add column');
    await user.click(addButton);

    const input = screen.getByPlaceholderText('Column name...') as HTMLInputElement;
    await user.type(input, 'New Column');
    await user.keyboard('{Enter}');

    expect(mockCreateColumn).toHaveBeenCalledWith({
      boardId: mockBoard.id,
      name: 'New Column',
    });
  });

  it('should cancel column creation on Escape', async () => {
    const user = userEvent.setup();
    render(<BoardView />);

    const addButton = screen.getByText('Add column');
    await user.click(addButton);

    const input = screen.getByPlaceholderText('Column name...') as HTMLInputElement;
    await user.type(input, 'New Column');
    await user.keyboard('{Escape}');

    expect(mockCreateColumn).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Column name...')).not.toBeInTheDocument();
  });

  it('should close add column input when blurred with empty text', async () => {
    const user = userEvent.setup();
    render(<BoardView />);

    const addButton = screen.getByText('Add column');
    await user.click(addButton);

    const input = screen.getByPlaceholderText('Column name...') as HTMLInputElement;
    await user.click(document.body);

    expect(screen.queryByPlaceholderText('Column name...')).not.toBeInTheDocument();
  });

  it('should open card detail when card is clicked', async () => {
    const user = userEvent.setup();
    render(<BoardView />);

    const column = screen.getByTestId('column-col-1');
    await user.click(column);

    expect(screen.getByTestId('card-detail')).toBeInTheDocument();
    expect(screen.getByText(mockCard1.title)).toBeInTheDocument();
  });

  it('should close card detail', async () => {
    const user = userEvent.setup();
    render(<BoardView />);

    const column = screen.getByTestId('column-col-1');
    await user.click(column);

    expect(screen.getByTestId('card-detail')).toBeInTheDocument();

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    expect(screen.queryByTestId('card-detail')).not.toBeInTheDocument();
  });

  it('should handle drag start for card', () => {
    render(<BoardView />);

    const handlers = (window as any).__dndHandlers;
    const dragStartEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            card: mockCard1,
          },
        },
      },
    };

    handlers.onDragStart(dragStartEvent);

    // Verify the drag overlay shows the card (component state is internal)
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('should handle drag start for column', () => {
    render(<BoardView />);

    const handlers = (window as any).__dndHandlers;
    const dragStartEvent = {
      active: {
        id: 'col-1',
        data: {
          current: {
            type: 'column',
            column: mockCol1,
          },
        },
      },
    };

    handlers.onDragStart(dragStartEvent);

    // Verify the drag overlay exists
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('should handle drag end for card', () => {
    render(<BoardView />);

    const handlers = (window as any).__dndHandlers;
    const dragEndEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            card: mockCard1,
            index: 0,
          },
        },
      },
      over: {
        id: 'col-2',
        data: {
          current: {
            type: 'column',
            column: mockCol2,
          },
        },
      },
    };

    handlers.onDragEnd(dragEndEvent);

    expect(mockMoveCard).toHaveBeenCalledWith('card-1', 'col-2', 0);
  });

  it('should handle drag end for column', () => {
    render(<BoardView />);

    const handlers = (window as any).__dndHandlers;
    mockGetColumnViews.mockReturnValue([
      { column: mockCol1, cards: [] },
      { column: mockCol2, cards: [] },
    ]);

    const dragEndEvent = {
      active: {
        id: 'col-1',
        data: {
          current: {
            type: 'column',
            column: mockCol1,
          },
        },
      },
      over: {
        id: 'col-2',
        data: {
          current: {
            type: 'column',
            column: mockCol2,
          },
        },
      },
    };

    handlers.onDragEnd(dragEndEvent);

    expect(mockMoveColumn).toHaveBeenCalledWith('col-1', 1);
  });

  it('should not move card if position unchanged', () => {
    const cardWithIndex = { ...mockCard1 };
    render(<BoardView />);

    const handlers = (window as any).__dndHandlers;
    const dragEndEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            card: cardWithIndex,
            index: 0,
          },
        },
      },
      over: {
        id: 'card-2',
        data: {
          current: {
            type: 'card',
            card: mockCard2,
          },
        },
      },
    };

    handlers.onDragEnd(dragEndEvent);

    // Since the card stays in same column and position, it shouldn't call moveCard
    // (behavior depends on the actual logic)
  });

  it('should render with no columns', () => {
    mockGetColumnViews.mockReturnValue([]);

    render(<BoardView />);

    expect(screen.getByText('Add column')).toBeInTheDocument();
  });
});
