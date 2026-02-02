import { useState, useRef } from 'react';
import { useKanbanStore } from '../store';
import { tauriStorage } from '../lib/tauriStorage';

export function ImportExportMenu() {
  const { activeBoardId, importBoard, importTrelloBoard, loadBoards } = useKanbanStore();
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'json' | 'trello'>('json');

  const handleExportJson = async () => {
    if (!activeBoardId) return;
    try {
      const json = await tauriStorage.exportBoardJson(activeBoardId);
      downloadFile(json, 'board-export.json', 'application/json');
    } catch (error) {
      console.error('Export failed:', error);
    }
    setIsOpen(false);
  };

  const handleExportCsv = async () => {
    if (!activeBoardId) return;
    try {
      const csv = await tauriStorage.exportBoardCsv(activeBoardId);
      downloadFile(csv, 'board-export.csv', 'text/csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
    setIsOpen(false);
  };

  const handleImportClick = (type: 'json' | 'trello') => {
    setImportType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      if (importType === 'trello') {
        await importTrelloBoard(text);
      } else {
        await importBoard(text);
      }
      await loadBoards();
    } catch (error) {
      console.error('Import failed:', error);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOpen(false);
  };

  return (
    <div className="import-export-menu">
      <button
        className="header-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Import/Export"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="import-export-backdrop" onClick={() => setIsOpen(false)} />
          <div className="import-export-dropdown">
            <div className="import-export-section">
              <div className="import-export-section-title">Export</div>
              <button onClick={handleExportJson} disabled={!activeBoardId}>Export as JSON</button>
              <button onClick={handleExportCsv} disabled={!activeBoardId}>Export as CSV</button>
            </div>
            <div className="import-export-divider" />
            <div className="import-export-section">
              <div className="import-export-section-title">Import</div>
              <button onClick={() => handleImportClick('json')}>Import JSON</button>
              <button onClick={() => handleImportClick('trello')}>Import from Trello</button>
            </div>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
