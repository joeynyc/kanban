import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardDetail } from './CardDetail';
import { createMockCard } from '../test/mockTauri';
import { useKanbanStore } from '../store';

// Mock ConfirmDialog
vi.mock('./ui/ConfirmDialog', () => ({
  ConfirmDialog: ({ title, onConfirm, onCancel }: any) => (
    <div data-testid="confirm-dialog">
      <h3>{title}</h3>
      <button onClick={onConfirm}>Delete</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('CardDetail', () => {
  const mockUpdateCard = vi.fn();
  const mockDeleteCard = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useKanbanStore.setState({
      updateCard: mockUpdateCard,
      deleteCard: mockDeleteCard,
      cards: {},
    });
  });

  it('should render card title', () => {
    const card = createMockCard({ title: 'Test Task' });
    useKanbanStore.setState({ cards: { [card.id]: card } });

    render(<CardDetail card={card} onClose={mockOnClose} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render card description', () => {
    const card = createMockCard({ description: 'Test description' });
    useKanbanStore.setState({ cards: { [card.id]: card } });

    render(<CardDetail card={card} onClose={mockOnClose} />);

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should show placeholder when no description', () => {
    const card = createMockCard({ description: null });
    useKanbanStore.setState({ cards: { [card.id]: card } });

    render(<CardDetail card={card} onClose={mockOnClose} />);

    expect(screen.getByText('Click to add a description...')).toBeInTheDocument();
  });

  it('should enter edit mode for title on double-click', async () => {
    const card = createMockCard({ title: 'Original Title' });
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const title = screen.getByText('Original Title');
    await user.dblClick(title);

    expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
  });

  it('should save title on Enter', async () => {
    const card = createMockCard({ title: 'Original Title' });
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const title = screen.getByText('Original Title');
    await user.dblClick(title);

    const input = screen.getByDisplayValue('Original Title') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'New Title');
    await user.keyboard('{Enter}');

    expect(mockUpdateCard).toHaveBeenCalledWith(card.id, { title: 'New Title' });
  });

  it('should cancel title edit on Escape', async () => {
    const card = createMockCard({ title: 'Original Title' });
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const title = screen.getByText('Original Title');
    await user.dblClick(title);

    const input = screen.getByDisplayValue('Original Title') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'New Title');
    await user.keyboard('{Escape}');

    expect(mockUpdateCard).not.toHaveBeenCalled();
    expect(screen.getByText('Original Title')).toBeInTheDocument();
  });

  it('should save title on blur', async () => {
    const card = createMockCard({ title: 'Original Title' });
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const title = screen.getByText('Original Title');
    await user.dblClick(title);

    const input = screen.getByDisplayValue('Original Title') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'New Title');
    await user.click(document.body);

    expect(mockUpdateCard).toHaveBeenCalledWith(card.id, { title: 'New Title' });
  });

  it('should not save empty title', async () => {
    const card = createMockCard({ title: 'Original Title' });
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const title = screen.getByText('Original Title');
    await user.dblClick(title);

    const input = screen.getByDisplayValue('Original Title') as HTMLInputElement;
    await user.clear(input);
    await user.keyboard('{Enter}');

    expect(mockUpdateCard).not.toHaveBeenCalled();
  });

  it('should edit description on click', async () => {
    const card = createMockCard({ description: 'Original description' });
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const description = screen.getByText('Original description');
    await user.click(description);

    expect(screen.getByDisplayValue('Original description')).toBeInTheDocument();
  });

  it('should save description on blur', async () => {
    const card = createMockCard({ description: 'Original description' });
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const description = screen.getByText('Original description');
    await user.click(description);

    const textarea = screen.getByDisplayValue('Original description') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, 'New description');
    await user.click(document.body);

    expect(mockUpdateCard).toHaveBeenCalledWith(card.id, { description: 'New description' });
  });

  it('should close modal on close button click', async () => {
    const card = createMockCard();
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal on Escape key', async () => {
    const card = createMockCard();
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const overlay = document.querySelector('.card-detail-overlay') as HTMLElement;
    overlay.focus();
    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal on overlay click', async () => {
    const card = createMockCard();
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    const { container } = render(<CardDetail card={card} onClose={mockOnClose} />);

    const overlay = container.querySelector('.card-detail-overlay') as HTMLElement;
    await user.click(overlay);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not close modal when clicking inside card detail', async () => {
    const card = createMockCard();
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const cardDetail = screen.getByRole('dialog');
    await user.click(cardDetail);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should show delete confirmation dialog', async () => {
    const card = createMockCard();
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const deleteButton = screen.getByText('Delete Card');
    await user.click(deleteButton);

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  it('should delete card when confirmed', async () => {
    const card = createMockCard({ title: 'Card to Delete' });
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const deleteButton = screen.getByText('Delete Card');
    await user.click(deleteButton);

    const confirmButton = within(screen.getByTestId('confirm-dialog')).getByText('Delete');
    await user.click(confirmButton);

    expect(mockDeleteCard).toHaveBeenCalledWith(card.id);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should cancel delete when cancelled', async () => {
    const card = createMockCard();
    useKanbanStore.setState({ cards: { [card.id]: card } });
    const user = userEvent.setup();

    render(<CardDetail card={card} onClose={mockOnClose} />);

    const deleteButton = screen.getByText('Delete Card');
    await user.click(deleteButton);

    const cancelButton = within(screen.getByTestId('confirm-dialog')).getByText('Cancel');
    await user.click(cancelButton);

    expect(mockDeleteCard).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });
});
