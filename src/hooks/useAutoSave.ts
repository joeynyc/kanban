import { useState, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // The store already saves immediately, so we just track the visual state
  const markSaving = useCallback(() => {
    setStatus('saving');
  }, []);

  const markSaved = useCallback(() => {
    setStatus('saved');
    setLastSaved(new Date());

    // Reset to idle after 2 seconds
    setTimeout(() => setStatus('idle'), 2000);
  }, []);

  const markError = useCallback(() => {
    setStatus('error');
  }, []);

  return {
    status,
    lastSaved,
    markSaving,
    markSaved,
    markError,
  };
}

// Format the last saved time
export function formatLastSaved(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;

  return date.toLocaleTimeString();
}
