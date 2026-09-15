import React from 'react';
import { GameOverResult, PlayerSummary } from '@shared/types.js';

interface GameOverProps {
  gameOverResult: GameOverResult | null;
  currentPlayerId: string | null;
  players: PlayerSummary[];
  isHost?: boolean;
  onRejoinLobby: () => void;
  onResetToLobby?: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  gameOverResult,
  currentPlayerId,
  players,
  isHost = false,
  onRejoinLobby,
  onResetToLobby
}) => {
  if (!gameOverResult) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem' }}>
        <div className="connection-dot online pulse-dot" style={{ margin: '0 auto 1rem auto' }} />
        <h3>Concluding Game...</h3>
      </div>
    );
  }

  const { winner, mafiaPlayers, allPlayers, rejoinedPlayerIds } = gameOverResult;
  const isCivilianWin = winner === 'CIVILIANS';
  const hasCurrentPlayerRejoined = currentPlayerId
    ? rejoinedPlayerIds.includes(currentPlayerId)
    : false;

  const totalPlayers = players.length > 0 ? players.length : allPlayers.length;
  const returnedCount = rejoinedPlayerIds.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
      {/* Dramatic Victory Banner */}
      <div className={`game-over-banner ${isCivilianWin ? 'winner-civilians' : 'winner-mafia'}`}>
        <div className="winner-icon">{isCivilianWin ? '🏆' : '🗡️'}</div>

        <h1 className="winner-title">{isCivilianWin ? 'CIVILIANS WIN!' : 'MAFIA WINS!'}</h1>

        <p className="winner-subtitle">
          {isCivilianWin
            ? 'All Syndicate operatives were rooted out! The town is safe once more.'
            : 'The Mafia overpowered the town and eliminated the civilian majority!'}
        </p>
      </div>

      {/* Revealed Mafia Operatives Box */}
      <div className="glass-card" style={{ borderColor: 'rgba(230, 57, 70, 0.4)' }}>
        <h3
          style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '0.75rem',
            color: 'var(--accent-crimson)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🕵️</span>
          <span>The Syndicate (Mafia Operatives)</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {mafiaPlayers.map((mafioso) => {
            const playerState = allPlayers.find((p) => p.id === mafioso.id);
            const isAlive = playerState ? playerState.alive : true;

            return (
              <div
                key={mafioso.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(230, 57, 70, 0.12)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(230, 57, 70, 0.25)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <span>🗡️</span>
                  <span>{mafioso.name}</span>
                  {mafioso.id === currentPlayerId && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)' }}>(You)</span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isAlive ? 'var(--accent-green)' : 'var(--text-dim)'
                  }}
                >
                  {isAlive ? 'Survived' : 'Eliminated'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Player Roster Breakdown */}
      <div className="glass-card">
        <h3
          style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          All Players & Secret Roles
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {allPlayers.map((p) => {
            const isMafia = p.role === 'MAFIA';

            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <span>{isMafia ? '🗡️' : '🛡️'}</span>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  {p.id === currentPlayerId && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)' }}>(You)</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isMafia ? 'rgba(230, 57, 70, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: isMafia ? 'var(--accent-crimson)' : 'var(--accent-cyan)'
                    }}
                  >
                    {p.role}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: p.alive ? 'var(--accent-green)' : 'var(--text-dim)' }}>
                    {p.alive ? 'Alive' : 'Dead'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Return to Lobby Section */}
      <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Players returned to lobby: <strong>{returnedCount} / {totalPlayers}</strong>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onRejoinLobby}
          disabled={hasCurrentPlayerRejoined}
          style={{
            boxShadow: !hasCurrentPlayerRejoined ? '0 0 20px rgba(56, 189, 248, 0.5)' : undefined
          }}
        >
          {hasCurrentPlayerRejoined ? '✓ Returned to Lobby' : '↺ Return to Lobby'}
        </button>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
          {hasCurrentPlayerRejoined
            ? 'Waiting for remaining players to finish viewing results...'
            : 'Each player can return to the lobby at their own pace.'}
        </div>

        {isHost && onResetToLobby && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('Return all players directly to the lobby now?')) {
                  onResetToLobby();
                }
              }}
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 0.9rem',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: 'var(--accent-gold)'
              }}
            >
              👑 Host: Return All Players to Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
