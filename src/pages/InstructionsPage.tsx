import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '../types';

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'u10_u12', label: 'U10/U12', color: 'blue' },
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
  u10_u12: {
    image: './images/court-u10u12.png',
    accentClass: 'border-blue-500 text-blue-700 bg-blue-50',
    zones: {
      groundstroke: { width: 'Area PARI (rossa)', depth: 'Area DISPARI (verde)' },
      volley: 'Area PARI/DISPARI',
      serve: 'Area PARI/DISPARI',
    },
    level: 'Under 10 / Under 12',
    levelDesc: 'Zone colorate — PARI (rossa) = FH/Cross/Volee · DISPARI (verde) = Rovescio',
  },
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
  { test: 'Groundstrokes', series: 20, balls: 10, soglia: '10/20', pattern: 'FH Incrociato / BH Incrociato (alternati)' },
  { test: 'Combined', series: 10, balls: 10, soglia: '5/10', pattern: 'Lungolinea / Diagonale (alternati)' },
  { test: 'Return', series: 10, balls: 10, soglia: '5/10', pattern: 'Da Destra (deuce) / Da Sinistra (ad) (alternati)' },
  { test: 'Servizio', series: 6, balls: 10, soglia: '3/6', pattern: '1ª Destra / 2ª Sinistra (alternati) + striscia target' },
  { test: 'Volley', series: 10, balls: 10, soglia: '5/10', pattern: 'Volee FH / Volee BH (alternati)' },
];

const EXAMPLES = [
  {
    label: 'Professionista',
    color: 'green',
    desc: 'Completa 10 serie su 10 perfette in ogni modulo. Media altissima, deviazione minima.',
    badge: '10/10 ✓',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    label: 'Giocatore solido',
    color: 'yellow',
    desc: 'Ottiene 7–8 serie da 10/10 su 10 disponibili. Supera la soglia, ma con margine ridotto.',
    badge: '7/10 ✓',
    badgeColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    label: 'In miglioramento',
    color: 'orange',
    desc: 'Raggiunge esattamente la soglia minima (5/10 o 3/6). Test superato di misura.',
    badge: '5/10 ✓',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    label: 'Test fallito',
    color: 'red',
    desc: 'Meno della metà delle serie risultano perfette. La zona target non viene centrata con sufficiente continuità.',
    badge: '3/10 ✗',
    badgeColor: 'bg-red-100 text-red-600',
  },
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

        {/* Obiettivo */}
        <div className="bg-green-700 rounded-2xl p-5 text-white">
          <h2 className="text-sm font-bold uppercase tracking-wide opacity-80 mb-2">Obiettivo del Test</h2>
          <p className="text-sm leading-relaxed">
            Misurare la <strong>precisione e la continuità</strong> sui 5 colpi fondamentali del tennis.
            Non basta colpire la zona target una volta: bisogna dimostrare di poterlo fare in modo <em>sistematico</em>,
            raggiungendo almeno il <strong>50 % di serie perfette</strong> per ogni modulo.
          </p>
        </div>

        {/* Come funziona una serie */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Come funziona una serie</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">1</span>
              <p>Il coach alimenta il giocatore con <strong>10 palle consecutive</strong> nella stessa zona.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">2</span>
              <p>Il giocatore deve colpire la <strong>zona target</strong> (dimensioni diverse per categoria). Ogni palla che atterra nella zona vale 1 punto.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">3</span>
              <p>Lo <strong>score della serie</strong> è il numero di palle centrate: da 0 a 10.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs flex items-center justify-center">★</span>
              <p>Una serie è <strong>perfetta</strong> solo se il punteggio è esattamente <strong>10/10</strong>. Qualsiasi risultato inferiore (anche 9/10) non conta come serie superata.</p>
            </div>
          </div>
        </div>

        {/* Regola di completamento */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Regola di completamento (soglia 50 %)</h2>
          <p className="text-xs text-gray-500 mb-4">
            Per superare un modulo il giocatore deve ottenere almeno il 50 % di serie perfette (10/10), su qualsiasi posizione tra le serie disponibili — non devono essere consecutive.
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Modulo</th>
                  <th className="text-center px-3 py-2 text-gray-600 font-semibold">Serie tot.</th>
                  <th className="text-center px-3 py-2 text-gray-600 font-semibold">Soglia</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold hidden sm:table-cell">Alternanza</th>
                </tr>
              </thead>
              <tbody>
                {PROTOCOL_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-gray-800">{row.test}</td>
                    <td className="px-3 py-2 text-center font-bold text-green-700">{row.series}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{row.soglia}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{row.pattern}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Totale test completo: 56 serie · 560 palle
          </p>
        </div>

        {/* Esempi pratici */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Esempi pratici (modulo Groundstrokes, 10 serie)</h2>
          <div className="space-y-3">
            {EXAMPLES.map((ex, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${ex.badgeColor}`}>
                  {ex.badge}
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-800 mb-0.5">{ex.label}</p>
                  <p className="text-xs text-gray-500">{ex.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Come interpretare le statistiche */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Come interpretare le statistiche</h2>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold text-gray-800 w-20">Ave</span>
              <p>Media degli score di tutte le serie per quel colpo (0–10). Indica il livello medio di precisione.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold text-gray-800 w-20">Dev</span>
              <p>Deviazione standard degli score. Più bassa = più regolare. Un Dev alto segnala inconsistenza.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold text-gray-800 w-20">10/10</span>
              <p>Numero di serie perfette su totale disponibile. Il badge verde ✓ indica che la soglia è superata, rosso ✗ che non lo è.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold text-gray-800 w-20">Soglie</span>
              <p>Riepilogo moduli superati / moduli testati. Verde = tutti superati, giallo = metà, rosso = meno della metà.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold text-gray-800 w-20">% Ideale</span>
              <p>Percentuale dell'area radar rispetto all'area di un giocatore che ottiene 10 in tutti i colpi. Indica il potenziale globale.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold text-gray-800 w-20">Radar</span>
              <p>Poligono a 6 assi (Servizio · FH · Combined · Return · BH · Volley). Forma equilibrata = giocatore completo.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold text-gray-800 w-20">Precision–T</span>
              <p>Curva di progressione in 10 punti che combina FH, BH e Combined. Mostra se la precisione migliora durante la sessione.</p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500">
            <strong>Legenda colori Ave:</strong>
            {' '}<span className="text-green-600 font-bold">verde ≥ 8</span>,
            {' '}<span className="text-yellow-600 font-bold">giallo ≥ 5</span>,
            {' '}<span className="text-red-500 font-bold">rosso &lt; 5</span>
          </div>
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`py-2 px-2 rounded-xl border-2 text-xs font-bold transition-all
                    ${activeCategory === cat.value
                      ? cat.color === 'blue'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : cat.color === 'green'
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

      </div>
    </div>
  );
};
