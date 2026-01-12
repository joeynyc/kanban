import { vi } from 'vitest';
import type { Board, Column, Card } from '../types';

export const createMockBoard = (overrides?: Partial<Board>): Board => ({
  id: 'board-1',
  name: 'Test Board',
  lastOpenedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockColumn = (overrides?: Partial<Column>): Column => ({
  id: 'col-1',
  boardId: 'board-1',
  name: 'To Do',
  order: 1.0,
  archived: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockCard = (overrides?: Partial<Card>): Card => ({
  id: 'card-1',
  columnId: 'col-1',
  title: 'Test Card',
  description: null,
  order: 1.0,
  archived: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockTauriInvoke = vi.fn();
