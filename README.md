<div align="center">

# 📋 Kanban

### Fast, Offline-First Desktop Kanban Board

Transform your workflow with a lightning-fast kanban board that runs entirely on your desktop — no internet required.

![Tauri](https://img.shields.io/badge/Tauri-2.1-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-1.70+-000000?style=for-the-badge&logo=rust&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Build](#-build)

</div>

---

## ✨ Features

- **Offline-First** - Everything runs locally with SQLite
- **Drag & Drop** - Smooth card and column reordering
- **Keyboard Shortcuts** - Full keyboard navigation
- **Undo/Redo** - Revert any action instantly
- **Auto-Save** - Changes saved automatically
- **Dark Mode** - System theme detection
- **Automatic Backups** - Database backups on startup

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + @dnd-kit
- **Backend**: Tauri + Rust
- **Database**: SQLite
- **State Management**: Zustand

## 🚀 Quick Start

```bash
npm install
npm run tauri dev
```

## 📦 Build

```bash
npm run tauri build
```

**Requirements:** Node.js 18+ and Rust 1.70+

## 📄 License

MIT License - see [LICENSE](LICENSE) for details
