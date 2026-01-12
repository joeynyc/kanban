import { useState, useRef, useEffect } from 'react';
import { useKanbanStore } from '../store';

interface NewCardInputProps {
  columnId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function NewCardInput({ columnId, onCancel, onSuccess }: NewCardInputProps) {
  const { createCard } = useKanbanStore();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createCard({
        columnId,
        title: title.trim(),
      });
      setTitle('');
      onSuccess();
    } catch (error) {
      console.error('Failed to create card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="new-card-input">
      <textarea
        ref={textareaRef}
        className="new-card-textarea"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a title for this card..."
        rows={2}
      />
      <div className="new-card-actions">
        <button
          className="new-card-submit"
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
        >
          Add Card
        </button>
        <button className="new-card-cancel" onClick={onCancel}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
