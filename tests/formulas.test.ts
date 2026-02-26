import { describe, it, expect } from 'vitest';
import {
  mean,
  stdDev,
  radarArea,
  percentOfIdeal,
  IDEAL_AREA,
  IDEAL_RADAR_VALUES,
  computeStrokeStats,
  computePrecisionTime,
} from '../src/lib/formulas';
import type { TestSession } from '../src/types';
import {
  GROUNDSTROKES_SERIES,
  COMBINED_SERIES,
  RETURN_SERIES,
  SERVE_SERIES,
  VOLLEY_SERIES,
  isStripAllowed,
} from '../src/lib/protocol';

// ─── mean ────────────────────────────────────────────────────────────────────

describe('mean', () => {
  it('returns 0 for empty array', () => expect(mean([])).toBe(0));
  it('computes mean of single value', () => expect(mean([7])).toBe(7));
  it('computes mean of [2, 4, 6]', () => expect(mean([2, 4, 6])).toBe(4));
  it('computes mean of [0, 10, 5]', () => expect(mean([0, 10, 5])).toBeCloseTo(5));
});

// ─── stdDev ──────────────────────────────────────────────────────────────────

describe('stdDev', () => {
  it('returns 0 for single value', () => expect(stdDev([5])).toBe(0));
  it('returns 0 for empty array', () => expect(stdDev([])).toBe(0));

  it('computes sample stddev of [2, 4, 4, 4, 5, 5, 7, 9]', () => {
    // Population stddev = 2, sample stddev ≈ 2.138
    const result = stdDev([2, 4, 4, 4, 5, 5, 7, 9], 'sample');
    expect(result).toBeCloseTo(2.138, 2);
  });

  it('computes population stddev of [2, 4, 4, 4, 5, 5, 7, 9]', () => {
    const result = stdDev([2, 4, 4, 4, 5, 5, 7, 9], 'population');
    expect(result).toBeCloseTo(2.0, 1);
  });

  it('stddev of identical values is 0', () => {
    expect(stdDev([5, 5, 5, 5], 'sample')).toBe(0);
    expect(stdDev([5, 5, 5, 5], 'population')).toBe(0);
  });
});

// ─── radarArea ───────────────────────────────────────────────────────────────

describe('radarArea', () => {
  it('returns 0 for all-zero values', () => {
    expect(radarArea([0, 0, 0, 0, 0, 0])).toBe(0);
  });

  it('computes area of ideal hexagon (all 10)', () => {
    // A = 0.5 * 6 * 10 * 10 * sin(π/3) = 0.5 * 6 * 100 * (√3/2) = 150√3 ≈ 259.81
    const expected = 150 * Math.sqrt(3);
    expect(radarArea([10, 10, 10, 10, 10, 10])).toBeCloseTo(expected, 2);
  });

  it('IDEAL_AREA matches direct computation', () => {
    expect(IDEAL_AREA).toBeCloseTo(radarArea(IDEAL_RADAR_VALUES), 10);
  });

  it('area scales quadratically — halving all values → 1/4 area', () => {
    const full = radarArea([8, 8, 8, 8, 8, 8]);
    const half = radarArea([4, 4, 4, 4, 4, 4]);
    expect(half).toBeCloseTo(full / 4, 5);
  });
});

// ─── percentOfIdeal ──────────────────────────────────────────────────────────

describe('percentOfIdeal', () => {
  it('returns 100% for ideal values', () => {
    expect(percentOfIdeal([10, 10, 10, 10, 10, 10])).toBeCloseTo(100, 5);
  });

  it('returns 0% for zero values', () => {
    expect(percentOfIdeal([0, 0, 0, 0, 0, 0])).toBe(0);
  });

  it('returns 25% for all-5 values', () => {
    // area([5,...]) = (5/10)^2 * IDEAL_AREA = 0.25 * IDEAL_AREA
    expect(percentOfIdeal([5, 5, 5, 5, 5, 5])).toBeCloseTo(25, 4);
  });

  it('returns value between 0 and 100 for typical scores', () => {
    const pct = percentOfIdeal([7, 6, 8, 5, 6, 7]);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });
});

// ─── computeStrokeStats ──────────────────────────────────────────────────────

const buildSession = (): TestSession => {
  const series = [
    ...GROUNDSTROKES_SERIES.map((s, i) => ({
      testType: s.testType,
      seriesIndex: s.seriesIndex,
      score: s.direction === 'fh_cross' ? 7 : 6, // FH=7, BH=6
      direction: s.direction,
    })),
    ...COMBINED_SERIES.map(s => ({ testType: s.testType, seriesIndex: s.seriesIndex, score: 5, direction: s.direction })),
    ...RETURN_SERIES.map(s => ({ testType: s.testType, seriesIndex: s.seriesIndex, score: 4, direction: s.direction })),
    ...SERVE_SERIES.map(s => ({ testType: s.testType, seriesIndex: s.seriesIndex, score: 8, serveType: s.serveType, side: s.side, targetStrip: 'T' as const })),
    ...VOLLEY_SERIES.map(s => ({ testType: s.testType, seriesIndex: s.seriesIndex, score: 9, direction: s.direction })),
  ];

  return {
    id: 'test',
    playerId: 'p1',
    playerName: 'Test Player',
    date: '2025-01-01',
    category: 'seconda',
    coach: 'Coach',
    completed: true,
    createdAt: new Date().toISOString(),
    series,
  };
};

describe('computeStrokeStats', () => {
  const session = buildSession();
  const stats = computeStrokeStats(session, 'sample');

  it('returns 6 stroke stats in correct order', () => {
    expect(stats).toHaveLength(6);
    expect(stats.map(s => s.stroke)).toEqual([
      'serve', 'forehand', 'combined', 'return', 'backhand', 'volley',
    ]);
  });

  it('forehand average = 7', () => {
    const fh = stats.find(s => s.stroke === 'forehand')!;
    expect(fh.ave).toBe(7);
    expect(fh.dev).toBe(0);
  });

  it('backhand average = 6', () => {
    const bh = stats.find(s => s.stroke === 'backhand')!;
    expect(bh.ave).toBe(6);
  });

  it('serve average = 8', () => {
    expect(stats.find(s => s.stroke === 'serve')!.ave).toBe(8);
  });

  it('combined average = 5', () => {
    expect(stats.find(s => s.stroke === 'combined')!.ave).toBe(5);
  });

  it('return average = 4', () => {
    expect(stats.find(s => s.stroke === 'return')!.ave).toBe(4);
  });

  it('volley average = 9', () => {
    expect(stats.find(s => s.stroke === 'volley')!.ave).toBe(9);
  });
});

// ─── computePrecisionTime ────────────────────────────────────────────────────

describe('computePrecisionTime', () => {
  const session = buildSession();

  it('strategy A returns 10 points', () => {
    const pts = computePrecisionTime(session, 'A');
    expect(pts).toHaveLength(10);
  });

  it('each point has correct fields', () => {
    const pts = computePrecisionTime(session, 'A');
    const p = pts[0];
    expect(p).toHaveProperty('index', 1);
    expect(p).toHaveProperty('fh');
    expect(p).toHaveProperty('bh');
    expect(p).toHaveProperty('combined');
    expect(p).toHaveProperty('mean');
  });

  it('mean of each point = average(fh, bh, combined)', () => {
    const pts = computePrecisionTime(session, 'A');
    for (const p of pts) {
      expect(p.mean).toBeCloseTo(mean([p.fh, p.bh, p.combined]), 10);
    }
  });

  it('strategy A: fh=7, bh=6, combined=5 → mean=6', () => {
    const pts = computePrecisionTime(session, 'A');
    expect(pts[0].fh).toBe(7);
    expect(pts[0].bh).toBe(6);
    expect(pts[0].combined).toBe(5);
    expect(pts[0].mean).toBeCloseTo(6, 5);
  });
});

// ─── isStripAllowed ──────────────────────────────────────────────────────────

describe('isStripAllowed', () => {
  it('always allows first two choices', () => {
    expect(isStripAllowed([], 'T')).toBe(true);
    expect(isStripAllowed(['T'], 'T')).toBe(true);
    expect(isStripAllowed(['T'], 'body')).toBe(true);
  });

  it('blocks third consecutive same strip', () => {
    expect(isStripAllowed(['T', 'T'], 'T')).toBe(false);
    expect(isStripAllowed(['body', 'body'], 'body')).toBe(false);
    expect(isStripAllowed(['wide', 'wide'], 'wide')).toBe(false);
  });

  it('allows third if different', () => {
    expect(isStripAllowed(['T', 'T'], 'body')).toBe(true);
    expect(isStripAllowed(['T', 'T'], 'wide')).toBe(true);
    expect(isStripAllowed(['body', 'body'], 'T')).toBe(true);
  });

  it('allows same if previous two are different', () => {
    expect(isStripAllowed(['T', 'body'], 'T')).toBe(true);
    expect(isStripAllowed(['body', 'T'], 'T')).toBe(true);
  });

  it('only checks last two, ignores earlier history', () => {
    expect(isStripAllowed(['T', 'T', 'body', 'T', 'T'], 'T')).toBe(false);
    expect(isStripAllowed(['T', 'T', 'body', 'T', 'body'], 'T')).toBe(true);
  });
});

// ─── Protocol series counts ──────────────────────────────────────────────────

describe('protocol series counts', () => {
  it('groundstrokes: 20 series', () => expect(GROUNDSTROKES_SERIES).toHaveLength(20));
  it('combined: 10 series', () => expect(COMBINED_SERIES).toHaveLength(10));
  it('return: 10 series', () => expect(RETURN_SERIES).toHaveLength(10));
  it('serve: 6 series', () => expect(SERVE_SERIES).toHaveLength(6));
  it('volley: 10 series', () => expect(VOLLEY_SERIES).toHaveLength(10));

  it('groundstrokes alternates FH/BH correctly', () => {
    GROUNDSTROKES_SERIES.forEach((s, i) => {
      expect(s.direction).toBe(i % 2 === 0 ? 'fh_cross' : 'bh_cross');
    });
  });

  it('serve alternates 1ª/2ª and right/left correctly', () => {
    SERVE_SERIES.forEach((s, i) => {
      expect(s.serveType).toBe(i % 2 === 0 ? 'prima' : 'seconda');
      expect(s.side).toBe(i % 2 === 0 ? 'right' : 'left');
    });
  });
});
