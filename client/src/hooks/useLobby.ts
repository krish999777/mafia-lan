import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../lib/socket.js';
import { storage } from '../lib/storage.js';
import { PlayerSummary, GamePhase, LanInfo, Role, VoteResult, GameOverResult, MafiaChatMessage, MinigameChallenge, NightResolutionResult } from '@shared/types.js';

export function useLobby() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string | null>(storage.getRoomCode());
  const [playerId, setPlayerId] = useState<string | null>(storage.getPlayerId());
  const [playerName, setPlayerName] = useState<string>(storage.getPlayerName());
  const [isHost, setIsHost] = useState<boolean>(false);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [round, setRound] = useState<number>(1);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [teammates, setTeammates] = useState<{ id: string; name: string }[]>([]);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [votedCount, setVotedCount] = useState<number>(0);
  const [totalLiving, setTotalLiving] = useState<number>(0);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [mafiaCount, setMafiaCountState] = useState<number>(1);
  const [gameOverResult, setGameOverResult] = useState<GameOverResult | null>(null);
  const [rejoinedPlayerIds, setRejoinedPlayerIds] = useState<string[]>([]);
  const [hasRejoinedLobby, setHasRejoinedLobby] = useState<boolean>(false);
  const [mafiaMessages, setMafiaMessages] = useState<MafiaChatMessage[]>([]);
  const [mafiaTargetVotes, setMafiaTargetVotes] = useState<Record<string, string>>({});
  const [mafiaTargetId, setMafiaTargetId] = useState<string | null>(null);
  const [minigameChallenge, setMinigameChallenge] = useState<MinigameChallenge | null>(null);
  const [minigameResult, setMinigameResult] = useState<{ passed: boolean; message: string } | null>(null);
  const [nightResult, setNightResult] = useState<NightResolutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lanInfo, setLanInfo] = useState<LanInfo | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Fetch LAN info for QR generation
  useEffect(() => {
    fetch('/api/lan-info')
      .then((res) => res.json())
      .then((data: LanInfo) => setLanInfo(data))
      .catch((err) => console.warn('Could not fetch LAN info:', err));
  }, []);

  // Socket status & message handling
  useEffect(() => {
    socketService.connect();

    const unsubStatus = socketService.onStatusChange((connected) => {
      setIsConnected(connected);

      // If connected and we have stored room & player ID, try reconnecting
      if (connected) {
        const savedRoom = storage.getRoomCode();
        const savedPlayer = storage.getPlayerId();
        if (savedRoom && savedPlayer) {
          socketService.send({
            type: 'RECONNECT',
            roomCode: savedRoom,
            playerId: savedPlayer
          });
        }
      }
    });

    const unsubMessage = socketService.onMessage((msg) => {
      switch (msg.type) {
        case 'ROOM_CREATED':
          setRoomCode(msg.roomCode);
          setPlayerId(msg.playerId);
          setIsHost(true);
          storage.setRoomCode(msg.roomCode);
          storage.setPlayerId(msg.playerId);
          setIsJoining(false);
          setError(null);
          break;

        case 'ROOM_JOINED':
          setRoomCode(msg.roomCode);
          setPlayerId(msg.playerId);
          setIsHost(msg.isHost);
          setPlayers(msg.players);
          storage.setRoomCode(msg.roomCode);
          storage.setPlayerId(msg.playerId);
          setIsJoining(false);
          setError(null);
          break;

        case 'ROOM_STATE':
          setRoomCode(msg.roomCode);
          setPlayers(msg.players);
          setPhase(msg.phase);
          if (msg.round) setRound(msg.round);
          if (msg.phaseEndsAt) setPhaseEndsAt(msg.phaseEndsAt);
          else setPhaseEndsAt(null);
          if (msg.mafiaCount) setMafiaCountState(msg.mafiaCount);
          if (msg.rejoinedPlayerIds) setRejoinedPlayerIds(msg.rejoinedPlayerIds);
          if (msg.nightResult) setNightResult(msg.nightResult);

          if (msg.phase === 'LOBBY') {
            setRole(null);
            setTeammates([]);
            setHasVoted(false);
            setVoteResult(null);
            setPhaseEndsAt(null);
            setGameOverResult(null);
            setHasRejoinedLobby(false);
            setMafiaMessages([]);
            setMafiaTargetVotes({});
            setMafiaTargetId(null);
            setMinigameChallenge(null);
            setMinigameResult(null);
            setNightResult(null);
          } else if (msg.phase === 'DAY') {
            setHasVoted(false);
            setVoteResult(null);
            setMinigameChallenge(null);
            setMinigameResult(null);
          } else if (msg.phase === 'NIGHT') {
            setMinigameResult(null);
          }

          const currentPid = storage.getPlayerId();
          if (currentPid) {
            setIsHost(msg.hostId === currentPid);
            if (msg.rejoinedPlayerIds && msg.rejoinedPlayerIds.includes(currentPid)) {
              setHasRejoinedLobby(true);
            }
          }
          break;

        case 'ROLE_ASSIGNED':
          setRole(msg.role);
          setTeammates(msg.teammates || []);
          if (msg.durationMs) {
            setPhaseEndsAt(Date.now() + msg.durationMs);
          }
          break;

        case 'VOTE_PROGRESS':
          setVotedCount(msg.votedCount);
          setTotalLiving(msg.totalLiving);
          setHasVoted(msg.hasVoted);
          break;

        case 'VOTE_RESULT':
          setVoteResult({
            tallies: msg.tallies,
            eliminatedPlayer: msg.eliminatedPlayer,
            isTie: msg.isTie,
            durationMs: msg.durationMs
          });
          if (msg.durationMs) {
            setPhaseEndsAt(Date.now() + msg.durationMs);
          }
          break;

        case 'GAME_OVER':
          setGameOverResult({
            winner: msg.winner,
            mafiaPlayers: msg.mafiaPlayers,
            allPlayers: msg.allPlayers,
            rejoinedPlayerIds: msg.rejoinedPlayerIds
          });
          const myId = storage.getPlayerId();
          if (myId && msg.rejoinedPlayerIds && msg.rejoinedPlayerIds.includes(myId)) {
            setHasRejoinedLobby(true);
          } else {
            setHasRejoinedLobby(false);
          }
          setRejoinedPlayerIds(msg.rejoinedPlayerIds || []);
          break;

        case 'REJOIN_UPDATE':
          setRejoinedPlayerIds(msg.rejoinedPlayerIds);
          const myPid = storage.getPlayerId();
          if (myPid && msg.rejoinedPlayerIds.includes(myPid)) {
            setHasRejoinedLobby(true);
          }
          break;

        case 'PLAYER_JOINED':
          setPlayers((prev) => {
            const exists = prev.some((p) => p.id === msg.player.id);
            if (exists) {
              return prev.map((p) => (p.id === msg.player.id ? msg.player : p));
            }
            return [...prev, msg.player];
          });
          break;

        case 'PLAYER_LEFT':
          setPlayers((prev) => prev.filter((p) => p.id !== msg.playerId));
          break;

        case 'PLAYER_STATUS_CHANGED':
          setPlayers((prev) =>
            prev.map((p) => (p.id === msg.playerId ? { ...p, connected: msg.connected } : p))
          );
          break;

        case 'MAFIA_CHAT_MESSAGE':
          setMafiaMessages((prev) => [...prev, msg.message]);
          break;

        case 'MAFIA_TARGET_UPDATE':
          setMafiaTargetVotes(msg.votes);
          setMafiaTargetId(msg.targetId || null);
          break;

        case 'MINIGAME_ASSIGNED':
          setMinigameChallenge(msg.challenge);
          setMinigameResult(null);
          break;

        case 'MINIGAME_RESULT':
          setMinigameResult({ passed: msg.passed, message: msg.message });
          break;

        case 'NIGHT_RESULT':
          setNightResult({
            disappearedPlayers: msg.disappearedPlayers,
            durationMs: msg.durationMs
          });
          if (msg.durationMs) {
            setPhaseEndsAt(Date.now() + msg.durationMs);
          }
          break;

        case 'ERROR':
          setError(msg.message);
          setIsJoining(false);
          break;
      }
    });

    return () => {
      unsubStatus();
      unsubMessage();
    };
  }, []);

  const createRoom = useCallback((name: string) => {
    setIsJoining(true);
    setError(null);
    setPlayerName(name);
    storage.setPlayerName(name);

    socketService.send({
      type: 'CREATE_ROOM',
      name
    });
  }, []);

  const joinRoom = useCallback((code: string, name: string) => {
    setIsJoining(true);
    setError(null);
    setPlayerName(name);
    storage.setPlayerName(name);

    socketService.send({
      type: 'JOIN_ROOM',
      roomCode: code.toUpperCase().trim(),
      name
    });
  }, []);

  const startGame = useCallback(() => {
    socketService.send({ type: 'START_GAME' });
  }, []);

  const startVoting = useCallback(() => {
    socketService.send({ type: 'START_VOTING' });
  }, []);

  const castVote = useCallback((targetPlayerId: string) => {
    socketService.send({ type: 'CAST_VOTE', targetPlayerId });
  }, []);

  const forceResolveVote = useCallback(() => {
    socketService.send({ type: 'FORCE_RESOLVE_VOTE' });
  }, []);

  const resetToLobby = useCallback(() => {
    socketService.send({ type: 'RESET_TO_LOBBY' });
  }, []);

  const setMafiaCount = useCallback((count: number) => {
    socketService.send({ type: 'SET_MAFIA_COUNT', count });
  }, []);

  const rejoinLobby = useCallback(() => {
    setHasRejoinedLobby(true);
    socketService.send({ type: 'REJOIN_LOBBY' });
  }, []);

  const sendMafiaMessage = useCallback((text: string) => {
    socketService.send({ type: 'MAFIA_MESSAGE', text });
  }, []);

  const selectMafiaTarget = useCallback((targetPlayerId: string) => {
    socketService.send({ type: 'SELECT_MAFIA_TARGET', targetPlayerId });
  }, []);

  const submitMinigameAction = useCallback((token: string, payload: any) => {
    socketService.send({ type: 'SUBMIT_MINIGAME_ACTION', token, payload });
  }, []);

  const forceResolveNight = useCallback(() => {
    socketService.send({ type: 'FORCE_RESOLVE_NIGHT' });
  }, []);

  const forceResolveDawn = useCallback(() => {
    socketService.send({ type: 'FORCE_RESOLVE_DAWN' });
  }, []);

  const leaveRoom = useCallback(() => {
    socketService.send({ type: 'LEAVE_ROOM' });
    storage.clearRoom();
    setRoomCode(null);
    setPlayers([]);
    setRole(null);
    setTeammates([]);
    setHasVoted(false);
    setVotedCount(0);
    setTotalLiving(0);
    setVoteResult(null);
    setGameOverResult(null);
    setRejoinedPlayerIds([]);
    setHasRejoinedLobby(false);
    setMafiaMessages([]);
    setMafiaTargetVotes({});
    setMafiaTargetId(null);
    setMinigameChallenge(null);
    setMinigameResult(null);
    setNightResult(null);
    setPhase('LOBBY');
    setPhaseEndsAt(null);
    setIsHost(false);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
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
    minigameChallenge,
    minigameResult,
    nightResult,
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
  };
}
