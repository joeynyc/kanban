import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export const createMockDragStartEvent = (activeId: string, data: any): DragStartEvent =>
  ({
    active: {
      id: activeId,
      data: { current: data },
    },
  } as any);

export const createMockDragEndEvent = (
  activeId: string,
  activeData: any,
  overId: string,
  overData: any
): DragEndEvent =>
  ({
    active: {
      id: activeId,
      data: { current: activeData },
    },
    over: {
      id: overId,
      data: { current: overData },
      disabled: false,
    },
    delta: { x: 0, y: 0 },
    activatorEvent: new MouseEvent('mousedown'),
    collisions: null,
  } as any);
