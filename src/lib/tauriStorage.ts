import { invoke } from '@tauri-apps/api/core';
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
import type { StorageAdapter } from './storage';

/**
 * Tauri/SQLite storage adapter implementation
 * Communicates with Rust backend via IPC
 */
export const tauriStorage: StorageAdapter = {
  // Boards
  async getAllBoards(): Promise<Board[]> {
    return invoke('get_all_boards');
  },

  async getBoard(id: string): Promise<Board | null> {
    return invoke('get_board', { id });
  },

  async createBoard(input: CreateBoardInput): Promise<Board> {
    return invoke('create_board', { input });
  },

  async updateBoard(id: string, input: UpdateBoardInput): Promise<Board> {
    return invoke('update_board', { id, input });
  },

  async deleteBoard(id: string): Promise<void> {
    return invoke('delete_board', { id });
  },

  async setLastOpenedBoard(id: string): Promise<void> {
    return invoke('set_last_opened_board', { id });
  },

  // Columns
  async getColumnsForBoard(boardId: string): Promise<Column[]> {
    return invoke('get_columns_for_board', { boardId });
  },

  async createColumn(input: CreateColumnInput): Promise<Column> {
    return invoke('create_column', { input });
  },

  async updateColumn(id: string, input: UpdateColumnInput): Promise<Column> {
    return invoke('update_column', { id, input });
  },

  async deleteColumn(id: string): Promise<void> {
    return invoke('delete_column', { id });
  },

  async reorderColumns(updates: ReorderColumnInput[]): Promise<void> {
    return invoke('reorder_columns', { updates });
  },

  // Cards
  async getCardsForBoard(boardId: string): Promise<Card[]> {
    return invoke('get_cards_for_board', { boardId });
  },

  async getCardsForColumn(columnId: string): Promise<Card[]> {
    return invoke('get_cards_for_column', { columnId });
  },

  async createCard(input: CreateCardInput): Promise<Card> {
    return invoke('create_card', { input });
  },

  async updateCard(id: string, input: UpdateCardInput): Promise<Card> {
    return invoke('update_card', { id, input });
  },

  async deleteCard(id: string): Promise<void> {
    return invoke('delete_card', { id });
  },

  async moveCard(id: string, input: MoveCardInput): Promise<Card> {
    return invoke('move_card', { id, input });
  },

  async batchUpdateCardOrders(updates: BatchUpdateOrderInput[]): Promise<void> {
    return invoke('batch_update_card_orders', { updates });
  },
};
