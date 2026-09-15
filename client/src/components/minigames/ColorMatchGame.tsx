import React, { useState } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface ColorMatchGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { selectedColor: string }) => void;
  disabled?: boolean;
}

export const ColorMatchGame: React.FC<ColorMatchGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const word: string = challenge.data?.word || 'COLOR';
  const inkHex: string = challenge.data?.inkHex || '#ffffff';
  const options: { name: string; hex: string }[] = challenge.data?.options || [];

  const handleSelect = (colorName: string) => {
    if (disabled || selectedColor !== null) return;
    setSelectedColor(colorName);
    onSubmit({ selectedColor: colorName });
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">👁️ Optical Diagnostic</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className="color-match-target-container">
        <div
          className="color-match-target-word"
          style={{ color: inkHex }}
          role="status"
          aria-label={`Word ${word} displayed in ink color`}
        >
          {word}
        </div>
      </div>

      <div className="minigame-options-grid color-options-grid">
        {options.map((opt, idx) => {
          const isSelected = selectedColor === opt.name;
          return (
            <button
              key={idx}
              className={`color-match-btn ${isSelected ? 'selected' : ''}`}
              disabled={disabled || selectedColor !== null}
              onClick={() => handleSelect(opt.name)}
            >
              <span
                className="color-indicator-swatch"
                style={{ backgroundColor: opt.hex }}
              />
              <span className="color-btn-label">{opt.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
