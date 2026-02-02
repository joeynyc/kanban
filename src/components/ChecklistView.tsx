import { useState } from 'react';
import { useKanbanStore } from '../store';
import type { Checklist } from '../types';
import { ChecklistProgress } from './ChecklistProgress';

interface ChecklistViewProps {
  checklist: Checklist;
}

export function ChecklistView({ checklist }: ChecklistViewProps) {
  const {
    getChecklistItemsForChecklist,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    toggleChecklistItem,
    updateChecklist,
    deleteChecklist,
  } = useKanbanStore();

  const items = getChecklistItemsForChecklist(checklist.id);
  const [newItemText, setNewItemText] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(checklist.name);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemText, setEditItemText] = useState('');

  const checked = items.filter((i) => i.checked).length;
  const total = items.length;

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    await createChecklistItem({ checklistId: checklist.id, text: newItemText.trim() });
    setNewItemText('');
  };

  const handleSaveName = async () => {
    if (editName.trim() && editName.trim() !== checklist.name) {
      await updateChecklist(checklist.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleStartEditItem = (id: string, text: string) => {
    setEditingItemId(id);
    setEditItemText(text);
  };

  const handleSaveItemEdit = async () => {
    if (!editingItemId || !editItemText.trim()) return;
    await updateChecklistItem(editingItemId, { text: editItemText.trim() });
    setEditingItemId(null);
  };

  return (
    <div className="checklist-view">
      <div className="checklist-view-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
            autoFocus
            className="checklist-name-input"
          />
        ) : (
          <h4 className="checklist-name" onDoubleClick={() => setIsEditingName(true)}>{checklist.name}</h4>
        )}
        <button className="checklist-delete-btn" onClick={() => deleteChecklist(checklist.id)} aria-label="Delete checklist">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {total > 0 && <ChecklistProgress checked={checked} total={total} />}

      <div className="checklist-items">
        {items.map((item) => (
          <div key={item.id} className={`checklist-item ${item.checked ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleChecklistItem(item.id)}
            />
            {editingItemId === item.id ? (
              <input
                type="text"
                value={editItemText}
                onChange={(e) => setEditItemText(e.target.value)}
                onBlur={handleSaveItemEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveItemEdit(); if (e.key === 'Escape') setEditingItemId(null); }}
                autoFocus
                className="checklist-item-edit"
              />
            ) : (
              <span
                className="checklist-item-text"
                onDoubleClick={() => handleStartEditItem(item.id, item.text)}
              >
                {item.text}
              </span>
            )}
            <button
              className="checklist-item-delete"
              onClick={() => deleteChecklistItem(item.id)}
              aria-label="Delete item"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="checklist-add-item">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
          placeholder="Add an item..."
        />
        {newItemText.trim() && (
          <button className="checklist-add-item-btn" onClick={handleAddItem}>Add</button>
        )}
      </div>
    </div>
  );
}
