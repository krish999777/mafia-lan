import React, { useState } from 'react';
import { PlayerSummary } from '@shared/types.js';

interface VotingProps {
  players: PlayerSummary[];
  currentPlayerId: string | null;
  isHost: boolean;
  hasVoted: boolean;
  votedCount: number;
  totalLiving: number;
  onCastVote: (targetPlayerId: string) => void;
  onForceResolve: () => void;
}

export const Voting: React.FC<VotingProps> = ({
  players,
  currentPlayerId,
  isHost,
  hasVoted,
  votedCount,
  totalLiving,
  onCastVote,
  onForceResolve
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const isAlive = currentPlayer?.alive ?? true;

  // Candidates: only living players excluding oneself
  const candidates = players.filter((p) => p.alive && p.id !== currentPlayerId);

  const handleVoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) return;
    onCastVote(selectedTargetId);
  };

  const progressPercent = totalLiving > 0 ? Math.min(100, (votedCount / totalLiving) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
      {/* Voting Phase Header */}
      <div className="day-banner" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-crimson)', letterSpacing: '0.12em' }}>
          MANDATORY BALLOT
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: '0.2rem 0' }}>
          WHO DO YOU SUSPECT?
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cast your vote for the player you suspect is Mafia.
        </div>
      </div>

      {/* Progress indicator */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Vote Progress</span>
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
            {votedCount} / {totalLiving} Cast
          </span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Spectator notice for dead players */}
      {!isAlive ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.75rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💀</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-crimson)' }}>
            YOU ARE OUT
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            You can spectate the voting, but you cannot participate or speak.
          </p>
        </div>
      ) : hasVoted ? (
        /* Voted state */
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🗳️</div>
          <div className="connection-dot online pulse-dot" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
            Vote Submitted
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Your ballot is sealed. Waiting for all players to finish voting...
          </p>
        </div>
      ) : (
        /* Voting form */
        <form onSubmit={handleVoteSubmit}>
          <div className="candidate-list">
            {candidates.map((candidate) => {
              const isSelected = selectedTargetId === candidate.id;
              return (
                <div
                  key={candidate.id}
                  className={`candidate-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedTargetId(candidate.id)}
                >
                  <div className="radio-circle">
                    {isSelected && <div className="radio-inner-dot" />}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div className="player-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{candidate.name}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!selectedTargetId}
            style={{ marginTop: '1.25rem' }}
          >
            [ CAST VOTE ]
          </button>
        </form>
      )}

      {/* Host Emergency Force Resolve Button */}
      {isHost && (
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="action-pill-btn"
            style={{ fontSize: '0.75rem', opacity: 0.8 }}
            onClick={() => {
              if (confirm('Force end voting early with the currently submitted votes?')) {
                onForceResolve();
              }
            }}
          >
            ⚠️ Host: Force Resolve Votes Early
          </button>
        </div>
      )}
    </div>
  );
};
