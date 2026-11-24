import React from 'react';

interface Props {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  /** Series of 5 pairs (e.g. attacco e volée): buttons 0–5, stored score = pairs × 2 */
  pairs?: boolean;
}

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PAIRS = [0, 1, 2, 3, 4, 5];

const scoreColor = (v: number, selected: boolean): string => {
  if (selected) {
    if (v <= 3) return 'bg-red-500 border-red-500 text-white shadow-lg';
    if (v <= 6) return 'bg-yellow-500 border-yellow-500 text-white shadow-lg';
    return 'bg-brand-500 border-brand-500 text-white shadow-lg';
  }
  return 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-100';
};

export const ScoreInput: React.FC<Props> = ({ value, onChange, disabled, pairs }) => {
  const buttons = pairs ? PAIRS : SCORES;
  return (
    <div className={`grid gap-1 ${pairs ? 'grid-cols-6' : 'grid-cols-11'}`}>
      {buttons.map(b => {
        const score = pairs ? b * 2 : b;
        const selected = value === score;
        return (
          <button
            key={b}
            type="button"
            disabled={disabled}
            onClick={() => onChange(score)}
            aria-label={pairs ? `${b} coppie su 5` : `${b} su 10`}
            className={`score-btn text-sm font-bold rounded-lg border-2 py-3 transition-all
              ${scoreColor(score, selected)}
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              ${selected ? 'scale-110 z-10' : ''}
            `}
          >
            {b}
          </button>
        );
      })}
    </div>
  );
};
