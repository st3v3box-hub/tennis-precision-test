import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { WizardState, WizardPlayerData, Category, SeriesResult, TestSession } from '../../types';
import { uid } from '../../lib/storage';
import { useAppData } from '../../contexts/AppDataContext';
import { ProgressSteps } from '../ui/ProgressSteps';
import { WIZARD_STEPS, MODULE_STEP_ORDER, detectedModules } from '../../lib/protocol';
import { StepMeta } from './StepMeta';
import { StepGroundstrokes } from './StepGroundstrokes';
import { StepCombined } from './StepCombined';
import { StepReturn } from './StepReturn';
import { StepServe } from './StepServe';
import { StepVolley } from './StepVolley';
import { StepReview } from './StepReview';

const ALL_MODULES = MODULE_STEP_ORDER;

const makePlayer = (): WizardPlayerData => ({
  id: uid(),
  name: '',
  category: 'seconda',
  series: [],
});

export const WizardContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastCoach, saveLastCoach, upsertPlayer, upsertSession, sessions: allSessions } = useAppData();

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

  const [state, setState] = useState<WizardState>(() => {
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
        selectedModules: [...ALL_MODULES],
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
        selectedModules: [...ALL_MODULES],
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
        }],
        challengeMode: 'none',
        selectedModules,
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
      }));

      return {
        step,
        date: challengeSessions[0]?.date ?? new Date().toISOString().slice(0, 10),
        coach: challengeSessions[0]?.coach ?? lastCoach,
        playerCount,
        players,
        challengeMode: resumeChallenge.mode,
        selectedModules,
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
      selectedModules: [...ALL_MODULES],
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

  const next = () => setState(s => ({ ...s, step: s.step + 1 }));
  const prev = () => setState(s => ({ ...s, step: Math.max(0, s.step - 1) }));

  const buildSessionPayload = (
    p: WizardPlayerData,
    playerId: string,
    id: string,
    now: string,
    completed: boolean
  ) => ({
    id,
    playerId,
    playerName: p.name,
    date: state.date,
    category: p.category as Category,
    coach: state.coach,
    dateOfBirth: p.dateOfBirth,
    note: p.note,
    completed,
    createdAt: now,
    series: p.series,
    selectedModules: state.selectedModules.length < ALL_MODULES.length
      ? [...state.selectedModules]
      : undefined,
    ...(state.challengeId ? { challengeId: state.challengeId } : {}),
  });

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

  const saveDraft = async () => {
    setSavingDraft(true);
    setSaveError(null);
    try {
      await saveLastCoach(state.coach);
      const now = new Date().toISOString();
      const ids: string[] = [];

      for (let pi = 0; pi < state.players.length; pi++) {
        const p = state.players[pi];
        const playerId = await resolvePlayer(p, now);
        const id = state.draftSessionIds?.[pi] ?? uid();
        await upsertSession(buildSessionPayload(p, playerId, id, now, false));
        ids.push(id);
      }

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
      setSavingDraft(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveLastCoach(state.coach);
      const now = new Date().toISOString();
      const ids: string[] = [];

      for (let pi = 0; pi < state.players.length; pi++) {
        const p = state.players[pi];
        const playerId = await resolvePlayer(p, now);
        const id = state.draftSessionIds?.[pi] ?? uid();
        await upsertSession(buildSessionPayload(p, playerId, id, now, true));
        ids.push(id);
      }

      if (state.challengeMode !== 'none') {
        navigate('/challenge-results', { state: { ids, mode: state.challengeMode } });
      } else if (ids.length === 1) {
        navigate(`/results/${ids[0]}`);
      } else {
        navigate('/multi-results', { state: { ids } });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore durante il salvataggio. Riprova.');
      setSaving(false);
    }
  };

  const stepProps = { state, update, updatePlayer, setPlayerCount, setSeriesResult, onNext: next, onPrev: prev };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 shadow-sm">
        <div className="bg-black px-4 py-2 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex-shrink-0">
            <img src="./logo.png" alt="Gladiators Training — Home" className="h-8 w-8" />
          </button>
          <p className="text-xs text-neutral-300 font-medium">{currentStepDef?.title}</p>
        </div>
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <ProgressSteps currentStep={state.step} steps={activeSteps} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {currentStepId === 'meta' && <StepMeta {...stepProps} />}
        {currentStepId === 'groundstrokes' && <StepGroundstrokes {...stepProps} />}
        {currentStepId === 'combined' && <StepCombined {...stepProps} />}
        {currentStepId === 'return' && <StepReturn {...stepProps} />}
        {currentStepId === 'serve' && <StepServe {...stepProps} />}
        {currentStepId === 'volley' && <StepVolley {...stepProps} />}
        {currentStepId === 'review' && (
          <StepReview
            {...stepProps}
            onSave={save}
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
