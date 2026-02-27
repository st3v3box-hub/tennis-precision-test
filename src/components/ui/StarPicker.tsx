import React, { useState } from 'react';

interface Props {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  readOnly?: boolean;
}

export const StarPicker: React.FC<Props> = ({ value, onChange, readOnly = false }) => {
  const [hover, setHover] = useState(0);
  const display = hover || value || 0;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange(value === n ? undefined : n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`text-xl leading-none transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer'}
            ${n <= display ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};
