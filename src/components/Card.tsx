import { memo } from 'react';
import type { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
  onClick: () => void;
}

export const Card = memo(function Card({ card, onClick }: CardProps) {
  return (
    <div className="card" onClick={onClick}>
      <div className="card-title">{card.title}</div>
      {card.description && (
        <div className="card-indicators">
          <span className="card-has-description">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
});
