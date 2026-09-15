import React, { useState, useEffect } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface MemoryGridGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { sequence: number[] }) => void;
  disabled?: boolean;
}

export const MemoryGridGame: React.FC<MemoryGridGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const sequence: number[] = challenge.data?.sequence || challenge.data?.pattern || [];
  const gridSize: number = challenge.data?.gridSize || 3;
  const totalCells = gridSize * gridSize;

  const [activeFlashCell, setActiveFlashCell] = useState<number | null>(null);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(true);
  const [userPicks, setUserPicks] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Memorize the pattern...');

  // Playback demonstration pattern on mount
  useEffect(() => {
    let isCancelled = false;
    setUserPicks([]);
    setIsPlayingSequence(true);
    setStatusMessage('Memorize the pattern...');

    const playSteps = async () => {
      // Small initial delay
      await new Promise((r) => setTimeout(r, 600));

      for (let i = 0; i < sequence.length; i++) {
        if (isCancelled) return;
        const cell = sequence[i];
        setActiveFlashCell(cell);
        await new Promise((r) => setTimeout(r, 650));
        if (isCancelled) return;
        setActiveFlashCell(null);
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!isCancelled) {
        setIsPlayingSequence(false);
        setStatusMessage(`Your turn! Tap the ${sequence.length} tiles in order.`);
      }
    };

    playSteps();

    return () => {
      isCancelled = true;
    };
  }, [challenge.token]);

  const handleCellClick = (cellIndex: number) => {
    if (disabled || isPlayingSequence || userPicks.length >= sequence.length) {
      return;
    }

    const nextPicks = [...userPicks, cellIndex];
    setUserPicks(nextPicks);

    if (nextPicks.length === sequence.length) {
      setStatusMessage('Pattern complete! Verifying with server...');
      onSubmit({ sequence: nextPicks });
    }
  };

  const handleReset = () => {
    if (disabled || isPlayingSequence) return;
    setUserPicks([]);
    setStatusMessage(`Reset. Tap the ${sequence.length} tiles in order.`);
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">🧠 Memory Matrix</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className="memory-status-badge">
        <span className={isPlayingSequence ? 'status-pulsing' : ''}>{statusMessage}</span>
      </div>

      {/* Progress dots */}
      <div className="memory-progress-dots">
        {sequence.map((_: number, idx: number) => (
          <span
            key={idx}
            className={`progress-dot ${idx < userPicks.length ? 'filled' : ''}`}
          />
        ))}
      </div>

      {/* 3x3 Grid */}
      <div className="memory-grid-container">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const isFlashing = activeFlashCell === idx;
          const isPicked = userPicks.includes(idx);
          return (
            <button
              key={idx}
              className={`memory-tile ${isFlashing ? 'tile-flashing' : ''} ${
                isPicked ? 'tile-picked' : ''
              }`}
              disabled={disabled || isPlayingSequence || userPicks.length >= sequence.length}
              onClick={() => handleCellClick(idx)}
              aria-label={`Tile ${idx + 1}`}
            >
              {isPicked ? userPicks.indexOf(idx) + 1 : ''}
            </button>
          );
        })}
      </div>

      {userPicks.length > 0 && userPicks.length < sequence.length && !disabled && (
        <button className="btn btn-secondary minigame-reset-btn" onClick={handleReset}>
          Reset Input
        </button>
      )}
    </div>
  );
};
