# Kanban

A fast, offline-first kanban board for desktop. Built with Tauri, React, and TypeScript.

## Features

- Offline-first with SQLite
- Drag & drop cards and columns
- Keyboard shortcuts
- Undo/redo
- Auto-save
- Automatic backups
- Dark mode

## Tech Stack

**Frontend:** React + TypeScript + @dnd-kit
**Backend:** Tauri + Rust + SQLite
**State:** Zustand

## Development

**Prerequisites**
- Node.js 18+
- Rust 1.70+
- Tauri CLI

**Run locally**
```bash
npm install
npm run tauri dev
```

**Build**
```bash
npm run tauri build
```

## Structure

```
src/
  components/     # React components
  hooks/          # Custom hooks
  store/          # State management
  lib/            # Utilities

src-tauri/
  src/
    commands/     # IPC handlers
    db/           # Database layer
```
