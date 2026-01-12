import type {
  Board,
  Card,
  Column,
  CreateBoardInput,
  CreateCardInput,
  CreateColumnInput,
  UpdateBoardInput,
  UpdateCardInput,
  UpdateColumnInput,
  MoveCardInput,
  ReorderColumnInput,
  BatchUpdateOrderInput,
} from '../types';

/**
 * Storage adapter interface - abstracts database operations
 * Allows swapping implementations (Tauri/SQLite, IndexedDB, memory, etc.)
 */
export interface StorageAdapter {
  // Boards
  getAllBoards(): Promise<Board[]>;
  getBoard(id: string): Promise<Board | null>;
  createBoard(input: CreateBoardInput): Promise<Board>;
  updateBoard(id: string, input: UpdateBoardInput): Promise<Board>;
  deleteBoard(id: string): Promise<void>;
  setLastOpenedBoard(id: string): Promise<void>;

  // Columns
  getColumnsForBoard(boardId: string): Promise<Column[]>;
  createColumn(input: CreateColumnInput): Promise<Column>;
  updateColumn(id: string, input: UpdateColumnInput): Promise<Column>;
  deleteColumn(id: string): Promise<void>;
  reorderColumns(updates: ReorderColumnInput[]): Promise<void>;

  // Cards
  getCardsForBoard(boardId: string): Promise<Card[]>;
  getCardsForColumn(columnId: string): Promise<Card[]>;
  createCard(input: CreateCardInput): Promise<Card>;
  updateCard(id: string, input: UpdateCardInput): Promise<Card>;
  deleteCard(id: string): Promise<void>;
  moveCard(id: string, input: MoveCardInput): Promise<Card>;
  batchUpdateCardOrders(updates: BatchUpdateOrderInput[]): Promise<void>;
}
