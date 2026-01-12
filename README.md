# Local Kanban Desktop App

A fast, offline-first kanban board application built with Tauri, React, and TypeScript.

## Features

- **Fast & Offline** - Everything runs locally with SQLite
- **Drag & Drop** - Smooth card and column reordering
- **Keyboard Shortcuts** - Full keyboard navigation and shortcuts
- **Undo/Redo** - Revert any action instantly
- **Auto-save** - Changes saved automatically
- **Dark Mode** - System theme detection
- **Automatic Backups** - Database backups on startup and graceful recovery
- **Accessibility** - Focus outlines and semantic HTML

## Architecture

**Frontend:** React + TypeScript + @dnd-kit
**Backend:** Tauri + Rust + SQLite
**State:** Zustand with optimistic updates

## Development

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Tauri CLI

### Setup
```bash
npm install
npm run tauri dev
```

### Build
```bash
npm run build
npm run tauri build
```

## Project Structure

```
src/
  components/          # React UI components
  hooks/              # Custom hooks (keyboard, auto-save, toasts)
  store/              # Zustand stores (board state, history)
  lib/                # Storage adapter, utilities
  types/              # TypeScript types

src-tauri/
  src/
    commands/         # IPC handlers (boards, columns, cards, backup)
    db/               # Database wrapper and migrations
```

## Implementation Status

All 6 phases complete:
- Phase 1: Scaffolding & SQLite ✓
- Phase 2: Core UI Components ✓
- Phase 3: Drag & Drop ✓
- Phase 4: Keyboard Shortcuts & Undo/Redo ✓
- Phase 5: Data Safety & Backups ✓
- Phase 6: Polish & Performance ✓
