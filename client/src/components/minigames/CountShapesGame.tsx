import React, { useState } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface CountShapesGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { count: number }) => void;
  disabled?: boolean;
}

export const CountShapesGame: React.FC<CountShapesGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const [selectedCount, setSelectedCount] = useState<number | null>(null);

  const shapes: string[] = challenge.data?.shapes || [];
  const targetSymbol: string = challenge.data?.targetSymbol || '⭐';
  const options: number[] = challenge.data?.options || [];

  const handleSelect = (choice: number) => {
    if (disabled || selectedCount !== null) return;
    setSelectedCount(choice);
    onSubmit({ count: choice });
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">📊 Perimeter Census</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className="count-target-banner">
        <span>Find & count all:</span>
        <span className="count-target-symbol">{targetSymbol}</span>
      </div>

      <div className="shapes-cluster-container" role="region" aria-label="Scattered shapes">
        {shapes.map((shape, idx) => (
          <div key={idx} className="cluster-shape-item">
            {shape}
          </div>
        ))}
      </div>

      <div className="minigame-options-grid">
        {options.map((opt, idx) => {
          const isSelected = selectedCount === opt;
          return (
            <button
              key={idx}
              className={`minigame-option-btn ${isSelected ? 'selected' : ''}`}
              disabled={disabled || selectedCount !== null}
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
