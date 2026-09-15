import React from 'react';
import { GamePhase } from '@shared/types.js';

interface HeaderProps {
  isConnected: boolean;
  roomCode?: string | null;
  phase?: GamePhase;
  onResetToLobby?: () => void;
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  roomCode,
  phase,
  onResetToLobby,
  onLeaveRoom
}) => {
  const isInActiveGame = Boolean(roomCode && phase && phase !== 'LOBBY');

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
        <span className="icon">🕵️</span>
        <span>MAFIA LAN</span>
        <span className="brand-tag">OFFLINE</span>
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

        <div className="connection-pill">
          <span className={`connection-dot ${isConnected ? 'online pulse-dot' : 'offline'}`} />
          <span>{isConnected ? 'LAN Ready' : 'Connecting...'}</span>
        </div>
      </div>
    </header>
  );
};
