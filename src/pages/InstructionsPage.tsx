import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '../types';

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'terza', label: '3ª Categoria', color: 'green' },
  { value: 'seconda', label: '2ª Categoria', color: 'yellow' },
  { value: 'prima', label: '1ª Categoria', color: 'red' },
];

interface CategoryData {
  image: string;
  accentClass: string;
  zones: {
    groundstroke: { width: string; depth: string };
    volley: string;
    serve: string;
  };
  level: string;
  levelDesc: string;
}

const CATEGORY_DATA: Record<Category, CategoryData> = {
  terza: {
    image: './images/court-terza.png',
    accentClass: 'border-green-500 text-green-700 bg-green-50',
    zones: {
      groundstroke: { width: '1 mt', depth: '1 mt' },
      volley: '1.5 mt',
      serve: '2.06 mt per lato',
    },
    level: 'Principiante avanzato',
    levelDesc: 'Zone più ampie — focus sulla consistenza',
  },
  seconda: {
    image: './images/court-seconda.png',
    accentClass: 'border-yellow-500 text-yellow-700 bg-yellow-50',
    zones: {
      groundstroke: { width: '1.5 mt', depth: '2 mt' },
      volley: '1.2 mt',
      serve: '1.2 mt per lato',
    },
    level: 'Giocatore competitivo',
    levelDesc: 'Zone intermedie — precisione e continuità',
  },
  prima: {
    image: './images/court-prima.png',
    accentClass: 'border-red-500 text-red-700 bg-red-50',
    zones: {
      groundstroke: { width: '2 mt', depth: '3 mt' },
      volley: '0.7 mt',
      serve: '0.7 mt per lato',
    },
    level: 'Agonista',
    levelDesc: 'Zone precise — elevata efficienza tecnica',
  },
};

const PROTOCOL_ROWS = [
  { test: 'Groundstrokes', series: 20, balls: 10, pattern: 'FH Incrociato / BH Incrociato (alternati)' },
  { test: 'Combined', series: 10, balls: 10, pattern: 'Lungolinea / Diagonale (alternati)' },
  { test: 'Return', series: 10, balls: 10, pattern: 'Da Destra (deuce) / Da Sinistra (ad) (alternati)' },
  { test: 'Servizio', series: 6, balls: 10, pattern: '1ª Destra / 2ª Sinistra (alternati) + striscia target' },
  { test: 'Volley', series: 10, balls: 10, pattern: 'Volee FH / Volee BH (alternati)' },
];

export const InstructionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('seconda');

  const data = CATEGORY_DATA[activeCategory];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-900">Istruzioni Protocollo</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Protocol summary */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Protocollo di Test</h2>
          <p className="text-xs text-gray-500 mb-4">
            Il test misura la precisione su 5 colpi fondamentali. Ogni serie è composta da 10 palle.
            Il punteggio di ogni serie è il numero di palle che atterrano nella zona target (0–10).
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Test</th>
                  <th className="text-center px-3 py-2 text-gray-600 font-semibold">Serie</th>
                  <th className="text-center px-3 py-2 text-gray-600 font-semibold">Palle</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold hidden sm:table-cell">Alternanza</th>
                </tr>
              </thead>
              <tbody>
                {PROTOCOL_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-gray-800">{row.test}</td>
                    <td className="px-3 py-2 text-center font-bold text-green-700">{row.series}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{row.balls}</td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{row.pattern}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Totale: 56 serie · 560 palle
          </p>
        </div>

        {/* Serve strip rule */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-amber-800 mb-1">Regola Striscia Servizio</h2>
          <p className="text-xs text-amber-700">
            Il giocatore sceglie la striscia target (T · Body · Wide) per ogni serie di servizio.
            <strong> Vincolo:</strong> dopo 2 scelte consecutive uguali, la terza deve essere obbligatoriamente diversa.
          </p>
          <div className="flex gap-2 mt-2">
            {['T', 'Body', 'Wide'].map(s => (
              <span key={s} className="flex-1 text-center bg-white border border-amber-300 rounded-lg py-1.5 text-xs font-bold text-amber-700">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Category zone diagrams */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Zone Target per Categoria</h2>
            {/* Category tabs */}
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`py-2 px-2 rounded-xl border-2 text-xs font-bold transition-all
                    ${activeCategory === cat.value
                      ? cat.color === 'green'
                        ? 'bg-green-600 border-green-600 text-white'
                        : cat.color === 'yellow'
                          ? 'bg-yellow-500 border-yellow-500 text-white'
                          : 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Court diagram image */}
          <img
            src={data.image}
            alt={`Schema campo ${activeCategory}`}
            className="w-full object-contain"
          />

          {/* Zone details */}
          <div className="p-4 space-y-3">
            <div className={`rounded-xl border-2 p-3 ${data.accentClass}`}>
              <p className="text-xs font-bold mb-0.5">{data.level}</p>
              <p className="text-xs opacity-80">{data.levelDesc}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <div className="text-gray-500 mb-1">Groundstroke</div>
                <div className="font-bold text-gray-800">{data.zones.groundstroke.width}</div>
                <div className="text-gray-500">× {data.zones.groundstroke.depth}</div>
                <div className="text-gray-400 mt-1">largh. × prof.</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <div className="text-gray-500 mb-1">Volley</div>
                <div className="font-bold text-gray-800">{data.zones.volley}</div>
                <div className="text-gray-400 mt-1">dal bordo</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <div className="text-gray-500 mb-1">Servizio</div>
                <div className="font-bold text-gray-800 leading-tight">{data.zones.serve}</div>
                <div className="text-gray-400 mt-1">striscia T</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Punteggio & Statistiche</h2>
          <div className="space-y-2 text-xs text-gray-600">
            <p><strong>Score serie:</strong> n. di palle che atterrano nella zona target (0–10).</p>
            <p><strong>Media (Ave):</strong> media degli score di tutte le serie per quel colpo.</p>
            <p><strong>Dev. Std (Dev):</strong> consistenza — più bassa = più regolare.</p>
            <p><strong>Radar Area:</strong> area del poligono radar a 6 assi (Servizio · FH · Combined · Return · BH · Volley). Ideale = 259.8.</p>
            <p><strong>% Ideale:</strong> rapporto tra area radar ottenuta e area ideale (tutti 10).</p>
            <p><strong>Precision–Time:</strong> curva di progressione in 10 punti che combina FH, BH e Combined.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
