Below is a **clean, build ready PRD/spec sheet**. This is scoped so you can actually ship it, not a fantasy doc.

---

# Product Requirements Document (PRD)

**Product:** Local Kanban Desktop App
**Platform:** Windows (initial), macOS optional later
**Tech Target:** Tauri + React + SQLite
**Cost:** Free, local only

---

## 1. Purpose & Goals

### Problem

Existing kanban tools are cloud based, slow to open, subscription gated, and overfeatured for personal workflows.

### Goal

Create a **fast, offline, local-first kanban app** that opens instantly and stores all data on the user’s machine.

### Non-Goals

* No collaboration
* No accounts
* No cloud sync
* No permissions or auth
* No mobile app (for now)

---

## 2. Target User

* Single user
* Technical or semi technical
* Wants full control of data
* Uses kanban for tasks, planning, or projects

---

## 3. Core Principles

* Opens in under 1 second
* Works offline 100 percent of the time
* No setup required after install
* Data is portable and user owned
* UI over cleverness

---

## 4. MVP Feature Set (Must Have)

### Boards

* Create board
* Rename board
* Delete board
* Single active board view

### Columns

* Default columns: To Do, Doing, Done
* Rename column
* Reorder columns
* Add and delete columns

### Cards

* Create card
* Edit title and description
* Delete card
* Drag between columns
* Reorder within column
* Persist order

### Persistence

* Local storage via SQLite
* Data saved automatically
* Data restored on app reopen

---

## 5. Phase 2 Features (Should Have)

* Card tags (simple text or color)
* Due date
* Search cards
* Keyboard shortcuts

  * N = new card
  * Slash = search
* Export board to JSON
* Import board from JSON

---

## 6. Phase 3 Features (Nice to Have)

* Multiple boards open in tabs
* Board templates
* Basic stats (cards per column)
* Local AI assistant to generate cards (optional later)

---

## 7. User Flows

### App Launch

1. User opens app
2. Last active board loads automatically
3. UI is immediately interactive

### Create Card

1. Click add card or press shortcut
2. Enter title
3. Card appears at bottom of column
4. Saved instantly

### Move Card

1. Drag card
2. Drop in new position or column
3. Order updates
4. Change saved instantly

---

## 8. Data Model (Initial)

### boards

* id (uuid)
* name
* created_at
* updated_at

### columns

* id (uuid)
* board_id
* name
* order

### cards

* id (uuid)
* column_id
* title
* description
* order
* tags (optional)
* due_date (optional)
* created_at
* updated_at

---

## 9. Architecture

### Frontend

* React
* Vite
* Drag and drop library
* Storage adapter interface

### Backend (Embedded)

* Tauri backend
* SQLite database
* File stored in app data directory

### Storage Adapter Pattern

Frontend never talks directly to SQLite.

Example interface:

* getBoard()
* saveBoard()
* createCard()
* moveCard()
* updateCard()

SQLite implementation swapped in later without UI rewrite.

---

## 10. Performance Requirements

* App launch under 1 second
* Drag and drop feels instant
* No visible loading spinners for core actions

---

## 11. UX Requirements

* Clean, minimal UI
* Clear column separation
* Cards readable at a glance
* Keyboard friendly
* No modal overload

---

## 12. Security & Privacy

* All data stored locally
* No network requests
* No telemetry
* No tracking

---

## 13. Distribution

* Local install only
* No login
* No updates required initially
* Optional manual update later

---

## 14. Success Criteria

* You use it daily
* No terminal needed to run it
* Zero subscriptions
* No friction opening or saving

---

## 15. Open Questions (Decide Later)

* Dark mode default?
* Markdown support in card descriptions?
* Autosave indicator or silent save only?

---

If you want, next step I can:

* Turn this into a **task breakdown you can paste into your own kanban**
* Or generate the **exact Tauri + React project scaffold**
* Or write the **storage adapter interface + fake in memory implementation**

Tell me which one you want next.
