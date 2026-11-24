import React from 'react';

/**
 * Nome and Cognome as two required fields, so a new player can't be saved as "Laura"
 * (and then duplicated as "Laura Vaccaro").
 */
export const PlayerNameFields: React.FC<{
  firstName: string;
  lastName: string;
  onChange: (firstName: string, lastName: string) => void;
  dark?: boolean;
}> = ({ firstName, lastName, onChange, dark }) => {
  const input = `w-full border rounded-xl px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 ${
    dark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40' : 'border-gray-300 bg-white'}`;
  const label = `block text-sm font-medium mb-1 ${dark ? 'text-chalk/80' : 'text-gray-700'}`;
  const missing = (v: string) => (v.trim() ? '' : ' border-amber-400');
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <label className="block min-w-0">
        <span className={label}>Nome *</span>
        <input type="text" value={firstName} onChange={e => onChange(e.target.value, lastName)}
          placeholder="Es. Laura" autoComplete="off" autoCapitalize="words" enterKeyHint="next"
          className={input + missing(firstName)} aria-required="true" />
      </label>
      <label className="block min-w-0">
        <span className={label}>Cognome *</span>
        <input type="text" value={lastName} onChange={e => onChange(firstName, e.target.value)}
          placeholder="Es. Vaccaro" autoComplete="off" autoCapitalize="words"
          className={input + missing(lastName)} aria-required="true" />
      </label>
    </div>
  );
};
