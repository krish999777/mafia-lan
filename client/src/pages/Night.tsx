import React, { useState, useEffect, useRef } from 'react';
import { PlayerSummary, Role, MafiaChatMessage, MinigameChallenge } from '@shared/types.js';
import { NumberSequenceGame } from '../components/minigames/NumberSequenceGame.js';
import { MemoryGridGame } from '../components/minigames/MemoryGridGame.js';
import { ReactionTestGame } from '../components/minigames/ReactionTestGame.js';
import { QuickMathGame } from '../components/minigames/QuickMathGame.js';
import { ColorMatchGame } from '../components/minigames/ColorMatchGame.js';
import { OddOneOutGame } from '../components/minigames/OddOneOutGame.js';
import { FindNumberGame } from '../components/minigames/FindNumberGame.js';
import { TapInOrderGame } from '../components/minigames/TapInOrderGame.js';
import { PatternCompletionGame } from '../components/minigames/PatternCompletionGame.js';
import { CountShapesGame } from '../components/minigames/CountShapesGame.js';

interface NightProps {
  round: number;
  role: Role | null;
  teammates: { id: string; name: string }[];
  players: PlayerSummary[];
  currentPlayerId: string | null;
  isHost: boolean;
  phaseEndsAt: number | null;
  mafiaMessages: MafiaChatMessage[];
  mafiaTargetVotes: Record<string, string>;
  mafiaTargetId: string | null;
  isMafiaUnanimous?: boolean;
  mafiaRequiredVotes?: number;
  minigameChallenge: MinigameChallenge | null;
  minigameResult: { passed: boolean; message: string } | null;
  minigameScore?: number;
  onSendMafiaMessage: (text: string) => void;
  onSelectMafiaTarget: (targetPlayerId: string) => void;
  onSubmitMinigameAction: (token: string, payload: any) => void;
  onForceResolveNight: () => void;
}

export const Night: React.FC<NightProps> = ({
  round,
  role,
  teammates,
  players,
  currentPlayerId,
  isHost,
  phaseEndsAt,
  mafiaMessages,
  mafiaTargetVotes,
  mafiaTargetId,
  isMafiaUnanimous = false,
  mafiaRequiredVotes = 1,
  minigameChallenge,
  minigameResult,
  minigameScore = 0,
  onSendMafiaMessage,
  onSelectMafiaTarget,
  onSubmitMinigameAction,
  onForceResolveNight
}) => {
  const [inputText, setInputText] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [feedbackToast, setFeedbackToast] = useState<{ passed: boolean; message: string } | null>(null);
  const [mafiaActiveTab, setMafiaActiveTab] = useState<'PUZZLE' | 'SYNDICATE'>('PUZZLE');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Transient toast notification for minigame results
  useEffect(() => {
    if (minigameResult) {
      setFeedbackToast(minigameResult);
      const timer = setTimeout(() => {
        setFeedbackToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [minigameResult]);

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const isAlive = currentPlayer ? currentPlayer.alive : false;
  const isMafia = role === 'MAFIA';
  const isCivilian = role === 'CIVILIAN';

  // When Mafia is in puzzle view, show identical Civilian disguise
  const showDisguise = isMafia && mafiaActiveTab === 'PUZZLE';
  const displayAsMafia = isMafia && !showDisguise;

  // Eligible targets for Mafia (living players who are NOT Mafia)
  // From Mafia's perspective, teammates are known Mafia, so filter them out
  const mafiaIds = new Set([currentPlayerId, ...teammates.map((t) => t.id)]);
  const eligibleTargets = players.filter((p) => p.alive && !mafiaIds.has(p.id));

  const livingMafiaCount = teammates.length + 1;
  const requiredVotes = mafiaRequiredVotes || livingMafiaCount;
  const isConsensusReached = Boolean(isMafiaUnanimous && mafiaTargetId);
  const leadingTargetPlayer = mafiaTargetId ? players.find((p) => p.id === mafiaTargetId) : null;
  const agreedOnLeadingTarget = mafiaTargetId
    ? Object.values(mafiaTargetVotes).filter((tId) => tId === mafiaTargetId).length
    : 0;

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

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mafiaMessages.length]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMafiaMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Find who voted for each candidate among Mafia
  const getVotesForTarget = (targetId: string) => {
    const voterNames: string[] = [];
    for (const [mId, tId] of Object.entries(mafiaTargetVotes)) {
      if (tId === targetId) {
        if (mId === currentPlayerId) {
          voterNames.push('You');
        } else {
          const teammate = teammates.find((t) => t.id === mId);
          voterNames.push(teammate ? teammate.name : 'Teammate');
        }
      }
    }
    return voterNames;
  };

  return (
    <div className="night-page-container">
      {/* Night Atmosphere Header */}
      <div className={`night-banner ${displayAsMafia ? 'mafia-night-banner' : ''}`}>
        <div className="night-banner-top">
          <div className="night-title-group">
            <span className="night-moon-icon">🌙</span>
            <div>
              <h2 className="night-title">NIGHT {round || 1}</h2>
              <p className="night-subtitle">
                {displayAsMafia ? 'Mafia Syndicate Operation' : 'Town Lockdown & Defense'}
              </p>
            </div>
          </div>

          <div className="night-timer-chip">
            <span className="timer-pulse">⏱️</span>
            <span>{secondsRemaining}s</span>
          </div>
        </div>

        {/* Role Identity Indicator */}
        <div className="night-role-badge">
          <span>{displayAsMafia ? '🗡️ Mafia' : isCivilian || showDisguise ? '🛡️ Civilian' : '👁️ Spectator'}</span>
          <span className="night-alive-status">
            {isAlive ? '• ACTIVE' : '• ELIMINATED'}
          </span>
        </div>
      </div>

      {/* Dead Spectator View */}
      {!isAlive && (
        <div className="glass-card spectator-card">
          <div className="spectator-icon">👻</div>
          <h3>You are Spectating</h3>
          <p>
            The town is silent. Secret actions are being executed in the dark.
            Results will be revealed at sunrise.
          </p>
        </div>
      )}

      {/* LIVING MAFIA VIEW (Syndicate Mode) */}
      {isAlive && isMafia && mafiaActiveTab === 'SYNDICATE' && (
        <div className="mafia-night-content">
          {/* Syndicate Roster */}
          <div className="glass-card mafia-syndicate-card">
            <div className="syndicate-header">
              <span className="syndicate-icon">🤝</span>
              <span className="syndicate-title">Mafia Syndicate</span>
              <span className="syndicate-count-pill">{livingMafiaCount} Members</span>
            </div>
            <div className="syndicate-list">
              <span className="teammate-pill current-player">You ({currentPlayer?.name})</span>
              {teammates.map((mate) => (
                <span key={mate.id} className="teammate-pill">
                  {mate.name}
                </span>
              ))}
            </div>
          </div>

          {/* Unanimous Consensus Status Alert */}
          <div
            className={`consensus-status-alert ${
              isConsensusReached ? 'consensus-status-locked' : 'consensus-status-pending'
            }`}
          >
            <div className="consensus-alert-icon">{isConsensusReached ? '🎯' : '⚠️'}</div>
            <div className="consensus-alert-content">
              <div className="consensus-alert-title">
                {isConsensusReached
                  ? 'UNANIMOUS ASSASSINATION LOCKED'
                  : `CONSENSUS PENDING (${agreedOnLeadingTarget}/${requiredVotes} AGREED)`}
              </div>
              <div className="consensus-alert-desc">
                {isConsensusReached
                  ? `All ${requiredVotes} Mafia members have selected ${leadingTargetPlayer?.name || 'the target'}. The kill is locked for dawn!`
                  : `All ${requiredVotes} Mafia members must select the exact same target. If any Mafia votes differently or does not vote, NO ONE will be killed tonight!`}
              </div>
            </div>
          </div>

          {/* Target Selection Section */}
          <div className="night-section">
            <div className="night-section-header">
              <span className="section-step-tag">Step 1</span>
              <h3 className="section-title">Coordinate Syndicate Hit</h3>
            </div>
            <p className="section-hint">
              Tap a citizen below. All {requiredVotes} Syndicate members must select the same player to execute them.
            </p>

            <div className="night-target-list">
              {eligibleTargets.length === 0 ? (
                <div className="empty-targets-msg">No eligible targets remaining.</div>
              ) : (
                eligibleTargets.map((target) => {
                  const isCurrentSelection = mafiaTargetVotes[currentPlayerId || ''] === target.id;
                  const voters = getVotesForTarget(target.id);
                  const isTargetUnanimous = voters.length === requiredVotes && requiredVotes > 0;

                  return (
                    <div
                      key={target.id}
                      className={`night-target-card ${isTargetUnanimous ? 'consensus-target' : ''} ${
                        isCurrentSelection ? 'my-selection' : ''
                      }`}
                      onClick={() => onSelectMafiaTarget(target.id)}
                    >
                      <div className="target-card-info">
                        <div className="target-name">
                          {isTargetUnanimous ? (
                            <span className="crosshair-icon">🎯</span>
                          ) : voters.length > 0 ? (
                            <span className="crosshair-icon">👀</span>
                          ) : null}
                          <span>{target.name}</span>
                        </div>
                        <div className="target-voters-row">
                          {voters.length > 0 ? (
                            <span className={`voters-badge ${isTargetUnanimous ? 'badge-locked' : 'badge-progress'}`}>
                              {isTargetUnanimous
                                ? '🎯 100% UNANIMOUS HIT'
                                : `Voted: ${voters.join(', ')} (${voters.length}/${requiredVotes})`}
                            </span>
                          ) : (
                            <span className="voters-empty">0 / {requiredVotes} votes</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn ${
                          isCurrentSelection ? 'btn-danger' : 'btn-outline-danger'
                        } target-pick-btn`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMafiaTarget(target.id);
                        }}
                      >
                        {isCurrentSelection ? 'Selected 🎯' : 'Select'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Private Mafia Chat Section */}
          <div className="night-section chat-section">
            <div className="night-section-header">
              <span className="section-step-tag">Step 2</span>
              <h3 className="section-title">Private Syndicate Chat</h3>
              <span className="chat-secure-badge">🔒 Encrypted</span>
            </div>

            <div className="mafia-chat-box">
              <div className="chat-messages-container">
                {mafiaMessages.length === 0 ? (
                  <div className="chat-empty-msg">
                    No messages yet. Send a whisper to your syndicate!
                  </div>
                ) : (
                  mafiaMessages.map((msg) => {
                    const isMe = msg.senderId === currentPlayerId;
                    return (
                      <div
                        key={msg.id}
                        className={`chat-message-bubble ${isMe ? 'msg-outgoing' : 'msg-incoming'}`}
                      >
                        <div className="msg-sender">{isMe ? 'You' : msg.senderName}</div>
                        <div className="msg-text">{msg.text}</div>
                        <div className="msg-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              <form className="chat-input-row" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Whisper to Mafia syndicate..."
                  value={inputText}
                  maxLength={200}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="submit"
                  className="btn btn-primary chat-send-btn"
                  disabled={!inputText.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Disguise Toggle: Switch back to Defense Puzzle */}
          <div className="night-view-switcher-bar">
            <button
              type="button"
              className="night-switcher-btn puzzle-btn"
              onClick={() => setMafiaActiveTab('PUZZLE')}
            >
              <span className="btn-icon">🛡️</span>
              <span>Back to Defense Puzzle (Disguise)</span>
            </button>
          </div>
        </div>
      )}

      {/* LIVING CIVILIAN / MAFIA PUZZLE DISGUISE VIEW */}
      {isAlive && (isCivilian || (isMafia && mafiaActiveTab === 'PUZZLE')) && (
        <div className="civilian-night-content">
          {/* Defense HUD & Guaranteed Innocent Incentive */}
          <div className="glass-card civilian-defense-hud">
            <div className="defense-hud-top">
              <div className="defense-score-badge">
                <span className="shield-icon">🛡️</span>
                <div>
                  <div className="score-label">DEFENSES SECURED</div>
                  <div className="score-value">{minigameScore} Solved</div>
                </div>
              </div>
              <div className="defense-guarantee-pill">
                ⭐ Top Defender Revealed as <strong>PROVEN INNOCENT</strong> at Dawn!
              </div>
            </div>
            <p className="defense-hint">
              Defense tasks generate on a continuous loop. Keep solving as many as you can before morning to prove your innocence to the town!
            </p>
          </div>

          {/* Transient Result Feedback Toast */}
          {feedbackToast && (
            <div
              className={`minigame-feedback-toast ${
                feedbackToast.passed ? 'toast-success' : 'toast-failed'
              }`}
            >
              <span className="toast-icon">{feedbackToast.passed ? '✅' : '⚠️'}</span>
              <span className="toast-text">{feedbackToast.message}</span>
            </div>
          )}

          {/* Continuous Minigame Challenge Loop */}
          {minigameChallenge ? (
            <div className="minigame-wrapper" key={minigameChallenge.token}>
              {minigameChallenge.id === 'number-sequence' && (
                <NumberSequenceGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'memory-grid' && (
                <MemoryGridGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'reaction-test' && (
                <ReactionTestGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'quick-math' && (
                <QuickMathGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'color-match' && (
                <ColorMatchGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'odd-one-out' && (
                <OddOneOutGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'find-number' && (
                <FindNumberGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'tap-in-order' && (
                <TapInOrderGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'pattern-completion' && (
                <PatternCompletionGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}

              {minigameChallenge.id === 'count-shapes' && (
                <CountShapesGame
                  challenge={minigameChallenge}
                  onSubmit={(payload) =>
                    onSubmitMinigameAction(minigameChallenge.token, payload)
                  }
                />
              )}
            </div>
          ) : (
            <div className="glass-card minigame-waiting-card">
              <div className="status-pulsing" style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>
                📡
              </div>
              <h3>Generating Next Security Task...</h3>
              <p>Calibrating defense challenge. Stand by...</p>
            </div>
          )}

          {/* If Mafia in Disguise: Switcher button to access Syndicate Hit */}
          {isMafia && (
            <div className="night-view-switcher-bar">
              <button
                type="button"
                className="night-switcher-btn syndicate-btn"
                onClick={() => setMafiaActiveTab('SYNDICATE')}
              >
                <span className="btn-icon">🗡️</span>
                <span>Switch to Syndicate Hit</span>
                {isConsensusReached && <span className="consensus-badge">🎯 Locked</span>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Host Controls */}
      {isHost && (
        <div className="glass-card host-night-controls">
          <div className="host-controls-header">
            <span className="host-crown-badge">👑 Host Options</span>
            <span className="host-phase-hint">Night Resolution</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary resolve-night-btn"
            onClick={onForceResolveNight}
          >
            [ Advance to Daybreak (Skip Timer) ]
          </button>
        </div>
      )}
    </div>
  );
};
