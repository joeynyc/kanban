import type {
  Board,
  Card,
  Column,
  Label,
  Checklist,
  ChecklistItem,
  CardLabelMapping,
  CreateBoardInput,
  CreateCardInput,
  CreateColumnInput,
  UpdateBoardInput,
  UpdateCardInput,
  UpdateColumnInput,
  MoveCardInput,
  ReorderColumnInput,
  BatchUpdateOrderInput,
  CreateLabelInput,
  UpdateLabelInput,
  CreateChecklistInput,
  UpdateChecklistInput,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
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

  // Labels
  getLabelsForBoard(boardId: string): Promise<Label[]>;
  createLabel(input: CreateLabelInput): Promise<Label>;
  updateLabel(id: string, input: UpdateLabelInput): Promise<Label>;
  deleteLabel(id: string): Promise<void>;
  addLabelToCard(cardId: string, labelId: string): Promise<void>;
  removeLabelFromCard(cardId: string, labelId: string): Promise<void>;
  getLabelsForCard(cardId: string): Promise<Label[]>;
  getCardLabelsForBoard(boardId: string): Promise<CardLabelMapping[]>;

  // Checklists
  getChecklistsForCard(cardId: string): Promise<Checklist[]>;
  getChecklistsForBoard(boardId: string): Promise<Checklist[]>;
  createChecklist(input: CreateChecklistInput): Promise<Checklist>;
  updateChecklist(id: string, input: UpdateChecklistInput): Promise<Checklist>;
  deleteChecklist(id: string): Promise<void>;
  getChecklistItemsForBoard(boardId: string): Promise<ChecklistItem[]>;
  createChecklistItem(input: CreateChecklistItemInput): Promise<ChecklistItem>;
  updateChecklistItem(id: string, input: UpdateChecklistItemInput): Promise<ChecklistItem>;
  deleteChecklistItem(id: string): Promise<void>;
  getChecklistItemsForChecklist(checklistId: string): Promise<ChecklistItem[]>;

  // Export/Import
  exportBoardJson(boardId: string): Promise<string>;
  exportBoardCsv(boardId: string): Promise<string>;
  importBoardJson(jsonData: string): Promise<Board>;
  importTrelloJson(jsonData: string, boardName?: string): Promise<Board>;
}
