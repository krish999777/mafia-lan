import React from 'react';
import { useLobby } from './hooks/useLobby.js';
import { Header } from './components/Header.js';
import { Home } from './pages/Home.js';
import { Lobby } from './pages/Lobby.js';
import { RoleReveal } from './components/RoleReveal.js';
import { Day } from './pages/Day.js';
import { Voting } from './pages/Voting.js';
import { DayElimination } from './pages/DayElimination.js';
import { GameOver } from './pages/GameOver.js';
import { Night } from './pages/Night.js';
import { NightResolution } from './pages/NightResolution.js';

export const App: React.FC = () => {
  const {
    isConnected,
    roomCode,
    playerId,
    playerName,
    isHost,
    players,
    phase,
    round,
    phaseEndsAt,
    role,
    teammates,
    hasVoted,
    votedCount,
    totalLiving,
    voteResult,
    mafiaCount,
    gameOverResult,
    rejoinedPlayerIds,
    hasRejoinedLobby,
    mafiaMessages,
    mafiaTargetVotes,
    mafiaTargetId,
    isMafiaUnanimous,
    mafiaRequiredVotes,
    minigameChallenge,
    minigameResult,
    minigameScore,
    nightResult,
    provenCivilianIds,
    error,
    lanInfo,
    isJoining,
    createRoom,
    joinRoom,
    startGame,
    startVoting,
    castVote,
    forceResolveVote,
    setMafiaCount,
    rejoinLobby,
    resetToLobby,
    sendMafiaMessage,
    selectMafiaTarget,
    submitMinigameAction,
    forceResolveNight,
    forceResolveDawn,
    leaveRoom,
    dismissError
  } = useLobby();

  // Route according to active room and server-authoritative phase
  const renderContent = () => {
    if (!roomCode) {
      return (
        <Home
          initialName={playerName}
          isJoining={isJoining}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
        />
      );
    }

    switch (phase) {
      case 'ROLE_REVEAL':
        if (role) {
          return (
            <RoleReveal
              role={role}
              teammates={teammates}
              phaseEndsAt={phaseEndsAt || undefined}
            />
          );
        }
        return (
          <div className="glass-card" style={{ textAlign: 'center', marginTop: '2rem', padding: '2rem' }}>
            <div className="connection-dot online pulse-dot" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Assigning Secret Roles...</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Keep your screen hidden from others.
            </p>
          </div>
        );

      case 'DAY':
        return (
          <Day
            round={round}
            players={players}
            currentPlayerId={playerId}
            role={role}
            isHost={isHost}
            nightResult={nightResult}
            provenCivilianIds={provenCivilianIds}
            onStartVoting={startVoting}
          />
        );

      case 'VOTING':
        return (
          <Voting
            players={players}
            currentPlayerId={playerId}
            isHost={isHost}
            hasVoted={hasVoted}
            votedCount={votedCount}
            totalLiving={totalLiving}
            provenCivilianIds={provenCivilianIds}
            onCastVote={castVote}
            onForceResolve={forceResolveVote}
          />
        );

      case 'DAY_ELIMINATION':
        return (
          <DayElimination
            voteResult={voteResult}
            currentPlayerId={playerId}
          />
        );

      case 'NIGHT':
        return (
          <Night
            round={round}
            role={role}
            teammates={teammates}
            players={players}
            currentPlayerId={playerId}
            isHost={isHost}
            phaseEndsAt={phaseEndsAt}
            mafiaMessages={mafiaMessages}
            mafiaTargetVotes={mafiaTargetVotes}
            mafiaTargetId={mafiaTargetId}
            isMafiaUnanimous={isMafiaUnanimous}
            mafiaRequiredVotes={mafiaRequiredVotes}
            minigameChallenge={minigameChallenge}
            minigameResult={minigameResult}
            minigameScore={minigameScore}
            onSendMafiaMessage={sendMafiaMessage}
            onSelectMafiaTarget={selectMafiaTarget}
            onSubmitMinigameAction={submitMinigameAction}
            onForceResolveNight={forceResolveNight}
          />
        );

      case 'NIGHT_RESOLUTION':
        return (
          <NightResolution
            nightResult={nightResult}
            players={players}
            currentPlayerId={playerId}
            round={round}
            isHost={isHost}
            phaseEndsAt={phaseEndsAt}
            onForceResolveDawn={forceResolveDawn}
          />
        );

      case 'GAME_OVER':
        if (hasRejoinedLobby) {
          return (
            <Lobby
              roomCode={roomCode}
              currentPlayerId={playerId}
              isHost={isHost}
              players={players}
              lanInfo={lanInfo}
              mafiaCount={mafiaCount}
              rejoinedPlayerIds={rejoinedPlayerIds}
              onSetMafiaCount={setMafiaCount}
              onStartGame={startGame}
              onLeaveRoom={leaveRoom}
              onResetToLobby={resetToLobby}
            />
          );
        }
        return (
          <GameOver
            gameOverResult={gameOverResult}
            currentPlayerId={playerId}
            players={players}
            isHost={isHost}
            onRejoinLobby={rejoinLobby}
            onResetToLobby={resetToLobby}
          />
        );

      case 'LOBBY':
      default:
        return (
          <Lobby
            roomCode={roomCode}
            currentPlayerId={playerId}
            isHost={isHost}
            players={players}
            lanInfo={lanInfo}
            mafiaCount={mafiaCount}
            rejoinedPlayerIds={rejoinedPlayerIds}
            onSetMafiaCount={setMafiaCount}
            onStartGame={startGame}
            onLeaveRoom={leaveRoom}
            onResetToLobby={resetToLobby}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Header
        isConnected={isConnected}
        roomCode={roomCode}
        phase={phase}
        onResetToLobby={resetToLobby}
        onLeaveRoom={leaveRoom}
      />

      {renderContent()}

      {/* Error Toast */}
      {error && (
        <div className="toast-error" onClick={dismissError}>
          <span>⚠️</span>
          <span>{error}</span>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              marginLeft: 'auto',
              fontWeight: 'bold',
              padding: '0 0.25rem'
            }}
            onClick={dismissError}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
