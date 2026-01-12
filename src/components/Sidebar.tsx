import { useState } from 'react';
import { useKanbanStore } from '../store';

export function Sidebar() {
  const { boards, activeBoardId, setActiveBoard, createBoard } = useKanbanStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const sortedBoards = Object.values(boards).sort((a, b) => {
    if (!a.lastOpenedAt) return 1;
    if (!b.lastOpenedAt) return -1;
    return new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime();
  });

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;

    try {
      const board = await createBoard({ name: newBoardName.trim() });
      setActiveBoard(board.id);
      setNewBoardName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateBoard();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewBoardName('');
    }
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Kanban</h1>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Your Boards</span>
            </div>

            <div className="board-list">
              {sortedBoards.map((board) => (
                <button
                  key={board.id}
                  className={`board-item ${activeBoardId === board.id ? 'active' : ''}`}
                  onClick={() => setActiveBoard(board.id)}
                >
                  <svg className="board-item-icon" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <span className="board-item-name">{board.name}</span>
                </button>
              ))}
            </div>

            {isCreating ? (
              <div style={{ padding: '8px 12px' }}>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (!newBoardName.trim()) {
                      setIsCreating(false);
                    }
                  }}
                  placeholder="Board name..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color-focus)',
                    background: 'var(--bg-secondary)',
                  }}
                />
              </div>
            ) : (
              <button className="add-board-btn" onClick={() => setIsCreating(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Create new board</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
