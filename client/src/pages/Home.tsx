import React, { useState, useEffect } from 'react';
import { LobbySummary } from '@shared/types.js';

interface HomeProps {
  initialName: string;
  isJoining: boolean;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
  lobbies?: LobbySummary[];
  onRefreshLobbies?: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

export const Home: React.FC<HomeProps> = ({
  initialName,
  isJoining,
  onCreateRoom,
  onJoinRoom,
  lobbies = [],
  onRefreshLobbies
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState<string>(initialName);
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectNotice, setSelectNotice] = useState<string | null>(null);

  // Check URL query parameters for join code (e.g. ?join=M7K4 or ?room=M7K4)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('join') || params.get('room');
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase().slice(0, 4));
      setActiveTab('join');
    }
  }, []);

  const handleSelectLobby = (code: string) => {
    setRoomCode(code);
    if (name.trim()) {
      onJoinRoom(code, name.trim());
    } else {
      setActiveTab('join');
      setSelectNotice(`Selected lobby ${code}! Enter your codename to join.`);
      setTimeout(() => setSelectNotice(null), 4000);
      document.getElementById('join-name')?.focus();
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateRoom(name.trim());
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    onJoinRoom(roomCode.trim(), name.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
      {/* Hero Welcome Banner */}
      <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 900,
            letterSpacing: '0.04em',
            marginBottom: '0.35rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          MAFIA LAN
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Offline party game. Play together over your local Wi-Fi.
        </p>
      </div>

      <div className="glass-card">
        <div className="tab-container">
          <button
            type="button"
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Room
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Join Room
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="host-name">
                Your Codename
              </label>
              <input
                id="host-name"
                className="text-input"
                type="text"
                placeholder="e.g. Krish, Don Corleone"
                value={name}
                maxLength={20}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isJoining || !name.trim()}
              style={{ marginTop: '0.5rem' }}
            >
              {isJoining ? 'Creating Room...' : 'Create Room'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="join-name">
                Your Codename
              </label>
              <input
                id="join-name"
                className="text-input"
                type="text"
                placeholder="e.g. Rahul, Priya"
                value={name}
                maxLength={20}
                autoFocus={!roomCode}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="join-code">
                4-Letter Room Code
              </label>
              <input
                id="join-code"
                className="text-input code-input"
                type="text"
                placeholder="M7K4"
                value={roomCode}
                maxLength={4}
                autoCapitalize="characters"
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isJoining || !name.trim() || roomCode.length !== 4}
              style={{ marginTop: '0.5rem' }}
            >
              {isJoining ? 'Joining Room...' : 'Join Game'}
            </button>
          </form>
        )}
      </div>

      {/* Quick Select Notice Banner */}
      {selectNotice && (
        <div
          className="glass-card"
          style={{
            padding: '0.75rem 1rem',
            borderColor: 'rgba(0, 240, 255, 0.4)',
            background: 'rgba(0, 240, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
            color: 'var(--accent-cyan)'
          }}
        >
          <span>🎯</span>
          <span style={{ fontWeight: 600 }}>{selectNotice}</span>
        </div>
      )}

      {/* Active Lobbies on LAN Browser */}
      <div className="lobby-browser-card">
        <div className="lobby-browser-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📡</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0 }}>Active Lobbies on LAN</h3>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--accent-green)',
                    boxShadow: '0 0 8px var(--accent-green)'
                  }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
                Tap any lobby to join directly without typing code
              </p>
            </div>
          </div>

          {onRefreshLobbies && (
            <button
              type="button"
              className="lobby-refresh-btn"
              onClick={onRefreshLobbies}
              title="Refresh Lobbies"
            >
              ↻
            </button>
          )}
        </div>

        {lobbies.length === 0 ? (
          <div className="lobby-empty-state">
            <span style={{ fontSize: '1.4rem' }}>🔍</span>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>No Active Lobbies Found</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', maxWidth: '280px' }}>
              Create a room above to host, or ensure all players are connected to the same Wi-Fi router or hotspot.
            </span>
          </div>
        ) : (
          <div className="lobby-list">
            {lobbies.map((lobby) => (
              <div
                key={lobby.roomCode}
                className="lobby-item-card"
                onClick={() => handleSelectLobby(lobby.roomCode)}
              >
                <div className="lobby-item-left">
                  <div className="lobby-code-badge">{lobby.roomCode}</div>
                  <div className="lobby-host-info">
                    <span className="lobby-host-name">👑 {lobby.hostName}</span>
                    <span className="lobby-created-time">{formatTimeAgo(lobby.createdAt)}</span>
                  </div>
                </div>

                <div className="lobby-item-right">
                  <div className="lobby-player-count">
                    👥 {lobby.playerCount} / {lobby.maxPlayers}
                  </div>
                  <span className={`lobby-status-pill ${lobby.phase === 'LOBBY' ? 'open' : 'in-game'}`}>
                    {lobby.phase === 'LOBBY' ? 'Open' : 'In Game'}
                  </span>
                  <button
                    type="button"
                    className="lobby-quick-join-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLobby(lobby.roomCode);
                    }}
                  >
                    Join →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: '0.8rem',
          color: 'var(--text-dim)',
          textAlign: 'center',
          lineHeight: 1.4,
          padding: '0 0.5rem'
        }}
      >
        💡 Make sure all phones are connected to the exact same Wi-Fi router or mobile hotspot. No internet required.
      </div>
    </div>
  );
};
