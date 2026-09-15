import React from 'react';
import { PlayerSummary } from '@shared/types.js';

interface PlayerCardProps {
  player: PlayerSummary;
  isCurrentPlayer: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isCurrentPlayer }) => {
  const initial = player.name ? player.name.charAt(0).toUpperCase() : '?';

  return (
    <div className={`player-item ${isCurrentPlayer ? 'is-me' : ''}`}>
      <div className="player-info">
        <div className="player-avatar">{initial}</div>
        <div>
          <div className="player-name">
            <span>{player.name}</span>
            {player.isHost && <span className="badge-host">HOST</span>}
            {isCurrentPlayer && <span className="badge-you">YOU</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        <span
          className={`connection-dot ${player.connected ? 'online' : 'offline'}`}
          style={{ width: '6px', height: '6px' }}
        />
        <span>{player.connected ? 'Ready' : 'Away'}</span>
      </div>
    </div>
  );
};
