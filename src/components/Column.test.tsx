import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Column } from './Column';
import { createMockColumn, createMockCard } from '../test/mockTauri';
import { useKanbanStore } from '../store';

// Mock child components
vi.mock('./SortableCard', () => ({
  SortableCard: ({ card, onClick }: any) => (
    <div data-testid={`sortable-card-${card.id}`} onClick={onClick}>
      {card.title}
    </div>
  ),
}));

vi.mock('./NewCardInput', () => ({
  NewCardInput: ({ columnId, onCancel, onSuccess }: any) => (
    <div data-testid={`new-card-input-${columnId}`}>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onSuccess}>Save</button>
    </div>
  ),
}));

vi.mock('./ui/ConfirmDialog', () => ({
  ConfirmDialog: ({ title, onConfirm, onCancel }: any) => (
    <div data-testid="confirm-dialog">
      <h3>{title}</h3>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('Column', () => {
  const mockUpdateColumn = vi.fn();
  const mockDeleteColumn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useKanbanStore.setState({
      updateColumn: mockUpdateColumn,
      deleteColumn: mockDeleteColumn,
    });
  });

  it('should render column name', () => {
    const column = createMockColumn({ name: 'To Do' });
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('should render card count', () => {
    const column = createMockColumn();
    const cards = [createMockCard(), createMockCard(), createMockCard()];
    const onCardClick = vi.fn();

    render(<Column column={column} cards={cards} onCardClick={onCardClick} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render all cards', () => {
    const column = createMockColumn();
    const card1 = createMockCard({ id: 'card-1', title: 'Task 1' });
    const card2 = createMockCard({ id: 'card-2', title: 'Task 2' });
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[card1, card2]} onCardClick={onCardClick} />);

    expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('sortable-card-card-2')).toBeInTheDocument();
  });

  it('should enter edit mode on double-click', async () => {
    const column = createMockColumn({ name: 'Original Name' });
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const titleSpan = screen.getByText('Original Name');
    await user.dblClick(titleSpan);

    const input = screen.getByDisplayValue('Original Name') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('should save on Enter key', async () => {
    const column = createMockColumn({ name: 'Original Name' });
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const titleSpan = screen.getByText('Original Name');
    await user.dblClick(titleSpan);

    const input = screen.getByDisplayValue('Original Name') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.keyboard('{Enter}');

    expect(mockUpdateColumn).toHaveBeenCalledWith(column.id, { name: 'New Name' });
  });

  it('should cancel edit on Escape key', async () => {
    const column = createMockColumn({ name: 'Original Name' });
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const titleSpan = screen.getByText('Original Name');
    await user.dblClick(titleSpan);

    const input = screen.getByDisplayValue('Original Name') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.keyboard('{Escape}');

    expect(mockUpdateColumn).not.toHaveBeenCalled();
    expect(screen.getByText('Original Name')).toBeInTheDocument();
  });

  it('should save on blur', async () => {
    const column = createMockColumn({ name: 'Original Name' });
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const titleSpan = screen.getByText('Original Name');
    await user.dblClick(titleSpan);

    const input = screen.getByDisplayValue('Original Name') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.click(document.body);

    expect(mockUpdateColumn).toHaveBeenCalledWith(column.id, { name: 'New Name' });
  });

  it('should not save if name is empty', async () => {
    const column = createMockColumn({ name: 'Original Name' });
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const titleSpan = screen.getByText('Original Name');
    await user.dblClick(titleSpan);

    const input = screen.getByDisplayValue('Original Name') as HTMLInputElement;
    await user.clear(input);
    await user.keyboard('{Enter}');

    expect(mockUpdateColumn).not.toHaveBeenCalled();
  });

  it('should show delete confirmation dialog when delete button clicked', async () => {
    const column = createMockColumn();
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const deleteButton = screen.getByTitle('Delete column');
    await user.click(deleteButton);

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  it('should delete column when confirmed', async () => {
    const column = createMockColumn();
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const deleteButton = screen.getByTitle('Delete column');
    await user.click(deleteButton);

    const confirmButton = within(screen.getByTestId('confirm-dialog')).getByText('Confirm');
    await user.click(confirmButton);

    expect(mockDeleteColumn).toHaveBeenCalledWith(column.id);
  });

  it('should cancel delete when cancelled', async () => {
    const column = createMockColumn();
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const deleteButton = screen.getByTitle('Delete column');
    await user.click(deleteButton);

    const cancelButton = within(screen.getByTestId('confirm-dialog')).getByText('Cancel');
    await user.click(cancelButton);

    expect(mockDeleteColumn).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  it('should toggle add card input', async () => {
    const column = createMockColumn();
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const addButton = screen.getByText('Add a card');
    await user.click(addButton);

    expect(screen.getByTestId(`new-card-input-${column.id}`)).toBeInTheDocument();
  });

  it('should close add card input on success', async () => {
    const column = createMockColumn();
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const addButton = screen.getByText('Add a card');
    await user.click(addButton);

    const saveButton = within(screen.getByTestId(`new-card-input-${column.id}`)).getByText('Save');
    await user.click(saveButton);

    expect(screen.queryByTestId(`new-card-input-${column.id}`)).not.toBeInTheDocument();
  });

  it('should close add card input on cancel', async () => {
    const column = createMockColumn();
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(<Column column={column} cards={[]} onCardClick={onCardClick} />);

    const addButton = screen.getByText('Add a card');
    await user.click(addButton);

    const cancelButton = within(screen.getByTestId(`new-card-input-${column.id}`)).getByText('Cancel');
    await user.click(cancelButton);

    expect(screen.queryByTestId(`new-card-input-${column.id}`)).not.toBeInTheDocument();
  });

  it('should call onCardClick when card is clicked', async () => {
    const column = createMockColumn();
    const card = createMockCard({ id: 'card-1', title: 'Task' });
    const onCardClick = vi.fn();
    const user = userEvent.setup();

    render(<Column column={column} cards={[card]} onCardClick={onCardClick} />);

    const cardElement = screen.getByTestId('sortable-card-card-1');
    await user.click(cardElement);

    expect(onCardClick).toHaveBeenCalledWith(card);
  });
});
