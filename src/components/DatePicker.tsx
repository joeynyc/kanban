interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const inputValue = value ? value.split('T')[0] : '';

  return (
    <div className="date-picker">
      <input
        type="date"
        value={inputValue}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val ? new Date(val + 'T23:59:59').toISOString() : null);
        }}
      />
      {value && (
        <button
          className="date-picker-clear"
          onClick={() => onChange(null)}
          aria-label="Clear date"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
