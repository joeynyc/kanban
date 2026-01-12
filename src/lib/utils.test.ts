import { describe, it, expect } from 'vitest';
import { calculateOrderBetween, normalizeById, sortByOrder, generateId, now } from './utils';

describe('calculateOrderBetween', () => {
  it('should return 1.0 when both before and after are null', () => {
    expect(calculateOrderBetween(null, null)).toBe(1.0);
  });

  it('should return half of after when before is null', () => {
    expect(calculateOrderBetween(null, 10.0)).toBe(5.0);
  });

  it('should return before + 1 when after is null', () => {
    expect(calculateOrderBetween(5.0, null)).toBe(6.0);
  });

  it('should return midpoint when both before and after exist', () => {
    expect(calculateOrderBetween(2.0, 4.0)).toBe(3.0);
  });

  it('should handle fractional orders correctly', () => {
    expect(calculateOrderBetween(1.0, 1.5)).toBe(1.25);
  });

  it('should handle very small gaps without precision loss', () => {
    const result = calculateOrderBetween(1.0, 1.001);
    expect(result).toBeGreaterThan(1.0);
    expect(result).toBeLessThan(1.001);
  });

  it('should handle zero values', () => {
    expect(calculateOrderBetween(0, 2.0)).toBe(1.0);
  });

  it('should maintain precision for many subdivisions', () => {
    let order = 1.0;

    // Simulate 50 insertions at the same position
    for (let i = 0; i < 50; i++) {
      order = calculateOrderBetween(null, order);
    }

    expect(order).toBeGreaterThan(0);
    expect(order).toBeLessThan(1.0);
    expect(Number.isFinite(order)).toBe(true);
  });

  it('should handle negative orders', () => {
    expect(calculateOrderBetween(-5.0, -1.0)).toBe(-3.0);
  });
});

describe('normalizeById', () => {
  it('should convert array to Record keyed by id', () => {
    const items = [
      { id: 'a', name: 'Item A' },
      { id: 'b', name: 'Item B' },
    ];
    const result = normalizeById(items);
    expect(result).toEqual({
      a: { id: 'a', name: 'Item A' },
      b: { id: 'b', name: 'Item B' },
    });
  });

  it('should handle empty array', () => {
    expect(normalizeById([])).toEqual({});
  });

  it('should handle single item', () => {
    const items = [{ id: 'single', value: 42 }];
    expect(normalizeById(items)).toEqual({
      single: { id: 'single', value: 42 },
    });
  });

  it('should handle items with complex nested objects', () => {
    const items = [
      { id: 'complex', data: { nested: { value: 'test' } } },
    ];
    const result = normalizeById(items);
    expect(result['complex'].data.nested.value).toBe('test');
  });
});

describe('sortByOrder', () => {
  it('should sort items by order field ascending', () => {
    const items = [
      { id: 'a', order: 3.0 },
      { id: 'b', order: 1.0 },
      { id: 'c', order: 2.0 },
    ];
    const sorted = sortByOrder(items);
    expect(sorted.map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('should not mutate original array', () => {
    const items = [{ id: 'a', order: 2 }, { id: 'b', order: 1 }];
    const original = [...items];
    sortByOrder(items);
    expect(items).toEqual(original);
  });

  it('should handle empty array', () => {
    expect(sortByOrder([])).toEqual([]);
  });

  it('should handle already sorted items', () => {
    const items = [
      { id: 'a', order: 1.0 },
      { id: 'b', order: 2.0 },
      { id: 'c', order: 3.0 },
    ];
    const sorted = sortByOrder(items);
    expect(sorted).toEqual(items);
  });

  it('should handle float orders correctly', () => {
    const items = [
      { id: 'a', order: 1.5 },
      { id: 'b', order: 1.25 },
      { id: 'c', order: 1.75 },
    ];
    const sorted = sortByOrder(items);
    expect(sorted.map(i => i.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('generateId', () => {
  it('should generate a UUID', () => {
    const id = generateId();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should generate IDs in correct format', () => {
    const id = generateId();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe('now', () => {
  it('should return ISO timestamp', () => {
    const timestamp = now();
    expect(timestamp).toBeDefined();
    expect(typeof timestamp).toBe('string');
    // ISO format: 2024-01-12T...
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should return valid date', () => {
    const timestamp = now();
    const date = new Date(timestamp);
    expect(date instanceof Date).toBe(true);
    expect(Number.isNaN(date.getTime())).toBe(false);
  });

  it('should return recent timestamps', () => {
    const timestamp = now();
    const date = new Date(timestamp);
    const now_time = new Date();
    // Should be within 1 second
    expect(Math.abs(now_time.getTime() - date.getTime())).toBeLessThan(1000);
  });
});
