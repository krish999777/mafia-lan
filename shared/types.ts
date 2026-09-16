export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 15;

export type Role = 'MAFIA' | 'CIVILIAN';

export type Player = {
  id: string;
  name: string;
  role?: Role;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
};

export type PlayerSummary = {
  id: string;
  name: string;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
};

export interface LobbySummary {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  createdAt: number;
}

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'DAY'
  | 'VOTING'
  | 'DAY_ELIMINATION'
  | 'NIGHT'
  | 'NIGHT_RESOLUTION'
  | 'GAME_OVER';

export type VoteResult = {
  tallies: { playerId: string; playerName: string; votes: number }[];
  eliminatedPlayer?: { id: string; name: string; role?: Role };
  isTie: boolean;
  durationMs?: number;
};

export type NightResolutionResult = {
  disappearedPlayers: { id: string; name: string }[];
  topDefender?: { id: string; name: string; score: number };
  durationMs: number;
};

export type GameOverResult = {
  winner: 'CIVILIANS' | 'MAFIA';
  mafiaPlayers: { id: string; name: string }[];
  allPlayers: { id: string; name: string; role: Role; alive: boolean }[];
  rejoinedPlayerIds: string[];
};

export type MinigameId =
  | 'number-sequence'
  | 'memory-grid'
  | 'reaction-test'
  | 'quick-math'
  | 'color-match'
  | 'odd-one-out'
  | 'find-number'
  | 'tap-in-order'
  | 'pattern-completion'
  | 'count-shapes';

export type MinigameChallenge = {
  id: MinigameId;
  name: string;
  instruction: string;
  data: any;
  token: string;
};

export type MafiaChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
};

// Client -> Server messages
export type ClientMessage =
  | { type: 'CREATE_ROOM'; name: string }
  | { type: 'JOIN_ROOM'; roomCode: string; name: string }
  | { type: 'SET_MAFIA_COUNT'; count: number }
  | { type: 'START_GAME' }
  | { type: 'START_VOTING' }
  | { type: 'CAST_VOTE'; targetPlayerId: string }
  | { type: 'FORCE_RESOLVE_VOTE' }
  | { type: 'RESET_TO_LOBBY' }
  | { type: 'REJOIN_LOBBY' }
  | { type: 'MAFIA_MESSAGE'; text: string }
  | { type: 'SELECT_MAFIA_TARGET'; targetPlayerId: string }
  | { type: 'SUBMIT_MINIGAME_ACTION'; token: string; payload: any }
  | { type: 'START_NIGHT' }
  | { type: 'FORCE_RESOLVE_NIGHT' }
  | { type: 'FORCE_RESOLVE_DAWN' }
  | { type: 'RECONNECT'; roomCode: string; playerId: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'KICK_PLAYER'; targetPlayerId: string }
  | { type: 'DEV_FORCE_MAFIA'; targetPlayerId: string }
  | { type: 'DEV_CLEAR_MAFIA' }
  | { type: 'GET_LOBBIES' }
  | { type: 'PING' };

// Server -> Client messages
export type ServerMessage =
  | { type: 'ROOM_CREATED'; roomCode: string; playerId: string; isHost: boolean }
  | { type: 'ROOM_JOINED'; roomCode: string; playerId: string; isHost: boolean; players: PlayerSummary[] }
  | {
      type: 'ROOM_STATE';
      roomCode: string;
      phase: GamePhase;
      round?: number;
      players: PlayerSummary[];
      hostId: string;
      phaseEndsAt?: number;
      mafiaCount?: number;
      rejoinedPlayerIds?: string[];
      nightResult?: NightResolutionResult;
      provenCivilianIds?: string[];
    }
  | {
      type: 'ROLE_ASSIGNED';
      role: Role;
      teammates?: { id: string; name: string }[];
      durationMs: number;
    }
  | {
      type: 'VOTE_PROGRESS';
      votedCount: number;
      totalLiving: number;
      hasVoted: boolean;
    }
  | ({
      type: 'VOTE_RESULT';
    } & VoteResult)
  | ({
      type: 'NIGHT_RESULT';
    } & NightResolutionResult)
  | ({
      type: 'GAME_OVER';
    } & GameOverResult)
  | { type: 'MAFIA_CHAT_MESSAGE'; message: MafiaChatMessage }
  | {
      type: 'MAFIA_TARGET_UPDATE';
      votes: Record<string, string>;
      targetId?: string;
      isUnanimous?: boolean;
      requiredVotes?: number;
    }
  | { type: 'MINIGAME_ASSIGNED'; challenge: MinigameChallenge; score?: number }
  | { type: 'MINIGAME_RESULT'; passed: boolean; message: string; score?: number }
  | { type: 'REJOIN_UPDATE'; rejoinedPlayerIds: string[] }
  | { type: 'PLAYER_JOINED'; player: PlayerSummary }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'PLAYER_STATUS_CHANGED'; playerId: string; connected: boolean }
  | { type: 'KICKED'; message?: string }
  | { type: 'LOBBY_LIST'; lobbies: LobbySummary[] }
  | { type: 'ERROR'; message: string; code?: string }
  | { type: 'PONG' };

export type LanInfo = {
  localUrl: string;
  lanUrl: string;
  ip: string;
  port: number;
};
