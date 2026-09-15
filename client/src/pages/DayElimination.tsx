import React from 'react';
import { VoteResult } from '@shared/types.js';

interface DayEliminationProps {
  voteResult: VoteResult | null;
  currentPlayerId: string | null;
}

export const DayElimination: React.FC<DayEliminationProps> = ({
  voteResult,
  currentPlayerId
}) => {
  if (!voteResult) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem' }}>
        <div className="connection-dot online pulse-dot" style={{ margin: '0 auto 1rem auto' }} />
        <h3>Tallying Ballots...</h3>
      </div>
    );
  }

  const { tallies, eliminatedPlayer, isTie } = voteResult;
  const isMeEliminated = eliminatedPlayer && eliminatedPlayer.id === currentPlayerId;

  const maxVotes = Math.max(1, ...tallies.map((t) => t.votes));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
      {/* Announcement Banner */}
      <div className={`elimination-banner ${isTie ? 'tie-banner' : 'death-banner'}`}>
        <div className="elimination-icon">
          {isTie ? '⚖️' : '💀'}
        </div>

        <div className="elimination-title">
          {isTie
            ? 'VOTE RESULT: TIE'
            : isMeEliminated
            ? 'YOU WERE ELIMINATED'
            : `${eliminatedPlayer?.name} HAS BEEN ELIMINATED`}
        </div>

        {eliminatedPlayer?.role && (
          <div
            className={`role-reveal-badge ${
              eliminatedPlayer.role === 'MAFIA' ? 'role-badge-mafia' : 'role-badge-civilian'
            }`}
          >
            <span className="role-reveal-icon">
              {eliminatedPlayer.role === 'MAFIA' ? '🗡️' : '🛡️'}
            </span>
            <span>
              SECRET IDENTITY: <strong>{eliminatedPlayer.role}</strong>
            </span>
          </div>
        )}

        <p className="elimination-subtitle">
          {isTie
            ? 'The town could not reach a majority agreement. No one was eliminated today.'
            : eliminatedPlayer?.role === 'MAFIA'
            ? `The town successfully identified a Mafia operative! ${eliminatedPlayer?.name} was eliminated.`
            : `Tragic mistake! ${eliminatedPlayer?.name} was an innocent Civilian.`}
        </p>
      </div>

      {/* Vote Breakdown / Tallies Card */}
      <div className="glass-card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Ballot Breakdown
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tallies.map((tally) => {
            const barWidth = Math.round((tally.votes / maxVotes) * 100);
            const isTarget = eliminatedPlayer && eliminatedPlayer.id === tally.playerId;

            return (
              <div key={tally.playerId} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: isTarget ? 800 : 600, color: isTarget ? 'var(--accent-crimson)' : 'var(--text-main)' }}>
                    {tally.playerName} {isTarget ? '☠️' : ''}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                    {tally.votes} {tally.votes === 1 ? 'vote' : 'votes'}
                  </span>
                </div>

                <div className="progress-bar-bg" style={{ height: '8px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${barWidth}%`,
                      background: isTarget ? 'var(--accent-crimson)' : 'rgba(255, 255, 255, 0.4)'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase Transition Note */}
      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)', padding: '0 0.5rem' }}>
        🌙 Night will fall shortly. Prepare for night actions and survival challenges.
      </div>
    </div>
  );
};
