import React, { useState } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface TapInOrderGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { sequence: number[] }) => void;
  disabled?: boolean;
}

export const TapInOrderGame: React.FC<TapInOrderGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const [tappedSequence, setTappedSequence] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const numbers: number[] = challenge.data?.numbers || [];

  const handleNodeClick = (num: number) => {
    if (disabled || isSubmitted || tappedSequence.includes(num)) return;

    const newSeq = [...tappedSequence, num];
    setTappedSequence(newSeq);

    if (newSeq.length === numbers.length) {
      setIsSubmitted(true);
      onSubmit({ sequence: newSeq });
    }
  };

  const handleReset = () => {
    if (disabled || isSubmitted) return;
    setTappedSequence([]);
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">🔌 Node Synchronization</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className="tap-progress-bar">
        <span>Tapped: {tappedSequence.length} / {numbers.length}</span>
        {tappedSequence.length > 0 && !isSubmitted && (
          <button
            type="button"
            className="tap-order-reset-btn"
            onClick={handleReset}
            disabled={disabled}
          >
            Reset
          </button>
        )}
      </div>

      <div className="tap-nodes-grid" role="region" aria-label="Nodes grid">
        {numbers.map((num, idx) => {
          const tapIndex = tappedSequence.indexOf(num);
          const isTapped = tapIndex !== -1;

          return (
            <button
              key={idx}
              className={`tap-node-btn ${isTapped ? 'tapped' : ''}`}
              disabled={disabled || isSubmitted || isTapped}
              onClick={() => handleNodeClick(num)}
            >
              <span className="tap-node-number">{num}</span>
              {isTapped && (
                <span className="tap-node-badge">#{tapIndex + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
