export type Category = 'terza' | 'seconda' | 'prima' | 'u10_u12';

/** forehand / backhand = single-stroke modules ("Solo dritto" / "Solo rovescio") */
export type TestType =
  | 'groundstrokes' | 'forehand' | 'backhand' | 'insideout' | 'combined' | 'return' | 'serve' | 'volley'
  // Special strokes (families: fondo, rete, sensibilità)
  | 'slice' | 'putaway' | 'approach' | 'smash_volo' | 'smash_rimbalzo' | 'dropshot';

/** Direction chosen for a whole single-stroke module */
export type StrokeDirection = 'cross' | 'line';

export type Direction =
  | 'fh_cross'
  | 'bh_cross'
  | 'fh_line'
  | 'bh_line'
  | 'io_cross'  // sventaglio inside-out (toward the opponent's backhand)
  | 'io_line'   // sventaglio inside-in (down the line, toward the opponent's forehand)
  | 'lungolinea'
  | 'diagonale'
  | 'right'
  | 'left'
  | 'fh_volley'
  | 'bh_volley'
  // Smorzata: forehand / backhand alternated, crosscourt or down the line
  | 'ds_fh_cross' | 'ds_bh_cross' | 'ds_fh_line' | 'ds_bh_line'
  // Attacco e volée: approach down the line + crosscourt volley, or the opposite
  | 'ap_fh_line' | 'ap_bh_line' | 'ap_fh_cross' | 'ap_bh_cross'
  // Back (slice)
  | 'sl_fh_cross' | 'sl_fh_line' | 'sl_bh_cross' | 'sl_bh_line'
  // Dritto di chiusura
  | 'pa_cross' | 'pa_line'
  // Smash: toward the forehand or the backhand zone
  | 'sm_fh' | 'sm_bh';

export type ServeType = 'prima' | 'seconda';

export type TargetStrip = 'T' | 'body' | 'wide';

/** Base strokes (general radar): serve, forehand, combined, return, backhand, volley. The others are shown only when tested. */
export type StrokeName =
  | 'serve' | 'forehand' | 'insideout' | 'combined' | 'return' | 'backhand' | 'volley'
  | 'slice' | 'putaway' | 'approach' | 'smash_volo' | 'smash_rimbalzo' | 'dropshot';

export type StdDevMode = 'sample' | 'population';

export type PrecisionTimeStrategy = 'A' | 'B';

/** How the overall % is computed: radar area (quadratic) or simple mean (linear) */
export type ScoreScale = 'radar' | 'linear';

// ─── Player Profile ──────────────────────────────────────────────────────────

export interface InitialAssessment {
  serve?: number;       // 1–5 stars
  forehand?: number;
  backhand?: number;
  volley?: number;
  return?: number;
  combined?: number;
  movement?: number;
  coachNotes?: string;
  assessmentDate?: string;
}

export interface PlayerProfile {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  // Optional
  phone?: string;
  email?: string;
  parentName?: string;
  club?: string;
  fitRanking?: string;
  coachName?: string;
  notes?: string;
  initialAssessment?: InitialAssessment;
  autoCreated?: boolean;   // true for profiles auto-generated from quick tests
  createdAt: string;
  updatedAt: string;
}

// ─── Legacy minimal player ───────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  createdAt: string;
}

export interface SeriesResult {
  testType: TestType;
  seriesIndex: number;
  score: number; // 0–10
  direction?: Direction;
  serveType?: ServeType;
  targetStrip?: TargetStrip;
  side?: 'right' | 'left';
}

export interface TestSession {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  category: Category;
  coach: string;
  dateOfBirth?: string;
  note?: string;
  completed: boolean;
  createdAt: string;
  series: SeriesResult[];
  selectedModules?: TestType[];
  /** Modules planned at the start, when the test was closed before doing all of them */
  plannedModules?: TestType[];
  challengeId?: string;   // groups sessions belonging to the same challenge
  /** Target zones used in this test (snapshot). Missing on tests made before zones existed = standard. */
  zones?: SessionZones;
}

// ─── Target zones ────────────────────────────────────────────────────────────

/**
 * Zone measures in metres, as in the protocol slides.
 * Groundstroke zone = back corner of the court; its inner edges are at `fromCenter` metres
 * from the centre line and `fromService` metres behind the service line (bigger = smaller zone).
 * Volley = width of the strip along the sideline; serve = width of each target strip.
 */
export interface ZoneMeasures {
  gsFromCenter: number;
  gsFromService: number;
  volley: number;
  serve: number;
  /**
   * Smorzata: side of the square at the net (from 30 cm), next to the alley.
   * Zones saved before it existed don't have it: read them with withDropshot().
   */
  dropshot: number;
}

export type ZoneCategory = Exclude<Category, 'u10_u12'>;

export interface SessionZones {
  /** Level the zones start from (a category) */
  level: Category;
  /** null for U10/U12 level (even/odd areas, no measures) */
  measures: ZoneMeasures | null;
  /** true when identical to the academy defaults of the player's category at test time */
  standard: boolean;
}

export interface ZoneChangeLogEntry {
  at: string;
  by: string;
  category: ZoneCategory;
  before: ZoneMeasures;
  after: ZoneMeasures;
}

export interface StrokeStats {
  stroke: StrokeName;
  label: string;
  scores: number[];
  ave: number;
  dev: number;
  /** Number of series scored exactly 10/10 */
  perfectCount: number;
  /** Minimum perfect series needed to pass (50% of total series) */
  passThreshold: number;
}

export interface PrecisionTimePoint {
  index: number;
  fh: number;
  bh: number;
  combined: number;
  mean: number;
}

export interface SessionResults {
  session: TestSession;
  stats: StrokeStats[];
  radarValues: number[];
  radarArea: number;
  percentOfIdeal: number;
  precisionTime: PrecisionTimePoint[];
}

export interface AppSettings {
  stdDevMode: StdDevMode;
  precisionTimeStrategy: PrecisionTimeStrategy;
  scoreScale: ScoreScale;
  /** Killer: default number of consecutive balls to complete the test */
  killerTarget: number;
  /** Killer: default court restriction for each stroke */
  killerZone: KillerZone;
  /** Killer: default depth restriction */
  killerDepth: KillerDepth;
  /**
   * Objectives: average score (0–10, on every tested stroke) needed in a category
   * to be considered ready for the next one. Converted to % with the chosen scale.
   */
  promotionTargets: Record<Category, number>;
  /** Objectives: how many consecutive tests at or above target are required */
  promotionConsecutive: number;
  /** Academy default zones per category (editable by admin and coaches) */
  zoneDefaults: Record<ZoneCategory, ZoneMeasures>;
  /** Who changed the default zones and when (latest first, capped) */
  zoneLog: ZoneChangeLogEntry[];
  /** Rankings, objectives and group comparison also count tests with custom zones */
  includeCustomZones: boolean;
  /** Match Test: balls the player must put in the zone to win */
  matchPlayerTarget: number;
  /** Match Test: points the court needs to win (handicap), per category */
  matchCourtTargets: Record<Category, number>;
  /** Game simulation of a test: minimum series score that wins the point, per category */
  matchGameThresholds: Record<Category, number>;
}

// ─── Match Test ("Mezzogiorno" race) ─────────────────────────────────────────

export type MatchStationId =
  | 'fh_cross' | 'bh_cross' | 'fh_line' | 'bh_line'
  | 'io_cross' | 'io_line'
  | 'volley_fh' | 'volley_bh'
  | 'return_r' | 'return_l';

export interface MatchSeries {
  station: MatchStationId;
  testType: TestType;
  direction: Direction;
  score: number;
}

export type MatchResult = 'in_corso' | 'vinto' | 'perso' | 'interrotto';

/** How the court target was chosen */
export type MatchTargetMode = 'categoria' | 'storico' | 'manuale';

export interface MatchSession {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  category: Category;
  coach: string;
  note?: string;
  playerTarget: number;
  courtTarget: number;
  targetMode: MatchTargetMode;
  /** Win probability estimated at the start (0–1), from the player's history */
  expectedWin?: number;
  /** Strokes fed, in rotation */
  stations: MatchStationId[];
  series: MatchSeries[];
  result: MatchResult;
  createdAt: string;
  updatedAt: string;
}

// ─── Killer test ─────────────────────────────────────────────────────────────

/** Where the ball must land, by stroke */
export type KillerZone = 'libera' | 'pari_dispari';
/** How deep the ball must land */
export type KillerDepth = 'libera' | 'oltre_servizio';

/**
 * One run of the Killer test, from a (re)start until an error or the target.
 * Ball order inside a run is fixed: 1 = forehand, 2 = backhand, 3 = forehand…
 */
export interface KillerAttempt {
  /** Consecutive good balls in this run */
  balls: number;
  /** Stroke of the missed ball (ball number balls+1); null if the run did not end with an error */
  errorStroke: 'fh' | 'bh' | null;
  /** Active playing time of this run (clock stopped while picking up balls) */
  playMs: number;
  /** Time spent picking up balls after this run's error */
  pickupMs: number;
}

export interface KillerSession {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  category: Category;
  coach: string;
  /** Consecutive balls required to finish */
  target: number;
  zone: KillerZone;
  depth: KillerDepth;
  note?: string;
  /** true when a run reached the target; false when the coach stopped the test early */
  completed: boolean;
  attempts: KillerAttempt[];
  createdAt: string;
}

export interface AppState {
  players: Player[];
  playerProfiles: PlayerProfile[];
  sessions: TestSession[];
  settings: AppSettings;
}

// Wizard working state — multi-player
export interface WizardPlayerData {
  id: string;
  profileId?: string;   // linked PlayerProfile.id
  name: string;
  category: Category;
  dateOfBirth?: string;
  note?: string;
  series: SeriesResult[];
  /** Custom zones chosen for this player; undefined = defaults of the player's category */
  zones?: SessionZones;
}

export interface WizardState {
  step: number;
  date: string;
  coach: string;
  playerCount: 1 | 2 | 3 | 4;
  players: WizardPlayerData[];
  challengeMode: 'none' | '1v1' | '2v2' | 'ffa';
  selectedModules: TestType[];
  /** Direction of the single-stroke modules, chosen for the whole test */
  /** Option chosen for each configurable module (direction, side, pattern…), whole test */
  strokeDirections: Partial<Record<string, string>>;
  challengeId?: string;       // generated at start for challenge sessions
  draftSessionIds?: string[]; // existing session IDs to update on resume
}
