# 🎾 Tennis Precision Test

Web app per la gestione del **Protocollo di Test di Precisione Tennis**: inserimento dati guidato (wizard), statistiche, grafici e storico sessioni.

---

## Stack

| Layer | Tecnologia |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| Routing | React Router 6 (HashRouter) |
| Storage | localStorage (JSON) |
| Test | Vitest |

**Nessun backend richiesto.** Tutti i dati sono locali al browser.

---

## Setup rapido

```bash
# 1. Installa dipendenze
cd tennis-precision-test
npm install

# 2. Avvia dev server
npm run dev
# → http://localhost:5173

# 3. Build produzione
npm run build
# output in ./dist/  (apribile anche come file locale: dist/index.html)

# 4. Test unità
npm test
```

---

## Struttura cartelle

```
src/
├── types/index.ts          # Tutti i tipi TypeScript
├── lib/
│   ├── formulas.ts         # mean, stdDev, radarArea, percentOfIdeal, computeSessionResults
│   ├── protocol.ts         # Definizioni serie, vincolo striscia, target categoria
│   ├── storage.ts          # CRUD localStorage
│   └── export.ts           # CSV export (sessione + storico)
├── components/
│   ├── ui/                 # ScoreInput, Button, Card, ProgressSteps
│   ├── wizard/             # WizardContainer + 6 step + StepReview
│   ├── charts/             # RadarSpider, SeriesLine, PrecisionTimeChart, ServeChart
│   ├── results/            # ResultsDashboard, StatsTable
│   └── history/            # HistoryList (confronto + delete + export)
└── pages/                  # HomePage, NewSessionPage, SessionResultsPage, CompareSessionsPage, SettingsPage
tests/
└── formulas.test.ts        # Unit test formule + protocollo
```

---

## Protocollo implementato

| Test | Serie | Palle/serie | Alternanza |
|------|-------|-------------|------------|
| Groundstrokes | 20 | 10 | FH incrociato / BH incrociato |
| Combined | 10 | 10 | Lungolinea / Diagonale |
| Return | 10 | 10 | Da destra / Da sinistra |
| Serve | 6 | 10 | 1ª-destra / 2ª-sinistra (+ striscia target) |
| Volley | 10 | 10 | Volee FH / Volee BH |

---

## Formule

### Media (Ave)
```
Ave = Σ(score_i) / n
```

### Deviazione standard (Dev)
```
# Campionaria (default)
Dev = sqrt( Σ(x_i - μ)² / (n-1) )

# Popolazione
Dev = sqrt( Σ(x_i - μ)² / n )
```
Configurabile in Impostazioni.

### Area Radar (poligono regolare n=6)
```
A = 0.5 × Σ(r_i × r_{i+1} × sin(2π/6))   per i = 0..5, ciclico
```
Con tutti r=10 → **Area ideale ≈ 259.81**

### % dell'ideale
```
% = (radarArea(valori) / radarArea([10,10,10,10,10,10])) × 100
```

### Precision–Time (10 punti)
**Strategia A** (default):
```
punto_i = mean(FH_i, BH_i, Combined_i)   per i = 0..9
```
dove `FH_i` = i-esima serie FH dei groundstrokes, `BH_i` = i-esima BH, `Combined_i` = i-esima combined.

**Strategia B**:
```
punto_i = mean(mean(FH_{2i}, FH_{2i+1}), mean(BH_{2i}, BH_{2i+1}), Combined_i)
```

### Vincolo striscia servizio
Dopo 2 scelte consecutive uguali, la terza deve essere diversa.
```typescript
isStripAllowed(['T', 'T'], 'T')    // → false
isStripAllowed(['T', 'T'], 'body') // → true
```

---

## Radar — ordine degli assi

| # | Stroke | Label |
|---|--------|-------|
| 0 | serve | Servizio |
| 1 | forehand | Forehand |
| 2 | combined | Combined |
| 3 | return | Return |
| 4 | backhand | Backhand |
| 5 | volley | Volley |

---

## Export CSV

- **Sessione singola**: bottone "Export CSV" nella pagina risultati
- **Storico completo**: bottone "Export Storico CSV" nella pagina Storico
- Il CSV include header, statistiche per stroke, area, % ideale e dati raw di ogni serie

---

## Confronto sessioni

1. Vai in **Storico**
2. Seleziona fino a 2 sessioni (bottone "Confronta")
3. Premi "Confronta" → la pagina risultati mostra radar sovrapposti

---

## Deploy

L'app è un SPA statica pura. Distribuisci la cartella `dist/` su qualsiasi hosting statico (Netlify, Vercel, GitHub Pages, server nginx).

```bash
npm run build
# serve ./dist/
```

Con HashRouter (`/#/`) funziona anche aprendo `dist/index.html` direttamente dal filesystem.

---

## Test

```bash
npm test          # run once
npm run test:watch  # watch mode
```

Copertura test:
- `mean`, `stdDev` (sample + population)
- `radarArea`, `percentOfIdeal`
- `computeStrokeStats` con sessione completa mock
- `computePrecisionTime` (strategia A)
- `isStripAllowed` con tutti i casi limite
- Conteggio serie e alternanza per ogni tipo di test
