import React, { useState } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface QuickMathGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { answer: number }) => void;
  disabled?: boolean;
}

export const QuickMathGame: React.FC<QuickMathGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const equation: string = challenge.data?.equation || '0 + 0 = ?';
  const options: number[] = challenge.data?.options || [];

  const handleSelect = (choice: number) => {
    if (disabled || selectedAnswer !== null) return;
    setSelectedAnswer(choice);
    onSubmit({ answer: choice });
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">⚡ Generator Terminal</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className="math-equation-display" role="status" aria-label="Equation">
        {equation}
      </div>

      <div className="minigame-options-grid">
        {options.map((opt, idx) => {
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
