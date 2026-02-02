interface ChecklistProgressProps {
  checked: number;
  total: number;
}

export function ChecklistProgress({ checked, total }: ChecklistProgressProps) {
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="checklist-progress" title={`${checked}/${total} items complete`}>
      <div className="checklist-progress-bar">
        <div
          className={`checklist-progress-fill ${percent === 100 ? 'complete' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="checklist-progress-text">{checked}/{total}</span>
    </div>
  );
}
