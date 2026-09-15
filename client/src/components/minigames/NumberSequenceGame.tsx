import React, { useState } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface NumberSequenceGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { answer: number }) => void;
  disabled?: boolean;
}

export const NumberSequenceGame: React.FC<NumberSequenceGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const { sequence = [], options = [] } = challenge.data || {};

  const handleSelect = (choice: number) => {
    if (disabled || selectedAnswer !== null) return;
    setSelectedAnswer(choice);
    onSubmit({ answer: choice });
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">⚡ Sequence Bypass</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className="sequence-display" role="status" aria-label="Number sequence">
        {sequence.map((num: number | string | null, index: number) => {
          const isMissing = num === '?' || num === null;
          return (
            <div
              key={index}
              className={`sequence-item ${isMissing ? 'sequence-missing' : ''}`}
            >
              {isMissing ? (selectedAnswer !== null ? selectedAnswer : '?') : num}
            </div>
          );
        })}
      </div>

      <div className="minigame-options-grid">
        {options.map((opt: number, idx: number) => {
          const isSelected = selectedAnswer === opt;
          return (
            <button
              key={idx}
              className={`minigame-option-btn ${isSelected ? 'selected' : ''}`}
              disabled={disabled || selectedAnswer !== null}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};
