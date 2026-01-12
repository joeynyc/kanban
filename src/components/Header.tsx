import { useState } from 'react';
import { useKanbanStore } from '../store';
import { ConfirmDialog } from './ui/ConfirmDialog';

export function Header() {
  const { getActiveBoard, updateBoard, deleteBoard, boards, setActiveBoard } = useKanbanStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const board = getActiveBoard();

  if (!board) {
    return (
      <header className="app-header">
        <div className="header">
          <h2 className="header-title">No board selected</h2>
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
          <button className="header-btn danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete Board
          </button>
        </div>
      </div>

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
