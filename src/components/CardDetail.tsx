import { useState, useEffect } from 'react';
import { useKanbanStore } from '../store';
import { ConfirmDialog } from './ui/ConfirmDialog';
import type { Card } from '../types';

interface CardDetailProps {
  card: Card;
  onClose: () => void;
}

export function CardDetail({ card, onClose }: CardDetailProps) {
  const { updateCard, deleteCard, cards } = useKanbanStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get the latest card data from store
  const currentCard = cards[card.id] || card;

  useEffect(() => {
    setEditTitle(currentCard.title);
    setEditDescription(currentCard.description || '');
  }, [currentCard.title, currentCard.description]);

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle.trim() !== currentCard.title) {
      await updateCard(currentCard.id, { title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (editDescription !== (currentCard.description || '')) {
      await updateCard(currentCard.id, { description: editDescription || undefined });
    }
    setIsEditingDescription(false);
  };

  const handleDelete = async () => {
    await deleteCard(currentCard.id);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="card-detail-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="card-detail" role="dialog" aria-modal="true">
        <div className="card-detail-header">
          {isEditingTitle ? (
            <input
              type="text"
              className="card-detail-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
            />
          ) : (
            <h3 className="card-detail-title" onDoubleClick={() => setIsEditingTitle(true)}>
              {currentCard.title}
            </h3>
          )}
          <button className="card-detail-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="card-detail-body">
          <div className="card-detail-section">
            <div className="card-detail-label">Description</div>
            {isEditingDescription ? (
              <textarea
                className="card-detail-textarea"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={handleSaveDescription}
                placeholder="Add a description..."
                autoFocus
              />
            ) : (
              <div
                className={`card-detail-description ${!currentCard.description ? 'empty' : ''}`}
                onClick={() => setIsEditingDescription(true)}
              >
                {currentCard.description || 'Click to add a description...'}
              </div>
            )}
          </div>
        </div>

        <div className="card-detail-footer">
          <button
            className="card-detail-btn danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Card
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Card"
          message={`Are you sure you want to delete "${currentCard.title}"?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
