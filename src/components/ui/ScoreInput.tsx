import React from 'react';

interface Props {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const scoreColor = (v: number, selected: boolean): string => {
  if (selected) {
    if (v <= 3) return 'bg-red-500 border-red-500 text-white shadow-lg';
    if (v <= 6) return 'bg-yellow-500 border-yellow-500 text-white shadow-lg';
    return 'bg-green-500 border-green-500 text-white shadow-lg';
  }
  return 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-100';
};

export const ScoreInput: React.FC<Props> = ({ value, onChange, disabled }) => (
  <div className="grid grid-cols-11 gap-1">
    {SCORES.map(s => (
      <button
        key={s}
        type="button"
        disabled={disabled}
        onClick={() => onChange(s)}
        className={`score-btn text-sm font-bold rounded-lg border-2 py-3 transition-all
          ${scoreColor(s, value === s)}
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          ${value === s ? 'scale-110 z-10' : ''}
        `}
      >
        {s}
      </button>
    ))}
  </div>
);
