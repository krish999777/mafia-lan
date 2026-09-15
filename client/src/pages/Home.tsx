import React, { useState, useEffect } from 'react';

interface HomeProps {
  initialName: string;
  isJoining: boolean;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  initialName,
  isJoining,
  onCreateRoom,
  onJoinRoom
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState<string>(initialName);
  const [roomCode, setRoomCode] = useState<string>('');

  // Check URL query parameters for join code (e.g. ?join=M7K4 or ?room=M7K4)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('join') || params.get('room');
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase().slice(0, 4));
      setActiveTab('join');
    }
  }, []);

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
