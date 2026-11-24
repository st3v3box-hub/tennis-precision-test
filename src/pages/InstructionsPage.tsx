import { serveStripsFor } from '../lib/zones';
import { useAppData } from '../contexts/AppDataContext';
import { CourtZones, ALL_ZONES } from '../components/brand/CourtZones';
import React, { useState } from 'react';
import { CATEGORY_OPTIONS, FAMILY_META, FAMILY_ORDER, MODULE_FAMILY, MODULE_LABELS, MODULE_STEP_ORDER } from '../lib/protocol';
import { targetPercent } from '../lib/objectives';
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
    accentClass: 'border-brand-500 text-brand-700 bg-brand-50',
    zones: {
      groundstroke: { width: '1 m dalla centrale', depth: '1 m dal servizio' },
      volley: 'striscia 1,5 m',
      serve: '2 strisce da 2,06 m',
    },
    level: 'Principiante avanzato',
    levelDesc: 'Zone più ampie — focus sulla consistenza',
  },
  seconda: {
    image: './images/court-seconda.png',
    accentClass: 'border-yellow-500 text-yellow-700 bg-yellow-50',
    zones: {
      groundstroke: { width: '1,5 m dalla centrale', depth: '2 m dal servizio' },
      volley: 'striscia 1,2 m',
      serve: '3 strisce da 1,2 m',
    },
    level: 'Giocatore competitivo',
    levelDesc: 'Zone intermedie — precisione e continuità',
  },
  prima: {
    image: './images/court-prima.png',
    accentClass: 'border-red-500 text-red-700 bg-red-50',
    zones: {
      groundstroke: { width: '2 m dalla centrale', depth: '3 m dal servizio' },
      volley: 'striscia 0,7 m',
      serve: '3 strisce da 0,7 m',
    },
    level: 'Agonista',
    levelDesc: 'Zone precise — elevata efficienza tecnica',
  },
};

const PROTOCOL_ROWS = [
  { test: 'Groundstrokes', series: 20, balls: 10, soglia: '10/20', pattern: 'FH Incrociato / BH Incrociato (alternati) · 10 perfette in totale' },
  { test: 'Solo dritto', series: 20, balls: 10, soglia: '10/20', pattern: 'Solo dritto, incrociato o lungolinea (scelto per tutto il test)' },
  { test: 'Solo rovescio', series: 20, balls: 10, soglia: '10/20', pattern: 'Solo rovescio, incrociato o lungolinea (scelto per tutto il test)' },
  { test: 'Sventaglio di dritto', series: 20, balls: 10, soglia: '10/20', pattern: 'Palla sul rovescio, gira intorno e colpisce di dritto: inside-out (sul rovescio avversario) o inside-in (lungolinea, sul dritto)' },
  { test: 'Back (slice)', series: 20, balls: 10, soglia: '10/20', pattern: 'Back di dritto o di rovescio, incrociato o lungolinea (scelto per tutto il test). Zona di fondo campo' },
  { test: 'Dritto di chiusura', series: 20, balls: 10, soglia: '10/20', pattern: 'Palla corta e alta da chiudere di dritto, incrociato o lungolinea. Zona di fondo campo' },
  { test: 'Combined', series: 10, balls: 10, soglia: '5/10', pattern: 'Lungolinea / Diagonale (alternati)' },
  { test: 'Return', series: 10, balls: 10, soglia: '5/10', pattern: 'Da Destra (deuce) / Da Sinistra (ad) (alternati)' },
  { test: 'Servizio', series: 6, balls: 10, soglia: '3/6', pattern: '1ª Destra / 2ª Sinistra (alternati) + striscia target' },
  { test: 'Volley', series: 10, balls: 10, soglia: '5/10', pattern: 'Volée di dritto e di rovescio alternate (protocollo), oppure solo dritto o solo rovescio' },
  { test: 'Attacco e volée', series: 20, balls: 10, soglia: '10/20', pattern: '5 coppie per serie, dritto e rovescio alternati: attacco lungolinea + volée incrociata, o attacco incrociato + volée lungolinea. La coppia vale solo se entrano tutti e due i colpi; perfetta = 5 coppie su 5' },
  { test: 'Smash al volo', series: 20, balls: 10, soglia: '10/20', pattern: 'Nella zona del dritto o del rovescio (angolo di fondo)' },
  { test: 'Smash a rimbalzo', series: 20, balls: 10, soglia: '10/20', pattern: 'Nella zona del dritto o del rovescio (angolo di fondo)' },
  { test: 'Smorzata', series: 20, balls: 10, soglia: '10/20', pattern: 'Dritto e rovescio alternati, incrociata o lungolinea, nel quadrato vicino alla rete e al corridoio' },
];

const EXAMPLES = [
  {
    label: 'Professionista',
    color: 'green',
    desc: 'Tutte le serie perfette: chiude il modulo nel minor numero di serie possibile. Media altissima, deviazione minima.',
    badge: '5 in 5 ✓',
    badgeColor: 'bg-brand-100 text-brand-700',
  },
  {
    label: 'Giocatore solido',
    color: 'yellow',
    desc: 'Arriva a 5 perfette dopo 7–8 serie: supera la soglia con qualche errore lungo la strada.',
    badge: '5 in 8 ✓',
    badgeColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    label: 'In miglioramento',
    color: 'orange',
    desc: 'Trova la quinta perfetta solo all\'ultima serie disponibile. Superato di misura.',
    badge: '5 in 10 ✓',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    label: 'Test fallito',
    color: 'red',
    desc: 'Finisce le 10 serie con meno di 5 perfette. La zona non viene centrata con sufficiente continuità.',
    badge: '3 in 10 ✗',
    badgeColor: 'bg-red-100 text-red-600',
  },
];

// ─── Page building blocks ────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'panoramica', label: 'Le prove' },
  { id: 'serie', label: 'La serie' },
  { id: 'mentale', label: 'Mentale' },
  { id: 'moduli', label: 'Moduli e soglie' },
  { id: 'fare-test', label: 'Fare un test' },
  { id: 'zone', label: 'Zone' },
  { id: 'risultati', label: 'Risultati' },
  { id: 'giocatore', label: 'Scheda giocatore' },
  { id: 'classifiche', label: 'Classifiche e sfide' },
  { id: 'killer', label: 'Killer' },
  { id: 'match', label: 'Match Test' },
  { id: 'app', label: 'Telefono e accessi' },
] as const;

const Section: React.FC<{ id: string; title: string; intro?: string; children: React.ReactNode }> = ({ id, title, intro, children }) => (
  <section id={id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 scroll-mt-20">
    <h2 className="font-display font-bold text-xl text-ink leading-tight">{title}</h2>
    {intro && <p className="text-sm text-gray-600 mt-1">{intro}</p>}
    <div className="mt-3 text-sm text-gray-700 space-y-3">{children}</div>
  </section>
);

const Steps: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ol className="space-y-2.5">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">{i + 1}</span>
        <div className="min-w-0 pt-0.5">{it}</div>
      </li>
    ))}
  </ol>
);

const Term: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <div className="flex gap-3">
    <span className="flex-shrink-0 font-bold text-ink w-24">{name}</span>
    <p className="min-w-0">{children}</p>
  </div>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-xl bg-chalk/70 px-3 py-2 text-xs text-brand-900">{children}</p>
);

// ─── Page ────────────────────────────────────────────────────────────────────

export const InstructionsPage: React.FC = () => {
  const { settings } = useAppData();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('seconda');

  const staticData = CATEGORY_DATA[activeCategory];
  // Zone measures follow the academy defaults set in Settings
  const data = activeCategory === 'u10_u12' ? staticData : (() => {
    const z = settings.zoneDefaults[activeCategory];
    const f = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 });
    return {
      ...staticData,
      zones: {
        groundstroke: { width: `${f(z.gsFromCenter)} m dalla centrale`, depth: `${f(z.gsFromService)} m dal servizio` },
        volley: `striscia ${f(z.volley)} m`,
        serve: `${serveStripsFor(activeCategory)} strisce da ${f(z.serve)} m`,
      },
    };
  })();

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const pct = (avg: number) => Math.round(targetPercent(avg, settings.scoreScale));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-xl" aria-label="Indietro">←</button>
        <h1 className="text-lg font-bold text-gray-900">Istruzioni</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Intro + index */}
        <div className="bg-pitch rounded-2xl p-5 text-white">
          <p className="font-display font-bold text-ball text-lg">Gladiators Precision Test</p>
          <p className="text-sm leading-relaxed text-chalk/90 mt-1">
            Misura <strong className="text-white">precisione e continuità</strong> dei colpi, e come il giocatore regge la pressione.
            Qui trovi tutto il sistema: le prove, come si fanno in campo, come leggere i risultati.
          </p>
          <nav className="flex flex-wrap gap-1.5 mt-4" aria-label="Indice">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => go(s.id)}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold">
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        <Section id="panoramica" title="Le prove" intro="Quattro modi di misurare un giocatore, tutti con le stesse zone bersaglio.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { t: 'Test di precisione', d: 'Il protocollo completo o solo alcuni moduli: serie da 10 palle nella zona. Dà radar, % ideale, esito per modulo.' },
              { t: 'Killer', d: `${settings.killerTarget} palle di fila, dritto e rovescio alternati. All'errore si riparte da zero. Misura consistenza e pazienza.` },
              { t: 'Match Test', d: `Il giocatore contro il campo: ${settings.matchPlayerTarget} palle nella zona prima che il campo faccia i suoi punti. Misura la tenuta sotto pressione.` },
              { t: 'Match simulato', d: 'Non si gioca: è la lettura di un test di precisione come se fosse una partita a game contro un avversario immaginario.' },
            ].map(x => (
              <div key={x.t} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="font-bold text-ink">{x.t}</p>
                <p className="text-xs text-gray-600 mt-0.5">{x.d}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="serie" title="Come funziona una serie">
          <Steps items={[
            <>Il maestro alimenta <strong>10 palle consecutive</strong> dal cesto.</>,
            <>Ogni palla che cade nella <strong>zona bersaglio</strong> della categoria vale 1 punto: lo score della serie va da 0 a 10.</>,
            <>Una serie è <strong>perfetta</strong> solo con <strong>10/10</strong>. Anche 9/10 non conta come perfetta.</>,
          ]} />
        </Section>

        {/* Mental, physical and character dimension */}
        <section id="mentale" className="bg-pitch rounded-2xl p-5 text-white space-y-4 scroll-mt-20">
          <h2 className="font-display font-bold text-xl">Il test è mentale, fisico e caratteriale</h2>
          <p className="text-sm leading-relaxed text-gray-100">
            La precisione è solo la superficie. Eseguito al ritmo corretto — quello di uno <strong>scambio reale di torneo</strong>, senza pause tra una palla e l'altra — il test diventa uno degli strumenti più rivelatori che un maestro possa usare.
          </p>
          <div className="space-y-3">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-bold text-white mb-1">La penalizzazione naturale dell'errore</p>
              <p className="text-sm text-gray-200 leading-relaxed">
                Ogni errore ha una conseguenza immediata: <strong>allunga il test</strong>. Chi sbaglia deve continuare a colpire per raggiungere la soglia di serie perfette, accumulando fatica e pressione.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-ok-500/20 border border-ok-400/30 rounded-lg p-2.5">
                  <p className="font-bold text-ok-300 mb-1">Giocatore lucido</p>
                  <p className="text-ok-200">10 perfette nelle prime 10 serie → chiude subito, minimo sforzo.</p>
                </div>
                <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-2.5">
                  <p className="font-bold text-red-300 mb-1">Giocatore sotto pressione</p>
                  <p className="text-red-200">Arriva a 14, 16, 20 serie → più tempo in campo, più fatica, frustrazione crescente.</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-bold text-white mb-1">Perché il ritmo è tutto</p>
              <p className="text-sm text-gray-200 leading-relaxed">
                Con palle lente o pause il test perde valore. Serve <strong>ritmo da scambio di torneo, senza interruzioni</strong>: è lì che emergono le differenze vere. Chi colpisce con consapevolezza regge; chi si affida solo alla memoria muscolare crolla quando la pressione sale.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-bold text-white mb-1">La spirale frustrazione → errore</p>
              <p className="text-sm text-gray-200 leading-relaxed">
                Il 9/10 che non conta è frustrante come un nastro in partita. La reazione a questa frustrazione è <strong>lo specchio del carattere</strong>: chi resta calmo supera la soglia in poche serie extra; chi si innervosisce entra nella spirale errore → frustrazione → errore, e i dati lo registrano.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-bold text-white mb-1">Cosa leggere nel risultato</p>
              <p className="text-sm text-gray-200 leading-relaxed">
                Il rapporto tra serie giocate e serie perfette è un <strong>indicatore di maturità agonistica</strong>. Chi chiude in 10 serie è stabile oltre che preciso. Chi ne usa 18 o 20 ha un problema nella gestione dell'errore — ed è esattamente il lavoro da fare.
              </p>
            </div>
          </div>
        </section>

        <Section id="moduli" title="Moduli e soglie"
          intro="Un modulo è superato con almeno metà delle serie perfette (10/10), in qualsiasi posizione: non devono essere consecutive. Appena raggiunta la soglia si può passare al modulo successivo.">
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Modulo</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">Serie</th>
                  <th className="text-center px-2 py-2 text-gray-600 font-semibold">Perfette</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold hidden sm:table-cell">Come</th>
                </tr>
              </thead>
              <tbody>
                {PROTOCOL_ROWS.map(row => (
                  <tr key={row.test} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-3 py-2 font-semibold text-gray-800">
                      {row.test}
                      <span className="block sm:hidden font-normal text-gray-500 mt-0.5">{row.pattern}</span>
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-brand-700">{row.series}</td>
                    <td className="px-2 py-2 text-center">
                      <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full whitespace-nowrap">{row.soglia}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{row.pattern}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Il protocollo completo (Groundstrokes, Combined, Return, Servizio, Volley) è di 56 serie, 560 palle.
            Solo dritto e Solo rovescio sostituiscono i Groundstrokes: non si fanno nello stesso test.
            Tutti gli altri moduli si abbinano liberamente.
          </p>
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="font-semibold text-ink mb-2">Le famiglie di colpi</p>
            <p className="text-xs text-gray-600 mb-2">Quando scegli i moduli, ogni famiglia ha il suo colore. Gli stessi colori tornano nei grafici.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FAMILY_ORDER.map(f => (
                <div key={f} className={`rounded-lg px-2.5 py-1.5 text-xs ${FAMILY_META[f].soft}`}>
                  <p className="font-bold flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${FAMILY_META[f].dot}`} aria-hidden />{FAMILY_META[f].label}</p>
                  <p className="opacity-80">{MODULE_STEP_ORDER.filter(m => MODULE_FAMILY[m] === f).map(m => MODULE_LABELS[m]).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-ink">Esempi su un modulo da 10 serie (soglia 5 perfette)</p>
            {EXAMPLES.map(ex => (
              <div key={ex.label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${ex.badgeColor}`}>{ex.badge}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800 mb-0.5">{ex.label}</p>
                  <p className="text-xs text-gray-500">{ex.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="font-bold text-amber-800 text-sm">Regola della striscia al servizio</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Per ogni serie di servizio si sceglie la striscia (T · corpo · esterno). Dopo 2 scelte uguali di fila, la terza deve essere diversa.
            </p>
          </div>
        </Section>

        <Section id="fare-test" title="Fare un test, passo per passo">
          <Steps items={[
            <><strong>Home → Nuovo test.</strong> Scegli la data, il maestro e quanti giocatori (fino a 4 nella stessa sessione). Cerca il giocatore in anagrafica: se è nuovo, il profilo si crea da solo al salvataggio.</>,
            <><strong>Scegli i moduli</strong>, divisi per famiglia e colore. Per i moduli con una scelta (direzione, dritto o rovescio, schema dell'attacco, zona dello smash) la scelta compare sotto il modulo e vale per tutto il test.</>,
            <><strong>Zone.</strong> Di base valgono quelle della categoria. Per un giocatore puoi renderle più facili o più difficili (vedi Zone).</>,
            <><strong>Inserisci ogni serie</strong> toccando il numero di palle dentro (0–10). In alto vedi le serie perfette fatte e quelle che mancano alla soglia; sotto, il <em>match simulato</em> si aggiorna a ogni serie.</>,
            <><strong>Fine modulo.</strong> Quando la soglia è raggiunta o le serie sono finite, scegli <em>Continua con il modulo successivo</em> oppure <em>Termina e salva</em>.</>,
            <><strong>Revisione e salvataggio.</strong> Controlla le serie e salva: si apre la pagina dei risultati.</>,
          ]} />
          <div className="rounded-xl border border-gray-200 p-3 space-y-1.5">
            <p className="font-bold text-ink">Se bisogna fermarsi (pioggia, buio, tempo finito)</p>
            <p><strong>Interrompi il test…</strong> offre due strade:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Chiudi e salva</strong>: il test si salva con i soli moduli giocati ed è <em>parziale</em>. Un modulo lasciato a metà risulta <em>interrotto</em>.</li>
              <li><strong>Sospendi</strong>: il test resta in bozza, segnato "in corso" nello storico, e con <em>Continua test</em> riparti da dove eri, anche un altro giorno.</li>
            </ul>
          </div>
        </Section>

        <Section id="zone" title="Zone bersaglio"
          intro="Ogni categoria ha le sue zone predefinite, impostate dall'amministratore nelle Impostazioni. Ogni test salva le zone usate, così i risultati restano confrontabili.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
                className={`py-2 px-2 rounded-xl border-2 text-xs font-bold transition-all ${activeCategory === cat.value ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                {cat.label}
              </button>
            ))}
          </div>
          {activeCategory === 'u10_u12' ? (
            <img src={data.image} alt="Schema campo U10/U12" className="w-full object-contain rounded-xl" />
          ) : (
            <div className="bg-pitch p-4 rounded-xl">
              <CourtZones measures={settings.zoneDefaults[activeCategory]} level={activeCategory} only={ALL_ZONES}
                className="w-full max-w-sm mx-auto block" title={`Zone ${activeCategory}`} />
              <p className="text-center text-xs text-chalk/80 mt-2">
                Le misure sono distanze dalle linee: più sono alte, più la zona è piccola. Volée e servizio: larghezza delle strisce.
              </p>
            </div>
          )}
          <div className={`rounded-xl border-2 p-3 ${data.accentClass}`}>
            <p className="text-xs font-bold mb-0.5">{data.level}</p>
            <p className="text-xs opacity-80">{data.levelDesc}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-gray-500 mb-1">Fondo campo</div>
              <div className="font-bold text-gray-800">{data.zones.groundstroke.width}</div>
              <div className="text-gray-500">{data.zones.groundstroke.depth}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-gray-500 mb-1">Volée</div>
              <div className="font-bold text-gray-800">{data.zones.volley}</div>
              <div className="text-gray-400 mt-1">dal bordo</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-gray-500 mb-1">Servizio</div>
              <div className="font-bold text-gray-800 leading-tight">{data.zones.serve}</div>
            </div>
          </div>
          {activeCategory !== 'u10_u12' && (
            <p className="text-xs text-gray-600">
              <strong>Smorzata:</strong> quadrato di {settings.zoneDefaults[activeCategory].dropshot.toLocaleString('it-IT')} m di lato, attaccato al corridoio, a partire da 30 cm dalla rete.
              Attacco e volée usano la zona di fondo per l'attacco e la striscia della volée; back, chiusura e smash la zona di fondo.
            </p>
          )}
          <div className="space-y-1.5">
            <p className="font-bold text-ink">Zone personalizzate</p>
            <p>Nel test, per ogni giocatore, puoi partire dalle zone di un'altra categoria, spostare il cursore <em>facile ↔ difficile</em> oppure scrivere le misure a mano. Il test viene segnato come <em>personalizzato</em>.</p>
            <p>Classifiche, obiettivi di categoria e confronto con il gruppo contano solo i test con zone standard, a meno di accendere l'interruttore nelle Impostazioni. La scheda del giocatore li mostra sempre, segnalati.</p>
          </div>
        </Section>

        <Section id="risultati" title="Leggere i risultati">
          <div className="space-y-2">
            <Term name="Esito">Per ogni modulo: superato, non superato o interrotto, con le serie perfette sulla soglia.</Term>
            <Term name="Ave">Media delle serie di quel colpo (0–10). Verde da 8, giallo da 5, rosso sotto 5.</Term>
            <Term name="Dev">Quanto variano le serie: più è bassa, più il giocatore è regolare.</Term>
            <Term name="10/10">Serie perfette sul totale giocato per quel colpo.</Term>
            <Term name="Radar">Il radar generale ha sempre i 6 colpi base: Servizio, Dritto, Combined, Risposta, Rovescio, Volée, così ogni test si confronta con tutti gli altri. I colpi non provati restano a zero, segnati "n.t.".</Term>
            <Term name="Famiglie">I colpi speciali hanno i loro grafici, nel colore della famiglia: Fondo (dritto, rovescio, sventaglio, back, chiusura), Rete (volée, attacco e volée, smash) e Sensibilità (smorzata). Con 3 colpi o più è un radar, altrimenti barre.</Term>
            <Term name="% ideale">Quanto il giocatore si avvicina a quello che fa 10 su tutto, calcolato su tutti i colpi provati, speciali compresi. Con la scala "area radar" cresce al quadrato (7/10 ovunque = 49%); con la scala lineare 7/10 = 70%. La scala si sceglie nelle Impostazioni.</Term>
            <Term name="Precision-T">Andamento di dritto, rovescio e combined durante la sessione: dice se la precisione cresce o cala man mano.</Term>
          </div>
          <div className="rounded-xl border border-gray-200 p-3 space-y-1.5">
            <p className="font-bold text-ink">Match simulato</p>
            <p>
              Ogni serie del test diventa un punto di una partita contro un avversario immaginario: è del giocatore se la serie arriva alla soglia della categoria, altrimenti dell'avversario.
              Game con punto secco sul 40-40, set a 6 con tie-break sul 6-6.
            </p>
            <p className="text-xs text-gray-500">
              Soglie attuali: {CATEGORY_OPTIONS.map(o => `${o.label} ${settings.matchGameThresholds[o.value]}/10`).join(' · ')}. Il punteggio si vede in diretta durante il test e nei risultati, con il parziale dopo ogni modulo.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-3 space-y-1.5">
            <p className="font-bold text-ink">PDF e file</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>PDF del test</strong> (nei risultati): esito, metriche, serie per serie, radar, zone e note del maestro, da mandare al giocatore o alla famiglia.</li>
              <li><strong>PDF del giocatore</strong> (nella scheda): l'andamento di tutti i test, l'obiettivo di categoria, Killer.</li>
              <li><strong>Export CSV</strong>: i dati grezzi del test, per un foglio di calcolo.</li>
            </ul>
            <p className="text-xs text-gray-500">Il PDF si crea con "Crea PDF" → stampa → "Salva come PDF".</p>
          </div>
        </Section>

        <Section id="giocatore" title="La scheda del giocatore">
          <div className="space-y-2">
            <Term name="Andamento">Tutti i test nel tempo, con i parziali e quelli a zone personalizzate segnalati.</Term>
            <Term name="Obiettivo">
              Quando è pronto per la categoria successiva: servono {settings.promotionConsecutive} test di fila superati e sopra l'obiettivo della sua categoria
              ({CATEGORY_OPTIONS.map(o => `${o.label} ${pct(settings.promotionTargets[o.value])}%`).join(' · ')}).
            </Term>
            <Term name="Gruppo">L'ultimo test confrontato con i giocatori della stessa categoria.</Term>
            <Term name="Killer e Match">Gli ultimi risultati, i migliori e il bilancio vinti/persi.</Term>
          </div>
        </Section>

        <Section id="classifiche" title="Classifiche e sfide">
          <p><strong>Classifiche</strong>: per categoria, con il filtro per circolo. I test parziali compaiono con l'etichetta "parziale". Contano solo i test con zone standard, salvo diversa impostazione.</p>
          <p><strong>Sfide</strong>: lo stesso test giocato insieme da più giocatori, 1 contro 1, 2 contro 2 o tutti contro tutti, con il confronto colpo per colpo alla fine. Si possono salvare a metà e riprendere.</p>
        </Section>

        <section id="killer" className="bg-pitch text-white rounded-2xl p-5 space-y-3 scroll-mt-20">
          <p className="text-sm font-display font-bold text-ball">Test Killer</p>
          <h2 className="text-lg font-black">Consistenza, pazienza, concentrazione</h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Il maestro alimenta palle semplici, senza peso: una di dritto e una di rovescio. All'errore il test si interrompe,
            il giocatore raccoglie le palle e si <strong className="text-white">riparte da zero</strong>. Il test finisce quando il
            giocatore completa tutte le palle di fila ({settings.killerTarget} di default, modificabile nelle Impostazioni o test per test).
            Si possono aggiungere vincoli: dritto nella metà del pari e rovescio in quella del dispari, oppure palle oltre la linea del servizio.
          </p>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="font-bold">In campo</p>
              <p className="text-neutral-300">Tocca lo schermo a ogni palla buona, oppure, all'errore, scrivi a che palla è successo. Dritto o rovescio si ricavano dal numero (dispari = dritto). Durante la raccolta il cronometro di gioco è fermo.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="font-bold">Indice Killer (0–100)</p>
              <p className="text-neutral-300">Palle utili diviso palle giocate. 100 = nessun errore. Un errore alla palla 90 costa molto più di un errore alla palla 5: è il prezzo della concentrazione persa. Calcolato solo sui test completati.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="font-bold">Cosa misura</p>
              <p className="text-neutral-300">Dove arrivano gli errori (partenza = tensione, seconda metà = calo di concentrazione, ultimo 10% = pressione), le ricadute subito dopo un errore, il lato che cede per primo, i tempi di gioco e di raccolta.</p>
            </div>
          </div>
        </section>

        <section id="match" className="bg-pitch text-white rounded-2xl p-5 space-y-3 scroll-mt-20">
          <p className="text-sm font-display font-bold text-ball">Match Test</p>
          <h2 className="text-lg font-black">Il giocatore contro il campo</h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Il giocatore deve mettere <strong className="text-white">{settings.matchPlayerTarget} palle</strong> nella zona.
            Ogni serie non perfetta (meno di 10/10) è un <strong className="text-white">punto per il campo</strong>. Vince chi arriva prima al traguardo.
            Le serie girano sui colpi scelti all'inizio (dritto, rovescio, sventaglio, volée, risposta) e si usano le zone della categoria.
          </p>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="font-bold">Il campo vince a… (l'handicap)</p>
              <p className="text-neutral-300">
                Più il traguardo del campo è basso, più il match è difficile. Tre modi per sceglierlo:
                il valore della categoria ({CATEGORY_OPTIONS.map(o => `${o.label} ${settings.matchCourtTargets[o.value]}`).join(' · ')});
                quello calcolato sullo <strong className="text-white">storico del giocatore</strong>, perché il match sia il più possibile alla pari;
                oppure un numero scelto dal maestro. Prima di iniziare l'app mostra la probabilità di vittoria e la durata stimata.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="font-bold">In campo</p>
              <p className="text-neutral-300">
                Dopo ogni serie tocca il numero di palle dentro. Il tabellone mostra palle del giocatore e punti del campo; il "match point" si accende quando a uno dei due manca un passo.
                Un tocco sbagliato si corregge con "Annulla ultima serie". Con "Pausa / Stop" il match si sospende (e si riprende dalla lista dei match) o si chiude come interrotto.
                Una serie dura circa un minuto e mezzo con il recupero: un match pari dura 15–20 minuti.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="font-bold">Il resoconto</p>
              <p className="text-neutral-300">
                Andamento serie dopo serie, perfette di fila, rendimento per colpo e, soprattutto, il <strong className="text-white">rendimento sotto pressione</strong>:
                la media delle serie giocate con il campo a 1 o 2 punti dalla vittoria, confrontata con il resto del match.
              </p>
            </div>
          </div>
        </section>

        <Section id="app" title="Telefono, rete e accessi">
          <p><strong>Installa l'app</strong>: dal browser del telefono scegli "Aggiungi a schermata Home". Si apre come un'app normale.</p>
          <p><strong>Senza rete</strong>: test, Killer e Match si possono fare anche senza connessione. I dati restano sul telefono e si inviano da soli quando torna la rete; l'indicatore in alto dice se c'è qualcosa in attesa. Lo schermo resta acceso durante Killer e Match.</p>
          <div className="space-y-2">
            <Term name="Amministratore">Tutto, più Impostazioni: zone, obiettivi, Killer, Match, account.</Term>
            <Term name="Maestro">Fa test, Killer e Match, gestisce i giocatori.</Term>
            <Term name="Genitore / allievo">Vede risultati, schede e classifiche.</Term>
          </div>
          <Note>I valori in questa pagina (zone, obiettivi, traguardi del Match) seguono le Impostazioni attuali dell'accademia.</Note>
        </Section>

      </div>
    </div>
  );
};
