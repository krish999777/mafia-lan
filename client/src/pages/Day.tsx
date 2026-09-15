import { PlayerSummary, Role, NightResolutionResult } from '@shared/types.js';
import { PlayerCard } from '../components/PlayerCard.js';

interface DayProps {
  round: number;
  players: PlayerSummary[];
  currentPlayerId: string | null;
  role: Role | null;
  isHost: boolean;
  nightResult?: NightResolutionResult | null;
  onStartVoting: () => void;
}

export const Day: React.FC<DayProps> = ({
  round,
  players,
  currentPlayerId,
  role,
  isHost,
  nightResult,
  onStartVoting
}) => {
  const livingPlayers = players.filter((p) => p.alive);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
      {/* Day Header Banner */}
      <div className="day-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="day-title">DAY {round || 1}</div>
            <div className="day-subtitle">Open Discussion</div>
          </div>

          {role && (
            <div
              className="role-pill-discrete"
              style={{
                background: role === 'MAFIA' ? 'rgba(230, 57, 70, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                borderColor: role === 'MAFIA' ? 'rgba(230, 57, 70, 0.4)' : 'rgba(56, 189, 248, 0.3)',
                color: role === 'MAFIA' ? '#ff4d6d' : '#38bdf8'
              }}
            >
              <span>{role === 'MAFIA' ? '🗡️' : '🛡️'}</span>
              <span>{role}</span>
            </div>
          )}
        </div>
      </div>

      {/* Morning Casualty Briefing from Night */}
      {nightResult && nightResult.disappearedPlayers.length > 0 && (
        <div className="glass-card day-casualty-briefing">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🪦</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
              Casualties from Last Night ({nightResult.disappearedPlayers.length})
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
            {nightResult.disappearedPlayers.map((p) => p.name).join(', ')} disappeared into the shadows before dawn.
          </p>
        </div>
      )}

      {/* Discussion prompt */}
      <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>🗣️</div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem', color: '#fff' }}>
          Who is behaving suspiciously?
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Discuss aloud with the other players in the room. Analyze who might be the Mafia traitors.
        </p>
      </div>

      {/* Living Players Roster */}
      <div>
        <div className="player-list-header">
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Living Players ({livingPlayers.length})
          </h2>
        </div>

        <div className="player-card-list">
          {livingPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === currentPlayerId}
            />
          ))}
        </div>
      </div>

      {/* Host Control for Voting */}
      {isHost ? (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
              👑 Host Controls
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Day Discussion
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onStartVoting}
          >
            [ START VOTING ]
          </button>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '0.5rem' }}>
            Trigger voting whenever table discussion concludes.
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', padding: '0.5rem' }}>
          Waiting for host to commence voting when discussion wraps up.
        </div>
      )}
    </div>
  );
};
