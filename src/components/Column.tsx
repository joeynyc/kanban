import { useState, useMemo, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useKanbanStore } from '../store';
import { SortableCard } from './SortableCard';
import { NewCardInput } from './NewCardInput';
import { ConfirmDialog } from './ui/ConfirmDialog';
import type { Column as ColumnType, Card as CardType } from '../types';

interface ColumnProps {
  column: ColumnType;
  cards: CardType[];
  onCardClick: (card: CardType) => void;
}

export const Column = memo(function Column({ column, cards, onCardClick }: ColumnProps) {
  const { updateColumn, deleteColumn } = useKanbanStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleStartEdit = () => {
    setEditName(column.name);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editName.trim() && editName.trim() !== column.name) {
      await updateColumn(column.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await deleteColumn(column.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div ref={setSortableRef} style={style} className="column">
      <div className="column-header" {...attributes} {...listeners}>
        {isEditing ? (
          <input
            type="text"
            className="column-title-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="column-title" onDoubleClick={handleStartEdit}>
            {column.name}
          </span>
        )}
        <span className="column-count">{cards.length}</span>
        <button
          className="column-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          title="Delete column"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      <div ref={setDroppableRef} className="column-cards">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card, index) => (
            <SortableCard
              key={card.id}
              card={card}
              index={index}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
      </div>

      <div className="column-footer">
        {isAddingCard ? (
          <NewCardInput
            columnId={column.id}
            onCancel={() => setIsAddingCard(false)}
            onSuccess={() => setIsAddingCard(false)}
          />
        ) : (
          <button className="add-card-btn" onClick={() => setIsAddingCard(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add a card</span>
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Column"
          message={
            cards.length > 0
              ? `Are you sure you want to delete "${column.name}"? This will also delete ${cards.length} card${cards.length === 1 ? '' : 's'}.`
              : `Are you sure you want to delete "${column.name}"?`
          }
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
});
