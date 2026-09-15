import React, { useState, useEffect, useRef } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface ReactionTestGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { reactionTimeMs: number }) => void;
  disabled?: boolean;
}

type ReactionState = 'IDLE' | 'WAITING' | 'READY' | 'TOO_EARLY' | 'COMPLETED';

export const ReactionTestGame: React.FC<ReactionTestGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const triggerDelayMs =
    challenge.data?.triggerDelayMs ?? challenge.data?.delayMs ?? 2500;

  const [gameState, setGameState] = useState<ReactionState>('WAITING');
  const [recordedTime, setRecordedTime] = useState<number | null>(null);

  const greenStartTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setGameState('WAITING');
    setRecordedTime(null);

    timerRef.current = setTimeout(() => {
      greenStartTimeRef.current = Date.now();
      setGameState('READY');
    }, triggerDelayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [challenge.token, triggerDelayMs]);

  const handleTap = () => {
    if (disabled || gameState === 'COMPLETED' || gameState === 'TOO_EARLY') {
      return;
    }

    if (gameState === 'WAITING') {
      // Tapped too early
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setGameState('TOO_EARLY');
      onSubmit({ reactionTimeMs: 0 }); // Early trigger = failure
      return;
    }

    if (gameState === 'READY') {
      const elapsed = Date.now() - greenStartTimeRef.current;
      setRecordedTime(elapsed);
      setGameState('COMPLETED');
      onSubmit({ reactionTimeMs: elapsed });
    }
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">⚡ Reflex Scanner</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div
        className={`reaction-touch-pad reaction-${gameState.toLowerCase()}`}
        onClick={handleTap}
        role="button"
        tabIndex={0}
      >
        {gameState === 'WAITING' && (
          <div className="reaction-prompt">
            <span className="reaction-icon">🛑</span>
            <h4>STAND BY</h4>
            <p>Wait for green... Do not touch!</p>
          </div>
        )}

        {gameState === 'READY' && (
          <div className="reaction-prompt">
            <span className="reaction-icon">⚡</span>
            <h4>TAP NOW!</h4>
            <p>CLEAR THE HAZARD!</p>
          </div>
        )}

        {gameState === 'TOO_EARLY' && (
          <div className="reaction-prompt">
            <span className="reaction-icon">⚠️</span>
            <h4>TOO EARLY!</h4>
            <p>Premature trigger detected.</p>
          </div>
        )}

        {gameState === 'COMPLETED' && (
          <div className="reaction-prompt">
            <span className="reaction-icon">🎯</span>
            <h4>CLEARED!</h4>
            <p className="reaction-time">{recordedTime} ms</p>
          </div>
        )}
      </div>
    </div>
  );
};
