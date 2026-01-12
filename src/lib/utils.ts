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
