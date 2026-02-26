import React from 'react';
import type { WizardPlayerData } from '../../types';

interface Props {
  players: WizardPlayerData[];
  activeIdx: number;
  completedFlags: boolean[];
  onChange: (idx: number) => void;
}

export const PlayerTabBar: React.FC<Props> = ({ players, activeIdx, completedFlags, onChange }) => {
  if (players.length <= 1) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {players.map((p, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all whitespace-nowrap
            ${activeIdx === i
              ? 'bg-green-600 border-green-600 text-white'
              : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
            }`}
        >
          <span className="truncate max-w-[80px]">{p.name || `G${i + 1}`}</span>
          {completedFlags[i] ? (
            <span className={`text-xs ${activeIdx === i ? 'text-green-200' : 'text-green-600'}`}>✓</span>
          ) : (
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activeIdx === i ? 'bg-green-300' : 'bg-gray-300'}`} />
          )}
        </button>
      ))}
    </div>
  );
};
