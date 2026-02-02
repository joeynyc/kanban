import { useKanbanStore } from '../store';
import { LabelBadge } from './LabelBadge';

interface LabelPickerProps {
  cardId: string;
}

export function LabelPicker({ cardId }: LabelPickerProps) {
  const { getLabelsForActiveBoard, getLabelsForCard, addLabelToCard, removeLabelFromCard } = useKanbanStore();
  const allLabels = getLabelsForActiveBoard();
  const cardLabels = getLabelsForCard(cardId);
  const cardLabelIds = new Set(cardLabels.map((l) => l.id));

  const handleToggle = (labelId: string) => {
    if (cardLabelIds.has(labelId)) {
      removeLabelFromCard(cardId, labelId);
    } else {
      addLabelToCard(cardId, labelId);
    }
  };

  if (allLabels.length === 0) {
    return <div className="label-picker-empty">No labels yet. Create labels from the header menu.</div>;
  }

  return (
    <div className="label-picker">
      {allLabels.map((label) => (
        <label key={label.id} className="label-picker-item">
          <input
            type="checkbox"
            checked={cardLabelIds.has(label.id)}
            onChange={() => handleToggle(label.id)}
          />
          <LabelBadge label={label} size="md" />
        </label>
      ))}
    </div>
  );
}
