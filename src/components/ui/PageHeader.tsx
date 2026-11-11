import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: React.ReactNode;
}

/** Sticky white page header with a back arrow, used by the newer pages. */
export const PageHeader: React.FC<Props> = ({ title, subtitle, backTo, actions }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="text-gray-500 hover:text-gray-800 text-xl leading-none"
          aria-label="Indietro"
        >←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
};
