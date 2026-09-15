import React, { useState, useEffect } from 'react';
import { NightResolutionResult, PlayerSummary } from '@shared/types.js';

interface NightResolutionProps {
  nightResult: NightResolutionResult | null;
  players: PlayerSummary[];
  currentPlayerId: string | null;
  round: number;
  isHost: boolean;
  phaseEndsAt: number | null;
  onForceResolveDawn: () => void;
}

export const NightResolution: React.FC<NightResolutionProps> = ({
  nightResult,
  players,
  currentPlayerId,
  round,
  isHost,
  phaseEndsAt,
  onForceResolveDawn
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(7);

  const disappearedPlayers = nightResult?.disappearedPlayers || [];
  const didCurrentPlayerDie = disappearedPlayers.some((p) => p.id === currentPlayerId);

  // Countdown timer calculation
  useEffect(() => {
    if (!phaseEndsAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((phaseEndsAt - now) / 1000));
      setSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [phaseEndsAt]);

  return (
    <div className="dawn-page-container">
      {/* Sunrise Header Banner */}
      <div className="dawn-banner">
        <div className="dawn-banner-top">
          <div className="dawn-title-group">
            <span className="dawn-sun-icon">🌅</span>
            <div>
              <h2 className="dawn-title">DAWN OF DAY {round + 1}</h2>
              <p className="dawn-subtitle">
                The morning bell tolls • {players.filter((p) => p.alive).length} citizens remain
              </p>
            </div>
          </div>

          <div className="dawn-timer-chip">
            <span className="timer-pulse">⏱️</span>
            <span>{secondsRemaining}s</span>
          </div>
        </div>
      </div>

      {/* Personal Survival / Elimination Notice */}
      <div
        className={`glass-card dawn-status-banner ${
          didCurrentPlayerDie ? 'status-dead' : 'status-alive'
        }`}
      >
        <span className="status-banner-icon">{didCurrentPlayerDie ? '💀' : '🛡️'}</span>
        <div>
          <h4 className="status-banner-title">
            {didCurrentPlayerDie
              ? 'YOU WERE ELIMINATED TONIGHT'
              : 'YOU SURVIVED UNTIL SUNRISE'}
          </h4>
          <p className="status-banner-desc">
            {didCurrentPlayerDie
              ? 'You did not make it through the darkness. You are now a spectator.'
              : 'You made it through the night alive. Prepare for the town assembly.'}
          </p>
        </div>
      </div>

      {/* Proven Innocent Civilian Showcase */}
      {nightResult?.topDefender && (
        <div className="glass-card top-defender-showcase-card">
          <div className="defender-crown-icon">🌟</div>
          <div className="defender-badge-title">PROVEN INNOCENT CIVILIAN</div>
          <h3 className="defender-player-name">
            {nightResult.topDefender.name}
            {nightResult.topDefender.id === currentPlayerId && (
              <span className="me-tag"> (You!)</span>
            )}
          </h3>
          <div className="defender-stats-pill">
            🛡️ {nightResult.topDefender.score} Defense {nightResult.topDefender.score === 1 ? 'Task' : 'Tasks'} Completed Tonight
          </div>
          <p className="defender-clearance-text">
            Confirmed 100% <strong>INNOCENT CIVILIAN</strong> by the town defense grid. They cannot be Mafia!
          </p>
        </div>
      )}

      {/* Concealed Casualty Report */}
      <div className="dawn-report-section">
        <div className="report-header">
          <h3 className="report-title">Morning Casualty Report</h3>
          <span className="report-badge">Concealed Report</span>
        </div>

        {disappearedPlayers.length === 0 ? (
          <div className="glass-card peaceful-night-card">
            <div className="peaceful-icon">🕊️</div>
            <h4>A Quiet Night</h4>
            <p>
              No citizens disappeared during the night. All safehouses held strong!
            </p>
          </div>
        ) : (
          <div className="disappeared-roster">
            <div className="disappeared-summary-text">
              <span className="casualty-count">{disappearedPlayers.length}</span>{' '}
              {disappearedPlayers.length === 1 ? 'citizen' : 'citizens'} vanished into the night shadows:
            </div>

            <div className="disappeared-cards-grid">
              {disappearedPlayers.map((victim) => {
                const isMe = victim.id === currentPlayerId;
                return (
                  <div
                    key={victim.id}
                    className={`glass-card casualty-card ${isMe ? 'my-casualty-card' : ''}`}
                  >
                    <div className="casualty-tombstone-icon">🪦</div>
                    <div className="casualty-info">
                      <div className="casualty-name">
                        {victim.name} {isMe && <span className="me-tag">(You)</span>}
                      </div>
                      <div className="casualty-epitaph">
                        Disappeared before daybreak
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="concealment-disclaimer">
              ℹ️ The causes of disappearance and secret roles remain completely unknown.
            </p>
          </div>
        )}
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="glass-card host-dawn-controls">
          <div className="host-dawn-header">
            <span className="host-dawn-badge">👑 Host Option</span>
            <span className="host-dawn-hint">Skip Resolution</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary resolve-dawn-btn"
            onClick={onForceResolveDawn}
          >
            [ Advance to Daytime Discussion ]
          </button>
        </div>
      )}
    </div>
  );
};
