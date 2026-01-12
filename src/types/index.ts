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

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  order: number;
  archived: boolean;
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
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  order?: number;
  archived?: boolean;
}

export interface MoveCardInput {
  columnId: string;
  order: number;
}

export interface BatchUpdateOrderInput {
  id: string;
  order: number;
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
