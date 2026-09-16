import React, { useState } from 'react';
import { GamePhase } from '@shared/types.js';

interface HeaderProps {
  isConnected: boolean;
  roomCode?: string | null;
  phase?: GamePhase;
  isDevMode?: boolean;
  onDevModeChange?: (active: boolean) => void;
  onResetToLobby?: () => void;
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  roomCode,
  phase,
  isDevMode = false,
  onDevModeChange,
  onResetToLobby,
  onLeaveRoom
}) => {
  const isInActiveGame = Boolean(roomCode && phase && phase !== 'LOBBY');

  // Developer mode sequence state
  // Stage 0: 3 clicks on MAFIA LAN
  // Stage 1: 3 clicks on OFFLINE
  // Stage 2: 3 clicks on LAN READY
  // Stage 3: Complete
  const [seqStage, setSeqStage] = useState<number>(0);
  const [stageClicks, setStageClicks] = useState<number>(0);

  const handleResetClick = () => {
    setSeqStage(0);
    setStageClicks(0);
    if (onDevModeChange) {
      onDevModeChange(false);
    }
  };

  const handleMafiaLanClick = () => {
    if (seqStage === 0) {
      const nextClicks = stageClicks + 1;
      if (nextClicks >= 3) {
        setSeqStage(1);
        setStageClicks(0);
      } else {
        setStageClicks(nextClicks);
      }
    } else {
      // Out of order: restart from MAFIA LAN with 1 click
      setSeqStage(0);
      setStageClicks(1);
    }
  };

  const handleOfflineClick = () => {
    if (seqStage === 1) {
      const nextClicks = stageClicks + 1;
      if (nextClicks >= 3) {
        setSeqStage(2);
        setStageClicks(0);
      } else {
        setStageClicks(nextClicks);
      }
    } else {
      // Out of order: reset sequence
      setSeqStage(0);
      setStageClicks(0);
    }
  };

  const handleLanReadyClick = () => {
    if (seqStage === 2) {
      const nextClicks = stageClicks + 1;
      if (nextClicks >= 3) {
        setSeqStage(3);
        setStageClicks(0);
        if (onDevModeChange) {
          onDevModeChange(true);
        }
      } else {
        setStageClicks(nextClicks);
      }
    } else {
      // Out of order: reset sequence
      setSeqStage(0);
      setStageClicks(0);
    }
  };

  const handleForceExit = () => {
    if (!isInActiveGame) return;

    if (isConnected) {
      const confirmed = window.confirm(
        'Force exit active game and return all players to the lobby?'
      );
      if (confirmed && onResetToLobby) {
        onResetToLobby();
      }
    } else {
      const confirmed = window.confirm(
        'Connection interrupted. Return to main menu?'
      );
      if (confirmed && onLeaveRoom) {
        onLeaveRoom();
      }
    }
  };

  return (
    <header className="app-header">
      <div className="brand-badge">
        <span
          className="icon"
          onClick={handleResetClick}
          title="Reset"
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          🕵️
        </span>
        <span
          onClick={handleMafiaLanClick}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          MAFIA LAN
        </span>
        <span
          className="brand-tag"
          onClick={handleOfflineClick}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          OFFLINE
        </span>
      </div>

      <div className="header-right">
        {isInActiveGame && (
          <button
            type="button"
            className="force-exit-btn"
            onClick={handleForceExit}
            title="Emergency Force Exit: Return room to lobby"
          >
            <span className="exit-icon">↺</span>
            <span className="exit-text">Exit to Lobby</span>
          </button>
        )}

        <div
          className="connection-pill"
          onClick={handleLanReadyClick}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <span
            className={`connection-dot ${
              isDevMode
                ? 'developer-mode pulse-dot'
                : isConnected
                ? 'online pulse-dot'
                : 'offline'
            }`}
          />
          <span>{isConnected ? 'LAN Ready' : 'Connecting...'}</span>
        </div>
      </div>
    </header>
  );
};
