import type { Priority } from '../types';

/**
 * Calculate order value between two items for insertion
 * Uses float midpoint for O(1) reordering
 */
export function calculateOrderBetween(
  before: number | null,
  after: number | null
): number {
  if (before === null && after === null) {
    return 1.0;
  }
  if (before === null) {
    return after! / 2;
  }
  if (after === null) {
    return before + 1.0;
  }
  return (before + after) / 2;
}

/**
 * Generate a new UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Normalize items into a Record by ID
 */
export function normalizeById<T extends { id: string }>(
  items: T[]
): Record<string, T> {
  return items.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<string, T>
  );
}

/**
 * Sort items by order field
 */
export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/**
 * Check if a due date is overdue (past)
 */
export function isDueOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

/**
 * Check if a due date is within 24 hours
 */
export function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

/**
 * Format a due date for display
 */
export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '';
  const date = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Get CSS color for a priority level
 */
export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'urgent': return '#eb5a46';
    case 'high': return '#ff9f1a';
    case 'medium': return '#f2d600';
    case 'low': return '#61bd4f';
    default: return 'transparent';
  }
}
