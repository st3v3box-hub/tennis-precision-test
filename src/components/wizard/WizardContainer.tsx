import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { WizardState, WizardPlayerData, Category, SeriesResult } from '../../types';
import {
  uid,
  upsertSession,
  upsertPlayerProfile,
  getLastCoach,
  setLastCoach,
} from '../../lib/storage';
import { ProgressSteps } from '../ui/ProgressSteps';
import { WIZARD_STEPS } from '../../lib/protocol';
import { StepMeta } from './StepMeta';
import { StepGroundstrokes } from './StepGroundstrokes';
import { StepCombined } from './StepCombined';
import { StepReturn } from './StepReturn';
import { StepServe } from './StepServe';
import { StepVolley } from './StepVolley';
import { StepReview } from './StepReview';

const makePlayer = (): WizardPlayerData => ({
  id: uid(),
  name: '',
  category: 'seconda',
  series: [],
});

export const WizardContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  const [state, setState] = useState<WizardState>(() => {
    if (quickStart) {
      return {
        step: 1,   // skip meta — player data already known
        date: new Date().toISOString().slice(0, 10),
        coach: getLastCoach(),
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
      };
    }
    if (challengeSetup) {
      const count = challengeSetup.playerCount;
      return {
        step: 0,
        date: new Date().toISOString().slice(0, 10),
        coach: getLastCoach(),
        playerCount: count,
        players: Array.from({ length: count }, () => makePlayer()),
        challengeMode: challengeSetup.challengeMode,
      };
    }
    return {
      step: 0,
      date: new Date().toISOString().slice(0, 10),
      coach: getLastCoach(),
      playerCount: 1,
      players: [makePlayer()],
      challengeMode: 'none',
    };
  });

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

  const next = () => setState(s => ({ ...s, step: s.step + 1 }));
  const prev = () => setState(s => ({ ...s, step: Math.max(0, s.step - 1) }));

  const save = () => {
    setLastCoach(state.coach);
    const now = new Date().toISOString();
    const ids: string[] = [];

    state.players.forEach(p => {
      // Resolve player profile ID — auto-create a minimal profile for unlinked players
      let playerId = p.profileId;
      if (!playerId) {
        playerId = uid();
        const nameParts = p.name.trim().split(/\s+/);
        const firstName = nameParts[0] ?? p.name;
        const lastName = nameParts.slice(1).join(' ');
        upsertPlayerProfile({
          id: playerId,
          firstName,
          lastName,
          dateOfBirth: p.dateOfBirth ?? '',
          autoCreated: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      const id = uid();
      upsertSession({
        id,
        playerId,
        playerName: p.name,
        date: state.date,
        category: p.category as Category,
        coach: state.coach,
        dateOfBirth: p.dateOfBirth,
        note: p.note,
        completed: true,
        createdAt: now,
        series: p.series,
      });
      ids.push(id);
    });

    if (state.challengeMode !== 'none') {
      navigate('/challenge-results', { state: { ids, mode: state.challengeMode } });
    } else if (ids.length === 1) {
      navigate(`/results/${ids[0]}`);
    } else {
      navigate('/multi-results', { state: { ids } });
    }
  };

  const stepProps = { state, update, updatePlayer, setPlayerCount, setSeriesResult, onNext: next, onPrev: prev };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 shadow-sm">
        <div className="bg-green-800 px-4 py-2 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex-shrink-0">
            <img src="./logo.png" alt="GT Logo — Home" className="h-8 w-auto" />
          </button>
          <p className="text-xs text-green-200 font-medium">{WIZARD_STEPS[state.step]?.title}</p>
        </div>
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <ProgressSteps currentStep={state.step} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {state.step === 0 && <StepMeta {...stepProps} />}
        {state.step === 1 && <StepGroundstrokes {...stepProps} />}
        {state.step === 2 && <StepCombined {...stepProps} />}
        {state.step === 3 && <StepReturn {...stepProps} />}
        {state.step === 4 && <StepServe {...stepProps} />}
        {state.step === 5 && <StepVolley {...stepProps} />}
        {state.step === 6 && <StepReview {...stepProps} onSave={save} />}
      </div>
    </div>
  );
};
