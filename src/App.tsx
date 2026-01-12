import { useEffect } from 'react';
import { useKanbanStore, useHistoryStore } from './store';
import { Sidebar } from './components/Sidebar';
import { BoardView } from './components/BoardView';
import { Header } from './components/Header';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { BoardSkeleton } from './components/ui/Skeleton';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import './App.css';

function App() {
  const { loadBoards, boards, activeBoardId, setActiveBoard, isLoading } = useKanbanStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  // Auto-select first board if none selected
  useEffect(() => {
    if (!activeBoardId && Object.keys(boards).length > 0) {
      const sortedBoards = Object.values(boards).sort((a, b) => {
        if (!a.lastOpenedAt) return 1;
        if (!b.lastOpenedAt) return -1;
        return new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime();
      });
      if (sortedBoards[0]) {
        setActiveBoard(sortedBoards[0].id);
      }
    }
  }, [boards, activeBoardId, setActiveBoard]);

  const handleUndo = () => {
    if (canUndo()) {
      const action = undo();
      if (action) {
        showToast(`Undid: ${action.description}`);
      }
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      const action = redo();
      if (action) {
        showToast(`Redid: ${action.description}`);
      }
    }
  };

  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  return (
    <ErrorBoundary>
      <div className="app">
        <Sidebar />
        <main className="app-main">
          <Header />
          <div className="app-content">
            {isLoading ? (
              <BoardSkeleton />
            ) : activeBoardId ? (
              <BoardView />
            ) : (
              <div className="empty-state">
                <p>Select a board or create a new one to get started</p>
              </div>
            )}
          </div>
        </main>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
