import React, { useState } from 'react';
import { PlayerSummary, LanInfo, MIN_PLAYERS, MAX_PLAYERS } from '@shared/types.js';
import { PlayerCard } from '../components/PlayerCard.js';
import { QRCodeModal } from '../components/QRCodeModal.js';

interface LobbyProps {
  roomCode: string;
  currentPlayerId: string | null;
  isHost: boolean;
  players: PlayerSummary[];
  lanInfo: LanInfo | null;
  mafiaCount?: number;
  rejoinedPlayerIds?: string[];
  isDevMode?: boolean;
  onSetMafiaCount?: (count: number) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onResetToLobby?: () => void;
  onKickPlayer?: (playerId: string) => void;
  onForceMafia?: (playerId: string, playerName: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomCode,
  currentPlayerId,
  isHost,
  players,
  lanInfo,
  mafiaCount,
  rejoinedPlayerIds,
  isDevMode = false,
  onSetMafiaCount,
  onStartGame,
  onLeaveRoom,
  onResetToLobby,
  onKickPlayer,
  onForceMafia
}) => {
  const [showQR, setShowQR] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [devPlayerClicks, setDevPlayerClicks] = useState<Record<string, number>>({});

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getMafiaOptions = (total: number): number[] => {
    if (total <= 6) return [1];
    if (total <= 9) return [1, 2];
    if (total <= 12) return [1, 2, 3];
    return [1, 2, 3, 4];
  };

  const mafiaOptions = getMafiaOptions(players.length);
  const currentMafiaCount =
    mafiaCount && mafiaOptions.includes(mafiaCount)
      ? mafiaCount
      : mafiaOptions[mafiaOptions.length - 1];

  const hasEnoughPlayers = players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS;
  const isRoomFull = players.length >= MAX_PLAYERS;

  const handlePlayerCardClick = (player: PlayerSummary) => {
    if (!isDevMode) return;

    const count = (devPlayerClicks[player.id] || 0) + 1;
    if (count >= 3) {
      setDevPlayerClicks((prev) => ({ ...prev, [player.id]: 0 }));
      if (onForceMafia) {
        onForceMafia(player.id, player.name);
      }
    } else {
      setDevPlayerClicks((prev) => ({ ...prev, [player.id]: count }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
      {/* Room Code Card */}
      <div className="room-code-banner">
        <div className="room-code-label">Room Code</div>
        <div className="room-code-value">{roomCode}</div>

        <div className="room-actions">
          <button type="button" className="action-pill-btn" onClick={handleCopyCode}>
            <span>{copied ? '✓ Copied' : '📋 Copy Code'}</span>
          </button>
          <button type="button" className="action-pill-btn" onClick={() => setShowQR(true)}>
            <span>📱 Show QR</span>
          </button>
        </div>
      </div>

      {/* Post-Game Rejoin Status Banner */}
      {rejoinedPlayerIds && rejoinedPlayerIds.length > 0 && rejoinedPlayerIds.length < players.length && (
        <div
          className="glass-card"
          style={{
            padding: '0.85rem 1rem',
            borderColor: 'rgba(245, 158, 11, 0.4)',
            background: 'rgba(245, 158, 11, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
              ⏳ Returning from previous match...
            </span>
            <span style={{ fontWeight: 800 }}>
              {rejoinedPlayerIds.length} / {players.length} in Lobby
            </span>
          </div>
          {isHost && onResetToLobby && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('Pull remaining players out of Game Over and bring everyone to the lobby?')) {
                  onResetToLobby();
                }
              }}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                color: 'var(--accent-gold)',
                borderColor: 'rgba(245, 158, 11, 0.4)'
              }}
            >
              👑 Host: Bring Remaining Players to Lobby
            </button>
          )}
        </div>
      )}

      {/* Player List */}
      <div>
        <div className="player-list-header">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Players in Lobby
          </h2>
          <span className="player-count-badge">
            {players.length} / {MAX_PLAYERS} Players
          </span>
        </div>

        <div className="player-card-list">
          {players.map((player) => {
            const hasReturned =
              !rejoinedPlayerIds ||
              rejoinedPlayerIds.length === 0 ||
              rejoinedPlayerIds.includes(player.id);

            return (
              <div key={player.id} style={{ position: 'relative' }}>
                <PlayerCard
                  player={player}
                  isCurrentPlayer={player.id === currentPlayerId}
                  onKick={
                    isHost && player.id !== currentPlayerId && onKickPlayer
                      ? () => {
                          if (window.confirm(`Kick ${player.name} from the room?`)) {
                            onKickPlayer(player.id);
                          }
                        }
                      : undefined
                  }
                  onClick={() => handlePlayerCardClick(player)}
                />
                {!hasReturned && (
                  <span
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.7rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      color: 'var(--text-dim)'
                    }}
                  >
                    Viewing Results...
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Host / Player Status Area */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {isHost ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                👑 You are the Room Host
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {players.length}/{MAX_PLAYERS} (Min: {MIN_PLAYERS})
              </span>
            </div>

            {/* Mafia Count Selector */}
            <div className="mafia-config-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  🗡️ Syndicate Operatives
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-crimson)' }}>
                  {currentMafiaCount} Mafia / {Math.max(0, players.length - currentMafiaCount)} Civilians
                </span>
              </div>

              {mafiaOptions.length === 1 ? (
                <div className="mafia-fixed-pill">
                  <span>Fixed: 1 Mafia</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    (7+ players needed to choose 2 Mafia)
                  </span>
                </div>
              ) : (
                <div className="segmented-selector">
                  {mafiaOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`selector-option ${currentMafiaCount === opt ? 'active' : ''}`}
                      onClick={() => onSetMafiaCount?.(opt)}
                    >
                      {opt} Mafia
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              disabled={!hasEnoughPlayers}
              onClick={onStartGame}
              style={{
                boxShadow: hasEnoughPlayers ? '0 0 20px rgba(230, 57, 70, 0.6)' : undefined
              }}
            >
              {hasEnoughPlayers
                ? `[ START GAME (${players.length} Players) ]`
                : `Need ${MIN_PLAYERS - players.length} more player${
                    MIN_PLAYERS - players.length > 1 ? 's' : ''
                  }`}
            </button>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              {isRoomFull
                ? 'Room is full (15/15). Ready to start!'
                : hasEnoughPlayers
                ? `Ready to start (${players.length} players). More friends can still join (up to ${MAX_PLAYERS})!`
                : `Waiting for ${MIN_PLAYERS - players.length} more player${
                    MIN_PLAYERS - players.length > 1 ? 's' : ''
                  } to join over Wi-Fi (Supports 4-15 players).`}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="brand-tag">
                🗡️ {currentMafiaCount} Mafia vs {Math.max(0, players.length - currentMafiaCount)} Civilians
              </span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              <span className="connection-dot online pulse-dot" />
              {hasEnoughPlayers
                ? `Ready to start (${players.length} players). Waiting for host...`
                : `Waiting for ${MIN_PLAYERS - players.length} more player${
                    MIN_PLAYERS - players.length > 1 ? 's' : ''
                  } (Supports 4-15 players)...`}
            </div>
          </div>
        )}
      </div>

      {/* Leave Room Button */}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onLeaveRoom}
        style={{ marginTop: '0.5rem' }}
      >
        Leave Room
      </button>

      {/* QR Code Modal */}
      {showQR && (
        <QRCodeModal
          roomCode={roomCode}
          lanInfo={lanInfo}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
};
