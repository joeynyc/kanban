import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onNewCard?: () => void;
  onEditCard?: () => void;
  onDeleteCard?: () => void;
  onOpenCard?: () => void;
  onCloseModal?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const {
    onNewCard,
    onEditCard,
    onDeleteCard,
    onOpenCard,
    onCloseModal,
    onUndo,
    onRedo,
    onSearch,
  } = handlers;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Always allow Escape
      if (e.key === 'Escape') {
        onCloseModal?.();
        return;
      }

      // Allow undo/redo even when typing (Ctrl/Cmd + Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
        return;
      }

      // Skip other shortcuts if typing
      if (isTyping) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onNewCard?.();
          break;
        case 'e':
          e.preventDefault();
          onEditCard?.();
          break;
        case 'delete':
        case 'backspace':
          e.preventDefault();
          onDeleteCard?.();
          break;
        case 'enter':
          e.preventDefault();
          onOpenCard?.();
          break;
        case '/':
          e.preventDefault();
          onSearch?.();
          break;
      }
    },
    [onNewCard, onEditCard, onDeleteCard, onOpenCard, onCloseModal, onUndo, onRedo, onSearch]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
