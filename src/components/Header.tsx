import { useState } from 'react';
import { useKanbanStore } from '../store';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { LabelManager } from './LabelManager';
import { ImportExportMenu } from './ImportExportMenu';

export function Header() {
  const { getActiveBoard, updateBoard, deleteBoard, boards, setActiveBoard } = useKanbanStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);

  const board = getActiveBoard();

  if (!board) {
    return (
      <header className="app-header">
        <div className="header">
          <h2 className="header-title">No board selected</h2>
          <div className="header-actions">
            <ImportExportMenu />
          </div>
        </div>
      </header>
    );
  }

  const handleStartEdit = () => {
    setEditName(board.name);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editName.trim() && editName.trim() !== board.name) {
      await updateBoard(board.id, { name: editName.trim() });
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
    const boardIds = Object.keys(boards);
    const currentIndex = boardIds.indexOf(board.id);

    await deleteBoard(board.id);

    // Switch to another board if available
    const remainingBoards = boardIds.filter((id) => id !== board.id);
    if (remainingBoards.length > 0) {
      const nextIndex = Math.min(currentIndex, remainingBoards.length - 1);
      setActiveBoard(remainingBoards[nextIndex]);
    }

    setShowDeleteConfirm(false);
  };

  return (
    <header className="app-header">
      <div className="header">
        {isEditing ? (
          <input
            type="text"
            className="header-title-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <h2 className="header-title" onDoubleClick={handleStartEdit}>
            {board.name}
          </h2>
        )}

        <div className="header-actions">
          <button className="header-btn" onClick={() => setShowLabelManager(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Labels
          </button>
          <ImportExportMenu />
          <button className="header-btn danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete Board
          </button>
        </div>
      </div>

      {showLabelManager && (
        <LabelManager onClose={() => setShowLabelManager(false)} />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Board"
          message={`Are you sure you want to delete "${board.name}"? This will permanently delete all columns and cards in this board.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </header>
  );
}
