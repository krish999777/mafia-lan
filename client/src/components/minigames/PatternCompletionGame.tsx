import React, { useState } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface PatternCompletionGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { answer: string }) => void;
  disabled?: boolean;
}

export const PatternCompletionGame: React.FC<PatternCompletionGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const sequence: string[] = challenge.data?.sequence || [];
  const options: string[] = challenge.data?.options || [];

  const handleSelect = (choice: string) => {
    if (disabled || selectedSymbol !== null) return;
    setSelectedSymbol(choice);
    onSubmit({ answer: choice });
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">🔮 Cipher Stream</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className="sequence-display" role="status" aria-label="Cipher sequence">
        {sequence.map((sym, index) => {
          const isMissing = sym === '?';
          return (
            <div
              key={index}
              className={`sequence-item ${isMissing ? 'sequence-missing' : ''}`}
            >
              {isMissing ? (selectedSymbol !== null ? selectedSymbol : '?') : sym}
            </div>
          );
        })}
      </div>

      <div className="minigame-options-grid pattern-options-grid">
        {options.map((opt, idx) => {
          const isSelected = selectedSymbol === opt;
          return (
            <button
              key={idx}
              className={`minigame-option-btn pattern-opt-btn ${isSelected ? 'selected' : ''}`}
              disabled={disabled || selectedSymbol !== null}
              onClick={() => handleSelect(opt)}
            >
              <span className="pattern-opt-symbol">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
