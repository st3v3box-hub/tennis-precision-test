export type Category = 'terza' | 'seconda' | 'prima';

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
}

export interface StrokeStats {
  stroke: StrokeName;
  label: string;
  scores: number[];
  ave: number;
  dev: number;
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
}

export interface AppState {
  players: Player[];
  sessions: TestSession[];
  settings: AppSettings;
}

// Wizard working state — multi-player
export interface WizardPlayerData {
  id: string;
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
}
