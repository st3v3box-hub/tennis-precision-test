import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ChallengeType {
  icon: string;
  title: string;
  description: string;
  playerCount: number;
  challengeMode: string;
}

const CHALLENGE_TYPES: ChallengeType[] = [
  {
    icon: '🥊',
    title: 'Sfida 1 vs 1',
    description: 'Testa a testa: confronto diretto colpo per colpo',
    playerCount: 2,
    challengeMode: '1v1',
  },
  {
    icon: '👥',
    title: 'Sfida 2 vs 2',
    description: 'Squadre: media di coppia contro media di coppia',
    playerCount: 4,
    challengeMode: '2v2',
  },
  {
    icon: '🔄',
    title: 'Tutti contro tutti (3)',
    description: 'Round-robin 3 giocatori: ogni sfida conta',
    playerCount: 3,
    challengeMode: 'ffa',
  },
  {
    icon: '🔄',
    title: 'Tutti contro tutti (4)',
    description: 'Round-robin 4 giocatori: 6 sfide, classifica finale',
    playerCount: 4,
    challengeMode: 'ffa',
  },
];

export const ChallengePage: React.FC = function ChallengePage() {
  const navigate = useNavigate();

  function handleSelect(type: ChallengeType) {
    navigate('/new', {
      state: {
        challengeSetup: {
          playerCount: type.playerCount,
          challengeMode: type.challengeMode,
        },
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Torna alla home"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-900">Crea Sfida</h1>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-6">
          Scegli il formato di sfida che vuoi creare.
        </p>

        <div className="flex flex-col gap-3">
          {CHALLENGE_TYPES.map((type) => (
            <button
              key={`${type.challengeMode}-${type.playerCount}-${type.title}`}
              onClick={() => handleSelect(type)}
              className="w-full text-left bg-white rounded-2xl border border-gray-200 p-4 hover:border-green-400 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl leading-none">{type.icon}</span>
                <div>
                  <p className="font-bold text-gray-900">{type.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
