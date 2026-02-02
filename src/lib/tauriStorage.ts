import { invoke as invokeImport } from '@tauri-apps/api/core';

const invokeFn = typeof invokeImport === 'function' ? invokeImport :
                 (typeof window !== 'undefined' && (window as any).__TAURI__?.core?.invoke) ||
                 (() => { throw new Error('Tauri invoke not available'); });

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
import type { StorageAdapter } from './storage';

/**
 * Tauri/SQLite storage adapter implementation
 * Communicates with Rust backend via IPC
 */
export const tauriStorage: StorageAdapter = {
  // Boards
  async getAllBoards(): Promise<Board[]> {
    return invokeFn('get_all_boards');
  },

  async getBoard(id: string): Promise<Board | null> {
    return invokeFn('get_board', { id });
  },

  async createBoard(input: CreateBoardInput): Promise<Board> {
    return invokeFn('create_board', { input });
  },

  async updateBoard(id: string, input: UpdateBoardInput): Promise<Board> {
    return invokeFn('update_board', { id, input });
  },

  async deleteBoard(id: string): Promise<void> {
    return invokeFn('delete_board', { id });
  },

  async setLastOpenedBoard(id: string): Promise<void> {
    return invokeFn('set_last_opened_board', { id });
  },

  // Columns
  async getColumnsForBoard(boardId: string): Promise<Column[]> {
    return invokeFn('get_columns_for_board', { boardId });
  },

  async createColumn(input: CreateColumnInput): Promise<Column> {
    return invokeFn('create_column', { input });
  },

  async updateColumn(id: string, input: UpdateColumnInput): Promise<Column> {
    return invokeFn('update_column', { id, input });
  },

  async deleteColumn(id: string): Promise<void> {
    return invokeFn('delete_column', { id });
  },

  async reorderColumns(updates: ReorderColumnInput[]): Promise<void> {
    return invokeFn('reorder_columns', { updates });
  },

  // Cards
  async getCardsForBoard(boardId: string): Promise<Card[]> {
    return invokeFn('get_cards_for_board', { boardId });
  },

  async getCardsForColumn(columnId: string): Promise<Card[]> {
    return invokeFn('get_cards_for_column', { columnId });
  },

  async createCard(input: CreateCardInput): Promise<Card> {
    return invokeFn('create_card', { input });
  },

  async updateCard(id: string, input: UpdateCardInput): Promise<Card> {
    return invokeFn('update_card', { id, input });
  },

  async deleteCard(id: string): Promise<void> {
    return invokeFn('delete_card', { id });
  },

  async moveCard(id: string, input: MoveCardInput): Promise<Card> {
    return invokeFn('move_card', { id, input });
  },

  async batchUpdateCardOrders(updates: BatchUpdateOrderInput[]): Promise<void> {
    return invokeFn('batch_update_card_orders', { updates });
  },

  // Labels
  async getLabelsForBoard(boardId: string): Promise<Label[]> {
    return invokeFn('get_labels_for_board', { boardId });
  },

  async createLabel(input: CreateLabelInput): Promise<Label> {
    return invokeFn('create_label', { input });
  },

  async updateLabel(id: string, input: UpdateLabelInput): Promise<Label> {
    return invokeFn('update_label', { id, input });
  },

  async deleteLabel(id: string): Promise<void> {
    return invokeFn('delete_label', { id });
  },

  async addLabelToCard(cardId: string, labelId: string): Promise<void> {
    return invokeFn('add_label_to_card', { cardId, labelId });
  },

  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> {
    return invokeFn('remove_label_from_card', { cardId, labelId });
  },

  async getLabelsForCard(cardId: string): Promise<Label[]> {
    return invokeFn('get_labels_for_card', { cardId });
  },

  async getCardLabelsForBoard(boardId: string): Promise<CardLabelMapping[]> {
    return invokeFn('get_card_labels_for_board', { boardId });
  },

  // Checklists
  async getChecklistsForCard(cardId: string): Promise<Checklist[]> {
    return invokeFn('get_checklists_for_card', { cardId });
  },

  async getChecklistsForBoard(boardId: string): Promise<Checklist[]> {
    return invokeFn('get_checklists_for_board', { boardId });
  },

  async createChecklist(input: CreateChecklistInput): Promise<Checklist> {
    return invokeFn('create_checklist', { input });
  },

  async updateChecklist(id: string, input: UpdateChecklistInput): Promise<Checklist> {
    return invokeFn('update_checklist', { id, input });
  },

  async deleteChecklist(id: string): Promise<void> {
    return invokeFn('delete_checklist', { id });
  },

  async getChecklistItemsForBoard(boardId: string): Promise<ChecklistItem[]> {
    return invokeFn('get_checklist_items_for_board', { boardId });
  },

  async createChecklistItem(input: CreateChecklistItemInput): Promise<ChecklistItem> {
    return invokeFn('create_checklist_item', { input });
  },

  async updateChecklistItem(id: string, input: UpdateChecklistItemInput): Promise<ChecklistItem> {
    return invokeFn('update_checklist_item', { id, input });
  },

  async deleteChecklistItem(id: string): Promise<void> {
    return invokeFn('delete_checklist_item', { id });
  },

  async getChecklistItemsForChecklist(checklistId: string): Promise<ChecklistItem[]> {
    return invokeFn('get_checklist_items_for_checklist', { checklistId });
  },

  // Export/Import
  async exportBoardJson(boardId: string): Promise<string> {
    return invokeFn('export_board_json', { boardId });
  },

  async exportBoardCsv(boardId: string): Promise<string> {
    return invokeFn('export_board_csv', { boardId });
  },

  async importBoardJson(jsonData: string): Promise<Board> {
    return invokeFn('import_board_json', { jsonData });
  },

  async importTrelloJson(jsonData: string, boardName?: string): Promise<Board> {
    return invokeFn('import_trello_json', { jsonData, boardName });
  },
};
