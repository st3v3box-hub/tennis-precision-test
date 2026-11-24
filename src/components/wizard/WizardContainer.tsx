import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { WizardState, WizardPlayerData, Category, SeriesResult, TestSession, TestType } from '../../types';
import { uid } from '../../lib/storage';
import { useAppData } from '../../contexts/AppDataContext';
import { ProgressSteps } from '../ui/ProgressSteps';
import { WIZARD_STEPS, MODULE_STEP_ORDER, DEFAULT_MODULES, detectedModules, detectedOption, OPTION_MODULES, isOptionModule, moduleOption } from '../../lib/protocol';
import { resolveSessionZones } from '../../lib/zones';
import { clearAutosave, readAutosave, worthSaving, writeAutosave } from '../../lib/wizardAutosave';
import { StepSingleStroke } from './StepSingleStroke';
import type { OptionModule as OptionModuleId } from '../../lib/protocol';
import { ModuleActions } from './ModuleActions';
import { liveSimLabel } from '../results/GameSimCard';
import { gameThresholdFor } from '../../lib/match';
import { StepMeta } from './StepMeta';
import { StepGroundstrokes } from './StepGroundstrokes';
import { StepCombined } from './StepCombined';
import { StepServe } from './StepServe';
import { StepReview } from './StepReview';

const ALL_MODULES = DEFAULT_MODULES;

const DEFAULT_DIRECTIONS: WizardState['strokeDirections'] = {};

/** Directions used by an existing (draft) session */
const directionsOf = (series: SeriesResult[], saved?: Partial<Record<string, string>>): WizardState['strokeDirections'] =>
  Object.fromEntries(OPTION_MODULES.filter(m => series.some(s => s.testType === m) || saved?.[m]).map(m => [m, detectedOption(series, m, saved?.[m]).id]));

/** Custom zones of a saved session become the player's choice again on resume */
const zonesOf = (s: TestSession): WizardPlayerData['zones'] => (s.zones && !s.zones.standard ? s.zones : undefined);

const makePlayer = (): WizardPlayerData => ({
  id: uid(),
  name: '',
  category: 'seconda',
  series: [],
});

export const WizardContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastCoach, saveLastCoach, upsertPlayer, upsertSession, sessions: allSessions, settings } = useAppData();

  // Quick-start payload from PlayerDetailPage
  const quickStart = (location.state as Record<string, unknown> | null)?.quickStart as {
    profileId: string;
    name: string;
    dateOfBirth?: string;
    category: Category;
  } | undefined;

  // Challenge setup payload from ChallengePage
  const challengeSetup = (location.state as Record<string, unknown> | null)?.challengeSetup as {
    playerCount: 1 | 2 | 3 | 4;
    challengeMode: WizardState['challengeMode'];
  } | undefined;

  // Resume a single draft session
  const resumeSession = (location.state as Record<string, unknown> | null)?.resumeSession as TestSession | undefined;

  // Resume a draft challenge
  const resumeChallenge = (location.state as Record<string, unknown> | null)?.resumeChallenge as {
    challengeId: string;
    mode: WizardState['challengeMode'];
  } | undefined;

  // Restore the copy kept on the phone (browser closed during a test)
  const restoreLocal = (location.state as Record<string, unknown> | null)?.restoreLocal === true;

  const [state, setState] = useState<WizardState>(() => {
    if (restoreLocal) {
      const a = readAutosave();
      if (a) return a.state;
    }
    if (quickStart) {
      return {
        step: 1,   // skip meta — player data already known
        date: new Date().toISOString().slice(0, 10),
        coach: lastCoach,
        playerCount: 1,
        players: [{
          id: uid(),
          profileId: quickStart.profileId,
          name: quickStart.name,
          dateOfBirth: quickStart.dateOfBirth,
          category: quickStart.category,
          series: [],
        }],
        challengeMode: 'none',
        selectedModules: [],
        strokeDirections: { ...DEFAULT_DIRECTIONS },
      };
    }

    if (challengeSetup) {
      const count = challengeSetup.playerCount;
      return {
        step: 0,
        date: new Date().toISOString().slice(0, 10),
        coach: lastCoach,
        playerCount: count,
        players: Array.from({ length: count }, () => makePlayer()),
        challengeMode: challengeSetup.challengeMode,
        selectedModules: [],
        strokeDirections: { ...DEFAULT_DIRECTIONS },
        challengeId: uid(),  // generate challenge ID at start
      };
    }

    if (resumeSession) {
      const alreadyDone = detectedModules(resumeSession.series);
      const selectedModules = resumeSession.selectedModules ?? [...ALL_MODULES];
      const activeIds = ['meta', ...MODULE_STEP_ORDER.filter(m => selectedModules.includes(m)), 'review'];
      const firstNotDone = selectedModules.find(m => !alreadyDone.includes(m));
      const idx = firstNotDone ? activeIds.indexOf(firstNotDone) : -1;
      const step = Math.max(1, idx >= 0 ? idx : activeIds.length - 1);

      return {
        step,
        date: resumeSession.date,
        coach: resumeSession.coach,
        playerCount: 1,
        players: [{
          id: uid(),
          profileId: resumeSession.playerId,
          name: resumeSession.playerName,
          dateOfBirth: resumeSession.dateOfBirth,
          category: resumeSession.category,
          note: resumeSession.note,
          series: [...resumeSession.series],
          zones: zonesOf(resumeSession),
        }],
        challengeMode: 'none',
        selectedModules,
        strokeDirections: directionsOf(resumeSession.series, resumeSession.moduleOptions),
        draftSessionIds: [resumeSession.id],
      };
    }

    if (resumeChallenge) {
      const challengeSessions = allSessions.filter(s => s.challengeId === resumeChallenge.challengeId);
      const playerCount = Math.max(1, Math.min(4, challengeSessions.length)) as 1 | 2 | 3 | 4;
      const selectedModules = challengeSessions[0]?.selectedModules ?? [...ALL_MODULES];
      // Module is done when ALL players have it in their series
      const doneModules = selectedModules.filter(m =>
        challengeSessions.every(s => detectedModules(s.series).includes(m))
      );
      const firstNotDone = selectedModules.find(m => !doneModules.includes(m));
      const activeIds = ['meta', ...MODULE_STEP_ORDER.filter(m => selectedModules.includes(m)), 'review'];
      const idx = firstNotDone ? activeIds.indexOf(firstNotDone) : -1;
      const step = Math.max(1, idx >= 0 ? idx : activeIds.length - 1);

      const players: WizardPlayerData[] = challengeSessions.map(s => ({
        id: uid(),
        profileId: s.playerId,
        name: s.playerName,
        dateOfBirth: s.dateOfBirth,
        category: s.category,
        note: s.note,
        series: [...s.series],
        zones: zonesOf(s),
      }));

      return {
        step,
        date: challengeSessions[0]?.date ?? new Date().toISOString().slice(0, 10),
        coach: challengeSessions[0]?.coach ?? lastCoach,
        playerCount,
        players,
        challengeMode: resumeChallenge.mode,
        selectedModules,
        strokeDirections: directionsOf(challengeSessions[0]?.series ?? [], challengeSessions[0]?.moduleOptions),
        challengeId: resumeChallenge.challengeId,
        draftSessionIds: challengeSessions.map(s => s.id),
      };
    }

    return {
      step: 0,
      date: new Date().toISOString().slice(0, 10),
      coach: lastCoach,
      playerCount: 1,
      players: [makePlayer()],
      challengeMode: 'none',
      // A new test starts with nothing selected: the coach picks only what is needed today
      selectedModules: [],
      strokeDirections: { ...DEFAULT_DIRECTIONS },
    };
  });

  // Compute active step IDs based on selected modules (order is always canonical)
  const activeStepIds = [
    'meta',
    ...MODULE_STEP_ORDER.filter(m => state.selectedModules.includes(m)),
    'review',
  ];

  const activeSteps = activeStepIds.map(id => WIZARD_STEPS.find(s => s.id === id)!);
  const currentStepId = activeStepIds[state.step] ?? 'meta';
  const currentStepDef = activeSteps[state.step];

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));

  const updatePlayer = (playerIdx: number, patch: Partial<WizardPlayerData>) => {
    setState(s => {
      const players = [...s.players];
      players[playerIdx] = { ...players[playerIdx], ...patch };
      return { ...s, players };
    });
  };

  const setPlayerCount = (count: 1 | 2 | 3 | 4) => {
    setState(s => {
      const existing = s.players.slice(0, count);
      while (existing.length < count) existing.push(makePlayer());
      // Reset challenge mode when count changes
      return { ...s, playerCount: count, players: existing, challengeMode: 'none' };
    });
  };

  const setSeriesResult = (playerIdx: number, result: SeriesResult) => {
    setState(s => {
      const players = [...s.players];
      const player = { ...players[playerIdx] };
      const idx = player.series.findIndex(
        r => r.testType === result.testType && r.seriesIndex === result.seriesIndex
      );
      const series = [...player.series];
      if (idx >= 0) series[idx] = result;
      else series.push(result);
      player.series = series;
      players[playerIdx] = player;
      return { ...s, players };
    });
  };

  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Autosave ────────────────────────────────────────────────────────────
  // 1. On the phone, at every change (instant, works offline, survives a closed browser).
  // 2. As a draft in the database a few seconds after the last series (queued offline),
  //    so the test also survives a lost phone and shows up as "in corso" in the history.
  const finalizing = useRef(false);
  const latest = useRef(state);
  latest.current = state;
  const remoteChain = useRef<Promise<void>>(Promise.resolve());
  const [lastRemoteSave, setLastRemoteSave] = useState<string | null>(null);

  useEffect(() => {
    if (finalizing.current) return;
    if (worthSaving(state)) writeAutosave(state);
  }, [state]);

  const seriesCount = state.players.reduce((n, p) => n + p.series.length, 0);
  const seriesKey = state.players.map(p => p.series.map(r => `${r.testType}${r.seriesIndex}:${r.score}`).join(',')).join('|');

  // Ids created by the autosave, keyed by the wizard player id: the source of truth while
  // the state update that stores them is still on its way (no duplicate profiles or drafts).
  const createdProfile = useRef<Record<string, string>>({});
  const createdDraft = useRef<Record<string, string>>({});

  const remoteAutosave = useCallback(() => {
    remoteChain.current = remoteChain.current.then(async () => {
      const snapshot = latest.current;
      const fns = fnRef.current;
      if (finalizing.current) return;
      // Needs a name for every player (the profile is created from it)
      if (snapshot.players.some(p => !p.name.trim())) return;
      const now = new Date().toISOString();
      const profileIds: string[] = [];
      const ids: string[] = [];
      for (let pi = 0; pi < snapshot.players.length; pi++) {
        const p0 = snapshot.players[pi];
        const p = p0.profileId || !createdProfile.current[p0.id] ? p0 : { ...p0, profileId: createdProfile.current[p0.id] };
        const playerId = await fns.resolvePlayer(p, now);
        createdProfile.current[p0.id] = playerId;
        const id = snapshot.draftSessionIds?.[pi] ?? createdDraft.current[p0.id] ?? uid();
        createdDraft.current[p0.id] = id;
        if (finalizing.current) return;
        await fns.upsertSession(fns.buildSessionPayload(p, playerId, id, now, false, snapshot.selectedModules, snapshot));
        profileIds.push(playerId);
        ids.push(id);
      }
      // Keep the ids, so the next autosave and the final save update the same records
      setState(s => {
        const missingIds = ids.some((id, i) => s.draftSessionIds?.[i] !== id);
        const missingProfiles = s.players.some((p, i) => !p.profileId && profileIds[i]);
        if (!missingIds && !missingProfiles) return s;
        return {
          ...s,
          draftSessionIds: ids,
          players: s.players.map((p, i) => (p.profileId ? p : { ...p, profileId: profileIds[i] })),
        };
      });
      setLastRemoteSave(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
    }).catch(err => console.error('Autosave non riuscito', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seriesCount === 0 || finalizing.current) return;
    const t = window.setTimeout(() => remoteAutosave(), 2500);
    return () => window.clearTimeout(t);
  }, [seriesKey, seriesCount, remoteAutosave]);

  // Leaving the page (tab closed, app in background): save the draft right away
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && !finalizing.current && latest.current.players.some(p => p.series.length > 0)) {
        remoteAutosave();
      }
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [remoteAutosave]);

  const next = () => setState(s => ({ ...s, step: s.step + 1 }));
  const prev = () => setState(s => ({ ...s, step: Math.max(0, s.step - 1) }));

  const buildSessionPayload = (
    p: WizardPlayerData,
    playerId: string,
    id: string,
    now: string,
    completed: boolean,
    /** Modules to store; defaults to the selected ones. Used to close a test early. */
    modules: TestType[] = state.selectedModules,
    st: WizardState = state
  ) => ({
    id,
    playerId,
    playerName: p.name,
    date: st.date,
    category: p.category as Category,
    coach: st.coach,
    dateOfBirth: p.dateOfBirth,
    note: p.note,
    completed,
    createdAt: now,
    // Only the series of the selected modules (e.g. after switching groundstrokes → solo dritto)
    series: p.series.filter(r => modules.includes(r.testType)),
    // Saved unless it is exactly the original full protocol (older sessions have no field)
    selectedModules: sameModules(modules, ALL_MODULES)
      ? undefined
      : MODULE_STEP_ORDER.filter(m => modules.includes(m)), // canonical order
    // What was planned, when the test was closed before doing every selected module
    ...(sameModules(modules, st.selectedModules) ? {} : { plannedModules: MODULE_STEP_ORDER.filter(m => st.selectedModules.includes(m)) }),
    zones: resolveSessionZones(p.category, p.zones, settings.zoneDefaults),
    ...(moduleOptionsOf(modules, st) ? { moduleOptions: moduleOptionsOf(modules, st) } : {}),
    ...(st.challengeId ? { challengeId: st.challengeId } : {}),
  });

  /** Options of the configurable modules in this test (so a resumed draft keeps them) */
  const moduleOptionsOf = (modules: TestType[], st: WizardState = state) => {
    const entries = modules.filter(isOptionModule).map(m => [m, moduleOption(m, st.strokeDirections[m]).id] as const);
    return entries.length ? Object.fromEntries(entries) : undefined;
  };

  const resolvePlayer = async (p: WizardPlayerData, now: string): Promise<string> => {
    if (p.profileId) return p.profileId;
    const playerId = uid();
    const nameParts = p.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? p.name;
    const lastName = nameParts.slice(1).join(' ');
    await upsertPlayer({
      id: playerId,
      firstName,
      lastName,
      dateOfBirth: p.dateOfBirth ?? '',
      autoCreated: true,
      createdAt: now,
      updatedAt: now,
    });
    return playerId;
  };

  // Latest helpers for the autosave (it runs outside React's render cycle)
  const fnRef = useRef({ resolvePlayer, buildSessionPayload, upsertSession });
  fnRef.current = { resolvePlayer, buildSessionPayload, upsertSession };

  const saveDraft = async () => {
    setSavingDraft(true);
    setSaveError(null);
    finalizing.current = true;
    try {
      await remoteChain.current;
      await saveLastCoach(state.coach);
      const now = new Date().toISOString();
      const ids: string[] = [];

      for (let pi = 0; pi < state.players.length; pi++) {
        const p = state.players[pi];
        // After an autosave the ids may already exist (state update possibly still pending)
        const known = p.profileId ? p : { ...p, profileId: createdProfile.current[p.id] };
        const playerId = await resolvePlayer(known, now);
        const id = state.draftSessionIds?.[pi] ?? createdDraft.current[p.id] ?? uid();
        await upsertSession(buildSessionPayload(p, playerId, id, now, false));
        ids.push(id);
      }
      clearAutosave();

      if (state.challengeMode !== 'none' && state.challengeId) {
        navigate('/challenge-results', {
          state: { challengeId: state.challengeId, mode: state.challengeMode, draft: true },
        });
      } else if (ids.length === 1) {
        navigate(`/results/${ids[0]}`);
      } else {
        navigate('/multi-results', { state: { ids } });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore durante il salvataggio. Riprova.');
      finalizing.current = false;
      setSavingDraft(false);
    }
  };

  /**
   * Close the test now: keep only the modules with at least one series (for any player),
   * save as completed. Modules stopped half-way are shown as "interrotto".
   */
  const finishNow = async () => {
    const played = MODULE_STEP_ORDER.filter(m =>
      state.selectedModules.includes(m) && state.players.some(p => p.series.some(r => r.testType === m))
    );
    if (played.length === 0) {
      setSaveError('Nessuna serie inserita: non c\'è niente da salvare.');
      return;
    }
    await save(played);
  };

  const save = async (modules: TestType[] = state.selectedModules) => {
    setSaving(true);
    setSaveError(null);
    finalizing.current = true;
    try {
      await remoteChain.current;
      await saveLastCoach(state.coach);
      const now = new Date().toISOString();
      const ids: string[] = [];

      for (let pi = 0; pi < state.players.length; pi++) {
        const p = state.players[pi];
        // After an autosave the ids may already exist (state update possibly still pending)
        const known = p.profileId ? p : { ...p, profileId: createdProfile.current[p.id] };
        const playerId = await resolvePlayer(known, now);
        const id = state.draftSessionIds?.[pi] ?? createdDraft.current[p.id] ?? uid();
        await upsertSession(buildSessionPayload(p, playerId, id, now, true, modules));
        ids.push(id);
      }
      clearAutosave();

      if (state.challengeMode !== 'none') {
        navigate('/challenge-results', { state: { ids, mode: state.challengeMode } });
      } else if (ids.length === 1) {
        navigate(`/results/${ids[0]}`);
      } else {
        navigate('/multi-results', { state: { ids } });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore durante il salvataggio. Riprova.');
      finalizing.current = false;
      setSaving(false);
    }
  };

  const stepProps = { state, update, updatePlayer, setPlayerCount, setSeriesResult, onNext: next, onPrev: prev };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 shadow-sm">
        <div className="bg-pitch px-4 py-2 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex-shrink-0">
            <img src="./logo.png" alt="Gladiators Training — Home" className="h-8 w-8" />
          </button>
          <p className="text-xs text-neutral-300 font-medium flex-1 min-w-0 truncate">{currentStepDef?.title}</p>
          {seriesCount > 0 && (
            <span className="text-[11px] text-chalk/70 flex-shrink-0" title="Ogni serie viene salvata sul telefono subito e nell'archivio dopo pochi secondi">
              ✓ salvato{lastRemoteSave ? ` ${lastRemoteSave}` : ''}
            </span>
          )}
        </div>
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <ProgressSteps currentStep={state.step} steps={activeSteps} />
        </div>
        {currentStepId !== 'meta' && state.players.some(p => p.series.length > 0) && (
          <div className="bg-chalk border-b border-black/[0.06] px-4 py-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-brand-900">
            <span className="text-gray-500">Match simulato</span>
            {state.players.map(p => {
              const label = liveSimLabel(p.series, gameThresholdFor(p.category, settings.matchGameThresholds));
              return label ? (
                <span key={p.id} className="tabular-nums">
                  {state.players.length > 1 && <span className="text-gray-500">{p.name.split(' ')[0] || 'Giocatore'} </span>}
                  <strong>{label}</strong>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {currentStepId === 'meta' && <StepMeta {...stepProps} />}
        {currentStepId === 'groundstrokes' && <StepGroundstrokes {...stepProps} />}
        {currentStepId && isOptionModule(currentStepId as TestType) && (
          <StepSingleStroke key={currentStepId} module={currentStepId as OptionModuleId} {...stepProps} />
        )}
        {currentStepId === 'combined' && <StepCombined {...stepProps} />}
        {currentStepId === 'serve' && <StepServe {...stepProps} />}
        {currentStepId !== 'meta' && currentStepId !== 'review' && (
          <ModuleActions
            state={state}
            module={currentStepId as TestType}
            busy={saving || savingDraft}
            onFinish={finishNow}
            onPause={saveDraft}
            onNext={next}
          />
        )}
        {saveError && currentStepId !== 'review' && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
        )}
        {currentStepId === 'review' && (
          <StepReview
            {...stepProps}
            onSave={() => save()}
            saving={saving}
            saveError={saveError}
            onSaveDraft={saveDraft}
            savingDraft={savingDraft}
          />
        )}
      </div>
    </div>
  );
};

function sameModules(a: string[], b: string[]): boolean {
  return a.length === b.length && b.every(m => a.includes(m));
}
