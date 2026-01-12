import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useKanbanStore } from '../store';
import { Column } from './Column';
import { Card } from './Card';
import { CardDetail } from './CardDetail';
import type { Card as CardType, Column as ColumnType } from '../types';

export function BoardView() {
  const { getColumnViews, activeBoardId, createColumn, moveCard, moveColumn } = useKanbanStore();
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);

  const columnViews = getColumnViews();
  const columnIds = useMemo(() => columnViews.map((cv) => cv.column.id), [columnViews]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'card') {
      setActiveCard(activeData.card);
    } else if (activeData?.type === 'column') {
      setActiveColumn(activeData.column);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== 'card') return;

    const activeCard = activeData.card as CardType;
    const activeColumnId = activeCard.columnId;

    // Determine target column
    let overColumnId: string;
    if (overData?.type === 'card') {
      overColumnId = (overData.card as CardType).columnId;
    } else if (overData?.type === 'column') {
      overColumnId = (overData.column as ColumnType).id;
    } else {
      return;
    }

    // If moving to a different column, update immediately for visual feedback
    if (activeColumnId !== overColumnId) {
      // Find the target index in the new column
      const overColumn = columnViews.find((cv) => cv.column.id === overColumnId);
      if (!overColumn) return;

      let targetIndex = overColumn.cards.length;
      if (overData?.type === 'card') {
        const overCardIndex = overColumn.cards.findIndex((c) => c.id === over.id);
        targetIndex = overCardIndex >= 0 ? overCardIndex : overColumn.cards.length;
      }

      moveCard(activeCard.id, overColumnId, targetIndex);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCard(null);
    setActiveColumn(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'card') {
      const activeCard = activeData.card as CardType;

      // Determine target column and index
      let overColumnId: string;
      let targetIndex: number;

      if (overData?.type === 'card') {
        const overCard = overData.card as CardType;
        overColumnId = overCard.columnId;
        const overColumn = columnViews.find((cv) => cv.column.id === overColumnId);
        if (!overColumn) return;
        targetIndex = overColumn.cards.findIndex((c) => c.id === over.id);
        if (targetIndex < 0) targetIndex = overColumn.cards.length;
      } else if (overData?.type === 'column') {
        overColumnId = (overData.column as ColumnType).id;
        const overColumn = columnViews.find((cv) => cv.column.id === overColumnId);
        targetIndex = overColumn?.cards.length ?? 0;
      } else {
        return;
      }

      // Only move if position actually changed
      if (activeCard.columnId !== overColumnId || activeData.index !== targetIndex) {
        moveCard(activeCard.id, overColumnId, targetIndex);
      }
    } else if (activeData?.type === 'column') {
      if (active.id !== over.id) {
        const oldIndex = columnViews.findIndex((cv) => cv.column.id === active.id);
        const newIndex = columnViews.findIndex((cv) => cv.column.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          moveColumn(active.id as string, newIndex);
        }
      }
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !activeBoardId) return;

    try {
      await createColumn({
        boardId: activeBoardId,
        name: newColumnName.trim(),
      });
      setNewColumnName('');
      setIsAddingColumn(false);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddColumn();
    } else if (e.key === 'Escape') {
      setIsAddingColumn(false);
      setNewColumnName('');
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board-view">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columnViews.map(({ column, cards }) => (
              <Column
                key={column.id}
                column={column}
                cards={cards}
                onCardClick={setSelectedCard}
              />
            ))}
          </SortableContext>

          {isAddingColumn ? (
            <div className="column" style={{ padding: '12px' }}>
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newColumnName.trim()) {
                    setIsAddingColumn(false);
                  }
                }}
                placeholder="Column name..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              />
            </div>
          ) : (
            <button className="add-column-btn" onClick={() => setIsAddingColumn(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add column</span>
            </button>
          )}
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="card dragging">
              <Card card={activeCard} onClick={() => {}} />
            </div>
          )}
          {activeColumn && (
            <div className="column dragging" style={{ opacity: 0.8 }}>
              <div className="column-header">
                <span className="column-title">{activeColumn.name}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <CardDetail card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </>
  );
}
