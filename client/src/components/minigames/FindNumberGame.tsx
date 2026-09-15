import React, { useState } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface FindNumberGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { foundNumber: number }) => void;
  disabled?: boolean;
}

export const FindNumberGame: React.FC<FindNumberGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const [selectedNum, setSelectedNum] = useState<number | null>(null);

  const targetNumber: number = challenge.data?.targetNumber ?? 0;
  const grid: number[] = challenge.data?.grid || [];
  const count = grid.length;

  const getGridColsClass = () => {
    if (count >= 20) return 'cols-5';
    if (count >= 16) return 'cols-4';
    return 'cols-3';
  };

  const handleNumberClick = (num: number) => {
    if (disabled || selectedNum !== null) return;
    setSelectedNum(num);
    onSubmit({ foundNumber: num });
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">📡 Signal Intercept</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className="target-number-badge">
        <span className="target-number-label">TARGET SIGNAL:</span>
        <span className="target-number-val">#{targetNumber}</span>
      </div>

      <div className={`find-number-grid ${getGridColsClass()}`} role="region" aria-label="Frequency matrix">
        {grid.map((num, idx) => {
          const isSelected = selectedNum === num;
          return (
            <button
              key={idx}
              className={`find-number-btn ${isSelected ? 'selected' : ''}`}
              disabled={disabled || selectedNum !== null}
              onClick={() => handleNumberClick(num)}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
};
