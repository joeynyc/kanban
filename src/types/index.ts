// Core domain types

export interface Board {
  id: string;
  name: string;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  order: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  priority: Priority;
}

export interface Label {
  id: string;
  boardId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardLabelMapping {
  cardId: string;
  labelId: string;
}

export interface Checklist {
  id: string;
  cardId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  text: string;
  checked: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Input types for creating/updating

export interface CreateBoardInput {
  name: string;
}

export interface UpdateBoardInput {
  name?: string;
}

export interface CreateColumnInput {
  boardId: string;
  name: string;
  order?: number;
}

export interface UpdateColumnInput {
  name?: string;
  order?: number;
  archived?: boolean;
}

export interface ReorderColumnInput {
  id: string;
  order: number;
}

export interface CreateCardInput {
  columnId: string;
  title: string;
  description?: string;
  order?: number;
  dueDate?: string;
  priority?: Priority;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  order?: number;
  archived?: boolean;
  dueDate?: string;
  priority?: Priority;
}

export interface MoveCardInput {
  columnId: string;
  order: number;
}

export interface BatchUpdateOrderInput {
  id: string;
  order: number;
}

export interface CreateLabelInput {
  boardId: string;
  name: string;
  color: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
}

export interface CreateChecklistInput {
  cardId: string;
  name: string;
  order?: number;
}

export interface UpdateChecklistInput {
  name?: string;
  order?: number;
}

export interface CreateChecklistItemInput {
  checklistId: string;
  text: string;
  order?: number;
}

export interface UpdateChecklistItemInput {
  text?: string;
  checked?: boolean;
  order?: number;
}

export interface BoardExport {
  board: Board;
  columns: Column[];
  cards: Card[];
  labels: Label[];
  cardLabels: CardLabelMapping[];
  checklists: Checklist[];
  checklistItems: ChecklistItem[];
}

// Store state types

export interface BoardState {
  boards: Record<string, Board>;
  columns: Record<string, Column>;
  cards: Record<string, Card>;
  activeBoardId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Derived view types

export interface BoardView {
  board: Board;
  columns: ColumnView[];
}

export interface ColumnView {
  column: Column;
  cards: Card[];
}
