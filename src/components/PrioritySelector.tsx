import type { Priority } from '../types';
import { getPriorityColor } from '../lib/utils';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div className="priority-selector">
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          className={`priority-option ${value === p.value ? 'active' : ''}`}
          onClick={() => onChange(p.value)}
          style={{
            borderColor: value === p.value ? getPriorityColor(p.value) : undefined,
            color: p.value !== 'none' ? getPriorityColor(p.value) : undefined,
          }}
        >
          {p.value !== 'none' && (
            <span className="priority-dot" style={{ backgroundColor: getPriorityColor(p.value) }} />
          )}
          {p.label}
        </button>
      ))}
    </div>
  );
}
