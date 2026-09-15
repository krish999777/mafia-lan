import React, { useState } from 'react';
import { MinigameChallenge } from '@shared/types.js';

interface OddOneOutGameProps {
  challenge: MinigameChallenge;
  onSubmit: (payload: { selectedIndex: number }) => void;
  disabled?: boolean;
}

export const OddOneOutGame: React.FC<OddOneOutGameProps> = ({
  challenge,
  onSubmit,
  disabled = false
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const tiles: string[] = challenge.data?.tiles || [];
  const tileCount = tiles.length;

  const getGridColsClass = () => {
    if (tileCount >= 16) return 'cols-4';
    if (tileCount >= 12) return 'cols-4';
    return 'cols-3';
  };

  const handleTileClick = (index: number) => {
    if (disabled || selectedIndex !== null) return;
    setSelectedIndex(index);
    onSubmit({ selectedIndex: index });
  };

  return (
    <div className="minigame-card">
      <div className="minigame-header">
        <span className="minigame-badge">🔍 Anomaly Scan</span>
        <h3 className="minigame-title">{challenge.name}</h3>
        <p className="minigame-desc">{challenge.instruction}</p>
      </div>

      <div className={`odd-tiles-grid ${getGridColsClass()}`} role="region" aria-label="Tiles matrix">
        {tiles.map((tile, index) => {
          const isSelected = selectedIndex === index;
          return (
            <button
              key={index}
              className={`odd-tile-btn ${isSelected ? 'selected' : ''}`}
              disabled={disabled || selectedIndex !== null}
              onClick={() => handleTileClick(index)}
              aria-label={`Tile ${index + 1}: ${tile}`}
            >
              <span className="odd-tile-symbol">{tile}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
