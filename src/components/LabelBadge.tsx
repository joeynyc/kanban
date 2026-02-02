import type { Label } from '../types';

interface LabelBadgeProps {
  label: Label;
  size?: 'sm' | 'md';
}

export function LabelBadge({ label, size = 'sm' }: LabelBadgeProps) {
  if (size === 'sm') {
    return (
      <span
        className="label-badge label-badge-sm"
        style={{ backgroundColor: label.color }}
        title={label.name}
      />
    );
  }

  return (
    <span
      className="label-badge label-badge-md"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
    </span>
  );
}
