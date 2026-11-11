export type Category = 'terza' | 'seconda' | 'prima' | 'u10_u12';

export type TestType = 'groundstrokes' | 'combined' | 'return' | 'serve' | 'volley';

export type Direction =
  | 'fh_cross'
  | 'bh_cross'
  | 'lungolinea'
  | 'diagonale'
  | 'right'
  | 'left'
  | 'fh_volley'
  | 'bh_volley';

export type ServeType = 'prima' | 'seconda';

export type TargetStrip = 'T' | 'body' | 'wide';

/** Order: serve, forehand, combined, return, backhand, volley — matches radar order */
export type StrokeName = 'serve' | 'forehand' | 'combined' | 'return' | 'backhand' | 'volley';

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
  challengeId?: string;   // groups sessions belonging to the same challenge
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
}

export interface WizardState {
  step: number;
  date: string;
  coach: string;
  playerCount: 1 | 2 | 3 | 4;
  players: WizardPlayerData[];
  challengeMode: 'none' | '1v1' | '2v2' | 'ffa';
  selectedModules: TestType[];
  challengeId?: string;       // generated at start for challenge sessions
  draftSessionIds?: string[]; // existing session IDs to update on resume
}
