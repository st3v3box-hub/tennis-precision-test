# 🎾 Tennis Precision Test

Web app Gladiators Training per il **Protocollo di Test di Precisione Tennis**: inserimento dati guidato (wizard), statistiche, grafici, classifica, sfide e storico sessioni.

---

## Stack

| Layer | Tecnologia |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| Routing | React Router 6 (HashRouter) |
| Dati | Firebase Firestore (sincronizzati tra dispositivi) |
| Accesso | Account admin / maestro / genitore (vedi "Sicurezza") |
| Test | Vitest |

I dati sono salvati su **Firebase Firestore** (progetto `tennis-precision-test`).
Il deploy avviene in automatico su **GitHub Pages** a ogni push sul branch `main` (`.github/workflows/deploy.yml`).

> ⚠️ **Sicurezza — da completare.** Oggi l'app entra in Firebase come utente anonimo e il
> controllo di account e ruoli avviene solo nel browser. Le regole Firestore non sono nel
> repository. Prima di usarla con dati di persone esterne va migrata a Firebase Authentication
> con regole Firestore basate sui ruoli.

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
│   ├── firebase.ts         # Connessione Firestore
│   ├── auth.ts             # Account e ruoli
│   ├── storage.ts          # Lettura dati locali legacy (migrazione una tantum)
│   └── export.ts           # CSV export (sessione + storico)
├── components/
│   ├── ui/                 # ScoreInput, Button, Card, ProgressSteps
│   ├── wizard/             # WizardContainer + 6 step + StepReview
│   ├── charts/             # RadarSpider, SeriesLine, PrecisionTimeChart, ServeChart
│   ├── results/            # ResultsDashboard, StatsTable
│   └── history/            # HistoryList (confronto + delete + export)
└── pages/                  # HomePage, NewSessionPage, SessionResultsPage, CompareSessionsPage, SettingsPage
tests/
├── formulas.test.ts        # Unit test formule + protocollo
└── fixes.test.ts           # % ideale su test parziali, scala lineare, strategia B
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
Calcolato solo sui moduli eseguiti (test parziali inclusi). Scala scelta in Impostazioni:

**Area del radar** (default) — cresce al quadrato, premia la completezza:
```
% = radarArea(valori) / radarArea(tutti 10) × 100  =  Σ(r_i × r_{i+1}) / n   (ciclico)
```
La forma Σ/n vale anche con 1 o 2 moduli, così il risultato è confrontabile:
tutti i colpi a 7 → 49% con 1, 2, 3 o 6 moduli.

**Media lineare**:
```
% = media(valori) / 10 × 100        (tutti a 7 → 70%)
```

### Precision–Time
**Strategia A** (default, 10 punti):
```
punto_i = mean(FH_i, BH_i, Combined_i)   per i = 0..9
```
dove `FH_i` = i-esima serie FH dei groundstrokes, `BH_i` = i-esima BH, `Combined_i` = i-esima combined.

**Strategia B** (5 punti, ogni serie usata una sola volta):
```
punto_k = mean(mean(FH_{2k}, FH_{2k+1}), mean(BH_{2k}, BH_{2k+1}), mean(C_{2k}, C_{2k+1}))   per k = 0..4
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
