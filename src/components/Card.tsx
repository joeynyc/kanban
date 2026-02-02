import { memo } from 'react';
import type { Card as CardType } from '../types';
import { useKanbanStore } from '../store';
import { LabelBadge } from './LabelBadge';
import { formatDueDate, isDueOverdue, isDueSoon, getPriorityColor } from '../lib/utils';

interface CardProps {
  card: CardType;
  onClick: () => void;
}

export const Card = memo(function Card({ card, onClick }: CardProps) {
  const { getLabelsForCard, getChecklistProgress } = useKanbanStore();
  const labels = getLabelsForCard(card.id);
  const progress = getChecklistProgress(card.id);
  const priorityColor = getPriorityColor(card.priority);

  return (
    <div
      className="card"
      onClick={onClick}
      style={card.priority !== 'none' ? { borderLeftColor: priorityColor, borderLeftWidth: 3 } : undefined}
    >
      {labels.length > 0 && (
        <div className="card-labels">
          {labels.map((label) => (
            <LabelBadge key={label.id} label={label} size="sm" />
          ))}
        </div>
      )}
      <div className="card-title">{card.title}</div>
      <div className="card-indicators">
        {card.description && (
          <span className="card-has-description">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </span>
        )}
        {card.dueDate && (
          <span className={`card-due-date ${isDueOverdue(card.dueDate) ? 'overdue' : ''} ${isDueSoon(card.dueDate) ? 'due-soon' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDueDate(card.dueDate)}
          </span>
        )}
        {progress && (
          <span className={`card-checklist-count ${progress.checked === progress.total ? 'complete' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            {progress.checked}/{progress.total}
          </span>
        )}
      </div>
    </div>
  );
});
