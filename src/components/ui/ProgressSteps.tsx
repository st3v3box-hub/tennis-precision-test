import React from 'react';
import { WIZARD_STEPS } from '../../lib/protocol';

interface Props {
  currentStep: number;
}

export const ProgressSteps: React.FC<Props> = ({ currentStep }) => (
  <div className="w-full overflow-x-auto pb-1">
    <div className="flex items-center min-w-max">
      {WIZARD_STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                  ${done ? 'bg-green-600 border-green-600 text-white' : ''}
                  ${active ? 'bg-white border-green-600 text-green-600' : ''}
                  ${!done && !active ? 'bg-white border-gray-300 text-gray-400' : ''}
                `}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap
                  ${active ? 'text-green-700' : done ? 'text-green-600' : 'text-gray-400'}
                `}
              >
                {step.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-5 transition-colors
                  ${i < currentStep ? 'bg-green-600' : 'bg-gray-200'}
                `}
                style={{ minWidth: 12 }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);
