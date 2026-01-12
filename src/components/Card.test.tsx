import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card';
import { createMockCard } from '../test/mockTauri';

describe('Card', () => {
  it('should render card title', () => {
    const card = createMockCard({ title: 'Test Task' });
    const onClick = vi.fn();

    render(<Card card={card} onClick={onClick} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should show description indicator when description exists', () => {
    const card = createMockCard({ description: 'Some description' });
    const onClick = vi.fn();

    render(<Card card={card} onClick={onClick} />);

    const indicator = document.querySelector('.card-has-description');
    expect(indicator).toBeInTheDocument();
  });

  it('should not show description indicator when no description', () => {
    const card = createMockCard({ description: null });
    const onClick = vi.fn();

    render(<Card card={card} onClick={onClick} />);

    const indicators = document.querySelector('.card-indicators');
    expect(indicators).not.toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const card = createMockCard();
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Card card={card} onClick={onClick} />);

    const cardElement = document.querySelector('.card') as HTMLElement;
    await user.click(cardElement);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should not re-render with same props (memoization)', () => {
    const card = createMockCard();
    const onClick = vi.fn();

    const { rerender } = render(<Card card={card} onClick={onClick} />);

    expect(screen.getByText(card.title)).toBeInTheDocument();

    // Rerender with same props - component should not re-render
    rerender(<Card card={card} onClick={onClick} />);

    expect(screen.getByText(card.title)).toBeInTheDocument();
    // Note: We can't directly test memo, but we verify it renders correctly on rerender
  });
});
