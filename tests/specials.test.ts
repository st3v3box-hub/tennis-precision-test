import { describe, it, expect } from 'vitest';
import {
  OPTION_MODULES, MODULE_OPTIONS, MODULE_SERIES, MODULE_PASS, MODULE_STEP_ORDER, MODULE_FAMILY, MODULE_LABELS, WIZARD_STEPS,
  optionSeries, detectedOption, moduleDisplayName, modulePasses, isPairModule, DIRECTION_TEXT,
} from '../src/lib/protocol';
import {
  computeSessionResults, computeStrokeStats, visibleStats, familiesWithSpecials, familyAxes, strokeFamily, BASE_STROKES,
} from '../src/lib/formulas';
import { PROTOCOL_ZONES, withDropshot, sameMeasures, describeZones, clampMeasures, measuresAtDifficulty } from '../src/lib/zones';
import type { SeriesResult, TestSession, TestType } from '../src/types';

const sess = (series: SeriesResult[]): TestSession =>
  ({ id: 's', playerId: 'p', playerName: 'p', date: '2026-01-01', category: 'seconda', coach: 'c', completed: true, createdAt: '2026-01-01', series });
const play = (module: (typeof OPTION_MODULES)[number], option: string, scores: number[]): SeriesResult[] =>
  optionSeries(module, option).slice(0, scores.length).map((sp, i) => ({ testType: module, seriesIndex: sp.seriesIndex, direction: sp.direction, score: scores[i] }));

describe('new modules: protocol', () => {
  it('every module has a label, a family, a wizard step, 20 series and 10 to pass', () => {
    for (const m of ['slice', 'putaway', 'approach', 'smash_volo', 'smash_rimbalzo', 'dropshot'] as TestType[]) {
      expect(MODULE_LABELS[m]).toBeTruthy();
      expect(MODULE_FAMILY[m]).toBeTruthy();
      expect(WIZARD_STEPS.some(s => s.id === m)).toBe(true);
      expect(MODULE_SERIES[m]).toBe(20);
      expect(MODULE_PASS[m]).toBe(10);
      expect(MODULE_STEP_ORDER).toContain(m);
    }
  });
  it('the original modules keep their relative order (simulated match and old tests unchanged)', () => {
    const old: TestType[] = ['groundstrokes', 'forehand', 'backhand', 'insideout', 'combined', 'return', 'serve', 'volley'];
    expect(MODULE_STEP_ORDER.filter(m => old.includes(m))).toEqual(old);
  });
  it('families as agreed', () => {
    expect(MODULE_FAMILY.dropshot).toBe('sensibilita');
    expect(MODULE_FAMILY.approach).toBe('rete');
    expect(MODULE_FAMILY.smash_volo).toBe('rete');
    expect(MODULE_FAMILY.smash_rimbalzo).toBe('rete');
    expect(MODULE_FAMILY.slice).toBe('fondo');
    expect(MODULE_FAMILY.putaway).toBe('fondo');
    expect(MODULE_FAMILY.serve).toBe('servizio');
  });
  it('every direction has a description', () => {
    for (const m of OPTION_MODULES) for (const o of MODULE_OPTIONS[m]) for (const d of o.cycle) expect(DIRECTION_TEXT[d]).toBeTruthy();
  });
});

describe('options', () => {
  it('every option round-trips through the saved series', () => {
    for (const m of OPTION_MODULES) {
      for (const o of MODULE_OPTIONS[m]) {
        const series = play(m, o.id, [5, 6, 7]);
        expect(detectedOption(series, m).id).toBe(o.id);
      }
    }
  });
  it('smorzata and attacco-volée alternate forehand and backhand', () => {
    expect(optionSeries('dropshot', 'line').slice(0, 4).map(s => s.direction)).toEqual(['ds_fh_line', 'ds_bh_line', 'ds_fh_line', 'ds_bh_line']);
    expect(optionSeries('approach', 'cross').slice(0, 2).map(s => s.direction)).toEqual(['ap_fh_cross', 'ap_bh_cross']);
  });
  it('slice: four choices, forehand or backhand, cross or down the line', () => {
    expect(MODULE_OPTIONS.slice.map(o => o.id).sort()).toEqual(['bh_cross', 'bh_line', 'fh_cross', 'fh_line']);
    const mirror = Object.fromEntries(MODULE_OPTIONS.slice.map(o => [o.id, o.target.mirror]));
    // Same corners as the plain forehand / backhand
    expect(mirror).toEqual({ fh_cross: false, fh_line: true, bh_cross: true, bh_line: false });
  });
  it('smash: zona del dritto / zona del rovescio', () => {
    expect(MODULE_OPTIONS.smash_volo.map(o => o.label)).toEqual(['Zona del dritto', 'Zona del rovescio']);
    expect(MODULE_OPTIONS.smash_rimbalzo[1].target.mirror).toBe(true);
  });
  it('display names', () => {
    expect(moduleDisplayName(play('slice', 'fh_line', [5]), 'slice')).toBe('Back (slice) · dritto lungolinea');
    expect(moduleDisplayName(play('dropshot', 'cross', [5]), 'dropshot')).toBe('Smorzata incrociata');
    expect(moduleDisplayName(play('putaway', 'line', [5]), 'putaway')).toBe('Dritto di chiusura lungolinea');
  });
  it('unknown option falls back to the default', () => {
    expect(optionSeries('slice', 'nonsense')[0].direction).toBe('sl_bh_cross');
  });
});

describe('attacco e volée: pairs', () => {
  it('a series is 5 pairs; 5/5 = 10 = perfect', () => {
    expect(isPairModule('approach')).toBe(true);
    expect(isPairModule('dropshot')).toBe(false);
    const series = play('approach', 'line', [...Array(10).fill(10), 8]);
    const p = modulePasses(series).find(x => x.module === 'approach')!;
    expect(p.perfect).toBe(10);
    expect(p.outcome).toBe('superato');
  });
});

describe('results with special strokes', () => {
  const base = (): SeriesResult[] => [
    ...Array.from({ length: 10 }, (_, i) => ({ testType: 'serve' as const, seriesIndex: i, score: 8 })),
    ...Array.from({ length: 10 }, (_, i) => ({ testType: 'volley' as const, seriesIndex: i, score: 6 })),
  ];
  it('special strokes have their own stats and do not change the base axes', () => {
    const st = computeStrokeStats(sess([...base(), ...play('smash_volo', 'fh', [4, 6])]));
    expect(st.find(s => s.stroke === 'smash_volo')!.ave).toBe(5);
    expect(st.find(s => s.stroke === 'volley')!.ave).toBe(6);
  });
  it('general radar always 6 axes; % ideale counts every tested stroke', () => {
    const onlyBase = computeSessionResults(sess(base()));
    const withSpecial = computeSessionResults(sess([...base(), ...play('dropshot', 'cross', [10, 10])]));
    expect(withSpecial.radarValues).toHaveLength(6);
    expect(withSpecial.radarValues).toEqual(onlyBase.radarValues);
    // 3 tested strokes in order serve, volley, dropshot: (8·6 + 6·10 + 10·8) / 3
    expect(withSpecial.percentOfIdeal).toBeCloseTo((48 + 60 + 80) / 3, 10);
    expect(onlyBase.percentOfIdeal).toBeCloseTo((48 + 48) / 2, 10);
  });
  it('tables: base strokes always, special ones only when tested', () => {
    const st = computeStrokeStats(sess([...base(), ...play('slice', 'bh_cross', [7])]));
    expect(visibleStats(st).map(s => s.stroke)).toEqual([...BASE_STROKES.map(b => b), 'slice'].sort((a, b) =>
      st.findIndex(x => x.stroke === a) - st.findIndex(x => x.stroke === b)));
  });
  it('family charts only for families with a special stroke', () => {
    const st = computeStrokeStats(sess([...base(), ...play('approach', 'line', [6]), ...play('smash_rimbalzo', 'bh', [8])]));
    expect(familiesWithSpecials(st)).toEqual(['rete']);
    expect(familyAxes('rete', st)).toEqual(['volley', 'approach', 'smash_rimbalzo']);
    expect(familiesWithSpecials(computeStrokeStats(sess(base())))).toEqual([]);
  });
  it('stroke family colours', () => {
    expect(strokeFamily('serve')).toBe('servizio');
    expect(strokeFamily('return')).toBe('servizio');
    expect(strokeFamily('combined')).toBe('fondo');
    expect(strokeFamily('dropshot')).toBe('sensibilita');
    expect(strokeFamily('smash_volo')).toBe('rete');
  });
});

describe('smorzata zone', () => {
  it('defaults per level and limits', () => {
    expect([PROTOCOL_ZONES.terza.dropshot, PROTOCOL_ZONES.seconda.dropshot, PROTOCOL_ZONES.prima.dropshot]).toEqual([1.5, 1.2, 1]);
    expect(clampMeasures({ ...PROTOCOL_ZONES.seconda, dropshot: 9 }, 'seconda').dropshot).toBe(3);
    expect(measuresAtDifficulty(1.5, PROTOCOL_ZONES, 'seconda').dropshot).toBeCloseTo(1.1, 5);
  });
  it('zones saved before the smorzata existed', () => {
    const old = { gsFromCenter: 1.5, gsFromService: 2, volley: 1.2, serve: 1.2 } as never;
    expect(withDropshot(old, 'prima').dropshot).toBe(1);
    // Not "different" from the defaults just because the square is missing (stays standard)
    expect(sameMeasures(old, PROTOCOL_ZONES.seconda)).toBe(true);
    expect(sameMeasures({ ...PROTOCOL_ZONES.seconda, dropshot: 2 }, PROTOCOL_ZONES.seconda)).toBe(false);
    expect(describeZones({ level: 'seconda', measures: old, standard: true }, 'seconda').dropshot).toContain('1,2 m');
  });
});

describe('volée: alternate, solo dritto, solo rovescio', () => {
  it('three options; the original alternated protocol is the default', () => {
    expect(MODULE_OPTIONS.volley.map(o => o.id)).toEqual(['alt', 'fh', 'bh']);
    expect(optionSeries('volley', undefined).slice(0, 2).map(s => s.direction)).toEqual(['fh_volley', 'bh_volley']);
    expect(optionSeries('volley', 'bh').every(s => s.direction === 'bh_volley')).toBe(true);
    expect(optionSeries('volley', 'fh')).toHaveLength(10);
    expect(MODULE_PASS.volley).toBe(5);
  });
  it('old tests (alternated) are still read as alternated, with the plain name', () => {
    const old: SeriesResult[] = Array.from({ length: 10 }, (_, i) => ({
      testType: 'volley', seriesIndex: i, score: 7, direction: i % 2 === 0 ? 'fh_volley' : 'bh_volley',
    }));
    expect(detectedOption(old, 'volley').id).toBe('alt');
    expect(moduleDisplayName(old, 'volley')).toBe('Volley');
  });
  it('solo dritto / solo rovescio are recognised from the series', () => {
    expect(detectedOption(play('volley', 'fh', [7, 8, 9]), 'volley').id).toBe('fh');
    expect(detectedOption(play('volley', 'bh', [7]), 'volley').id).toBe('bh');
    expect(moduleDisplayName(play('volley', 'bh', [7, 8]), 'volley')).toBe('Volley · solo rovescio');
  });
  it('one series only is ambiguous: the option saved with the test wins', () => {
    const one = play('volley', 'fh', [7]);
    expect(detectedOption(one, 'volley').id).toBe('alt');
    expect(detectedOption(one, 'volley', 'fh').id).toBe('fh');
    // a saved option that contradicts the series is ignored
    expect(detectedOption(play('volley', 'bh', [7, 8]), 'volley', 'fh').id).toBe('bh');
  });
  it('the volley axis counts every volée whatever the option', () => {
    const st = computeStrokeStats(sess(play('volley', 'bh', [6, 8])));
    expect(st.find(s => s.stroke === 'volley')!.ave).toBe(7);
  });
});
