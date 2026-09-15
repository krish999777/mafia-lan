import React, { useState, useEffect } from 'react';
import { Role } from '@shared/types.js';

interface RoleRevealProps {
  role: Role;
  teammates?: { id: string; name: string }[];
  phaseEndsAt?: number;
}

export const RoleReveal: React.FC<RoleRevealProps> = ({ role, teammates, phaseEndsAt }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (phaseEndsAt) {
      return Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
    }
    return 8;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (phaseEndsAt) {
        const remaining = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
        setSecondsRemaining(remaining);
      } else {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
      }
    }, 250);

    return () => clearInterval(timer);
  }, [phaseEndsAt]);

  const isMafia = role === 'MAFIA';

  return (
    <div className="role-reveal-container">
      {/* Top Phase Timer */}
      <div className="reveal-timer-pill">
        <span>Day 1 begins in</span>
        <span className="timer-digits">00:{String(secondsRemaining).padStart(2, '0')}</span>
      </div>

      {/* Dramatic Role Card */}
      <div className={`role-card ${isMafia ? 'role-mafia' : 'role-civilian'}`}>
        <div className="role-badge-pill">
          {isMafia ? '⚠️ SYNDICATE • CLASSIFIED' : '🛡️ CITIZEN • INNOCENT'}
        </div>

        <div className="role-icon">{isMafia ? '🗡️' : '⚖️'}</div>

        <h1 className="role-title">{isMafia ? 'MAFIA' : 'CIVILIAN'}</h1>

        <p className="role-description">
          {isMafia
            ? 'Eliminate the civilians under the shroud of night. Blend in during the day.'
            : 'Work with other citizens during discussions to uncover and eliminate all Mafia members.'}
        </p>

        {/* Mafia Teammates Section */}
        {isMafia && (
          <div className="teammates-box">
            <div className="teammates-header">Your Mafia Teammates:</div>
            {teammates && teammates.length > 0 ? (
              <div className="teammates-list">
                {teammates.map((tm) => (
                  <div key={tm.id} className="teammate-item">
                    <span>🕵️</span>
                    <span className="teammate-name">{tm.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="teammate-lone">You are the lone Syndicate operative.</div>
            )}
          </div>
        )}

        {/* Civilian Objective Tip */}
        {!isMafia && (
          <div className="civilian-tip-box">
            💡 Stay sharp during the night minigames to survive. Listen carefully to players during day voting.
          </div>
        )}
      </div>

      <div className="role-privacy-warning">
        🤫 Keep your phone screen hidden from other players!
      </div>
    </div>
  );
};
