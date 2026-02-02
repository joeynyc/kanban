import { useState } from 'react';
import { useKanbanStore } from '../store';

const PRESET_COLORS = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0',
  '#0079bf', '#00c2e0', '#51e898', '#ff78cb', '#344563',
];

interface LabelManagerProps {
  onClose: () => void;
}

export function LabelManager({ onClose }: LabelManagerProps) {
  const { getLabelsForActiveBoard, createLabel, updateLabel, deleteLabel, activeBoardId } = useKanbanStore();
  const labels = getLabelsForActiveBoard();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || !activeBoardId) return;
    await createLabel({ boardId: activeBoardId, name: newName.trim(), color: newColor });
    setNewName('');
  };

  const handleStartEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateLabel(editingId, { name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteLabel(id);
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="card-detail-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="label-manager" role="dialog" aria-modal="true">
        <div className="label-manager-header">
          <h3>Manage Labels</h3>
          <button className="card-detail-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="label-manager-body">
          <div className="label-manager-list">
            {labels.map((label) => (
              <div key={label.id} className="label-manager-item">
                {editingId === label.id ? (
                  <div className="label-manager-edit">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                    />
                    <div className="label-color-picker">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`label-color-option ${editColor === color ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setEditColor(color)}
                          aria-label={color}
                        />
                      ))}
                    </div>
                    <div className="label-manager-edit-actions">
                      <button className="label-manager-save" onClick={handleSaveEdit}>Save</button>
                      <button className="label-manager-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="label-badge label-badge-md" style={{ backgroundColor: label.color }}>{label.name}</span>
                    <div className="label-manager-item-actions">
                      <button onClick={() => handleStartEdit(label.id, label.name, label.color)} aria-label="Edit label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(label.id)} aria-label="Delete label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="label-manager-create">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="New label name..."
            />
            <div className="label-color-picker">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`label-color-option ${newColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewColor(color)}
                  aria-label={color}
                />
              ))}
            </div>
            <button className="label-manager-save" onClick={handleCreate} disabled={!newName.trim()}>
              Create Label
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}