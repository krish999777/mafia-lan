import { WebSocket } from 'ws';
import { Player, PlayerSummary, GamePhase, ServerMessage, Role, GameOverResult, MafiaChatMessage, NightResolutionResult, VoteResult, MinigameChallenge, LobbySummary } from '../../../shared/types.js';
import { GameEngine } from '../game/GameEngine.js';
import { MinigameEngine } from '../minigames/MinigameEngine.js';

export class Room {
  public readonly roomCode: string;
  public hostId: string = '';
  public phase: GamePhase = 'LOBBY';
  public round: number = 0;
  public createdAt: number = Date.now();
  public phaseEndsAt?: number;
  public customMafiaCount?: number;
  public gameOverResult?: GameOverResult;
  public voteResult?: VoteResult;
  public rejoinedPlayerIds: Set<string> = new Set();
  public mafiaTargetVotes: Map<string, string> = new Map();
  public mafiaMessages: MafiaChatMessage[] = [];
  public activeMinigames: Map<string, { token: string; validator: (payload: any) => boolean; challenge: MinigameChallenge }> = new Map();
  public minigameResults: Map<string, boolean> = new Map();
  public minigamesSolved: Map<string, number> = new Map();
  public nightMafiaTargetId?: string;
  public nightResult?: NightResolutionResult;
  public provenCivilianIds: string[] = [];
  public devForcedMafiaIds: string[] = [];

  private players: Map<string, Player> = new Map();
  private sockets: Map<string, WebSocket> = new Map();
  private votes: Map<string, string> = new Map();

  constructor(roomCode: string) {
    this.roomCode = roomCode.toUpperCase();
  }

  /**
   * Add a new player to the room.
   */
  public addPlayer(rawName: string, ws: WebSocket): { player: Player; isNew: boolean } {
    const name = rawName.trim();
    if (!name) {
      throw new Error('Player name cannot be empty');
    }
    if (name.length > 20) {
      throw new Error('Player name cannot exceed 20 characters');
    }

    if (this.players.size >= GameEngine.MAX_PLAYERS) {
      throw new Error(`Room is full (maximum ${GameEngine.MAX_PLAYERS} players allowed)`);
    }

    // Check duplicate names (case-insensitive)
    const normalizedName = name.toLowerCase();
    for (const p of this.players.values()) {
      if (p.name.toLowerCase() === normalizedName) {
        throw new Error(`The name "${name}" is already taken in this room`);
      }
    }

    const playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
    const isFirstPlayer = this.players.size === 0;

    if (isFirstPlayer) {
      this.hostId = playerId;
    }

    const player: Player = {
      id: playerId,
      name,
      alive: true,
      connected: true,
      isHost: isFirstPlayer
    };

    this.players.set(playerId, player);
    this.sockets.set(playerId, ws);

    // Keep mafia count within valid bounds for new player count
    const options = GameEngine.calculateMafiaOptions(this.players.size);
    if (this.customMafiaCount !== undefined && !options.includes(this.customMafiaCount)) {
      this.customMafiaCount = options[options.length - 1];
    }

    return { player, isNew: true };
  }

  /**
   * Reconnect an existing player with their active WebSocket
   */
  public reconnectPlayer(playerId: string, ws: WebSocket): Player | null {
    const player = this.players.get(playerId);
    if (!player) return null;

    player.connected = true;
    this.sockets.set(player.id, ws);
    return player;
  }

  /**
   * Updates player connection status
   */
  public setPlayerConnected(playerId: string, connected: boolean, ws?: WebSocket): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.connected = connected;
    if (connected && ws) {
      this.sockets.set(playerId, ws);
    } else if (!connected) {
      this.sockets.delete(playerId);
    }

    return true;
  }

  /**
   * Completely removes a player (e.g. voluntary leave)
   */
  public removePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    this.players.delete(playerId);
    this.sockets.delete(playerId);
    this.rejoinedPlayerIds.delete(playerId);
    this.devForcedMafiaIds = this.devForcedMafiaIds.filter((id) => id !== playerId);

    // If departing player was host, reassign host to next available player
    if (playerId === this.hostId && this.players.size > 0) {
      const nextHost =
        Array.from(this.players.values()).find((p) => p.connected) ||
        this.players.values().next().value;
      if (nextHost) {
        this.hostId = nextHost.id;
        nextHost.isHost = true;
      }
    }

    // Keep mafia count within valid bounds for new player count
    const options = GameEngine.calculateMafiaOptions(this.players.size);
    if (this.customMafiaCount !== undefined && !options.includes(this.customMafiaCount)) {
      this.customMafiaCount = options[options.length - 1];
    }

    return true;
  }

  /**
   * Host kicks a player from the lobby
   */
  public kickPlayer(callerId: string, targetPlayerId: string): Player {
    if (callerId !== this.hostId) {
      throw new Error('Only the room host can kick members');
    }
    if (this.phase !== 'LOBBY') {
      throw new Error('Players can only be kicked in the lobby');
    }
    if (targetPlayerId === this.hostId) {
      throw new Error('Host cannot kick themselves');
    }
    const player = this.players.get(targetPlayerId);
    if (!player) {
      throw new Error('Player not found in this room');
    }
    this.removePlayer(targetPlayerId);
    return player;
  }

  /**
   * Developer mode: force a player to be assigned Mafia role on game start.
   * If more people are chosen than the allowed Mafia count in the game,
   * it replaces the first chosen Mafia with the latest one (does not increase Mafia count).
   */
  public forceMafia(targetPlayerId: string): void {
    if (!this.players.has(targetPlayerId)) return;

    this.devForcedMafiaIds = this.devForcedMafiaIds.filter((id) => id !== targetPlayerId);
    this.devForcedMafiaIds.push(targetPlayerId);

    const maxMafia = this.getMafiaCount();
    while (this.devForcedMafiaIds.length > maxMafia) {
      this.devForcedMafiaIds.shift();
    }
  }

  /**
   * Developer mode: clear any forced Mafia selections back to empty/random.
   */
  public clearForcedMafia(): void {
    this.devForcedMafiaIds = [];
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  public getPlayerSocket(playerId: string): WebSocket | undefined {
    return this.sockets.get(playerId);
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public getConnectedPlayerCount(): number {
    let count = 0;
    for (const p of this.players.values()) {
      if (p.connected) count++;
    }
    return count;
  }

  public getPlayersSummary(): PlayerSummary[] {
    return Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      connected: p.connected,
      isHost: p.id === this.hostId
    }));
  }

  public getLobbySummary(): LobbySummary {
    const host = this.players.get(this.hostId);
    return {
      roomCode: this.roomCode,
      hostName: host ? host.name : 'Host',
      playerCount: this.players.size,
      maxPlayers: GameEngine.MAX_PLAYERS,
      phase: this.phase,
      createdAt: this.createdAt
    };
  }

  /**
   * Broadcast message to all connected players in this room
   */
  public broadcast(message: ServerMessage, excludePlayerId?: string): void {
    const payload = JSON.stringify(message);

    for (const [playerId, socket] of this.sockets.entries()) {
      if (excludePlayerId && playerId === excludePlayerId) continue;
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(payload);
        } catch (err) {
          console.error(`Failed to send message to player ${playerId}:`, err);
        }
      }
    }
  }

  /**
   * Send message to a single specific player
   */
  public sendTo(playerId: string, message: ServerMessage): boolean {
    const socket = this.sockets.get(playerId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
        return true;
      } catch (err) {
        console.error(`Failed to send message to player ${playerId}:`, err);
      }
    }
    return false;
  }

  /**
   * Determine current active Mafia count (host chosen or balanced default)
   */
  public getMafiaCount(): number {
    const options = GameEngine.calculateMafiaOptions(this.players.size);
    if (this.customMafiaCount !== undefined && options.includes(this.customMafiaCount)) {
      return this.customMafiaCount;
    }
    return options[options.length - 1] || 1;
  }

  /**
   * Update Mafia count in lobby (host only)
   */
  public setMafiaCount(callerId: string, count: number): void {
    if (callerId !== this.hostId) {
      throw new Error('Only the room host can change game settings');
    }
    if (this.phase !== 'LOBBY') {
      throw new Error('Game settings can only be changed in the lobby');
    }
    const options = GameEngine.calculateMafiaOptions(this.players.size);
    if (!options.includes(count)) {
      throw new Error(`Invalid Mafia count (${count}) for ${this.players.size} players`);
    }
    this.customMafiaCount = count;
    while (this.devForcedMafiaIds.length > count) {
      this.devForcedMafiaIds.shift();
    }
    this.broadcastRoomState();
  }

  /**
   * Broadcast current full room state to all players
   */
  public broadcastRoomState(): void {
    this.broadcast({
      type: 'ROOM_STATE',
      roomCode: this.roomCode,
      phase: this.phase,
      round: this.round,
      players: this.getPlayersSummary(),
      hostId: this.hostId,
      phaseEndsAt: this.phaseEndsAt,
      mafiaCount: this.getMafiaCount(),
      rejoinedPlayerIds: Array.from(this.rejoinedPlayerIds),
      nightResult: this.nightResult,
      provenCivilianIds: this.provenCivilianIds
    });
  }

  /**
   * Send current full room state to a specific player
   */
  public sendRoomState(playerId: string): void {
    this.sendTo(playerId, {
      type: 'ROOM_STATE',
      roomCode: this.roomCode,
      phase: this.phase,
      round: this.round,
      players: this.getPlayersSummary(),
      hostId: this.hostId,
      phaseEndsAt: this.phaseEndsAt,
      mafiaCount: this.getMafiaCount(),
      rejoinedPlayerIds: Array.from(this.rejoinedPlayerIds),
      nightResult: this.nightResult,
      provenCivilianIds: this.provenCivilianIds
    });
  }

  /**
   * Starts the game from LOBBY -> ROLE_REVEAL
   */
  public startGame(callerId: string): void {
    if (callerId !== this.hostId) {
      throw new Error('Only the room host can start the game');
    }

    if (this.phase === 'GAME_OVER') {
      this.resetToLobby();
    }

    if (this.phase !== 'LOBBY') {
      throw new Error('Game has already started');
    }

    if (this.players.size < GameEngine.MIN_PLAYERS) {
      throw new Error(`At least ${GameEngine.MIN_PLAYERS} players are required to start the game`);
    }

    if (this.players.size > GameEngine.MAX_PLAYERS) {
      throw new Error(`Cannot start game: maximum ${GameEngine.MAX_PLAYERS} players allowed`);
    }

    this.rejoinedPlayerIds.clear();
    this.gameOverResult = undefined;
    this.voteResult = undefined;
    this.nightResult = undefined;
    this.nightMafiaTargetId = undefined;
    this.minigameResults.clear();
    this.minigamesSolved.clear();
    this.activeMinigames.clear();
    this.provenCivilianIds = [];

    // Assign roles using GameEngine with host-chosen or balanced mafia count, respecting any dev-forced mafia
    const playerIds = Array.from(this.players.keys());
    const roleMap = GameEngine.assignRoles(
      playerIds,
      this.getMafiaCount(),
      this.devForcedMafiaIds
    );
    this.clearForcedMafia();

    for (const [id, role] of roleMap.entries()) {
      const player = this.players.get(id);
      if (player) {
        player.role = role;
      }
    }

    this.phase = 'ROLE_REVEAL';
    this.round = 1;
    const durationMs = 8000;
    this.phaseEndsAt = Date.now() + durationMs;

    // Collect all Mafia identities to share ONLY among Mafia teammates
    const mafiaMembers = Array.from(this.players.values())
      .filter((p) => p.role === 'MAFIA')
      .map((p) => ({ id: p.id, name: p.name }));

    // Send private role message to each player individually
    for (const player of this.players.values()) {
      if (player.role === 'MAFIA') {
        const teammates = mafiaMembers.filter((m) => m.id !== player.id);
        this.sendTo(player.id, {
          type: 'ROLE_ASSIGNED',
          role: 'MAFIA',
          teammates,
          durationMs
        });
      } else {
        this.sendTo(player.id, {
          type: 'ROLE_ASSIGNED',
          role: 'CIVILIAN',
          durationMs
        });
      }
    }

    // Broadcast room state (DOES NOT reveal any roles!)
    this.broadcastRoomState();

    // Schedule transition to DAY
    const timer = setTimeout(() => {
      if (this.phase === 'ROLE_REVEAL') {
        this.startDay();
      }
    }, durationMs);
    timer.unref();
  }

  /**
   * Transition to DAY phase (Discussion)
   */
  public startDay(): void {
    this.phase = 'DAY';
    this.phaseEndsAt = undefined;

    this.broadcastRoomState();
  }

  public getLivingPlayers(): Player[] {
    return Array.from(this.players.values()).filter((p) => p.alive);
  }

  /**
   * Transition from DAY to VOTING (Host only)
   */
  public startVoting(callerId: string): void {
    if (callerId !== this.hostId) {
      throw new Error('Only the room host can start voting');
    }

    if (this.phase !== 'DAY') {
      throw new Error('Voting can only begin during the Day phase');
    }

    this.votes.clear();
    this.phase = 'VOTING';

    this.broadcastRoomState();

    const living = this.getLivingPlayers();
    for (const p of this.players.values()) {
      this.sendTo(p.id, {
        type: 'VOTE_PROGRESS',
        votedCount: 0,
        totalLiving: living.length,
        hasVoted: false
      });
    }
  }

  /**
   * Cast a vote for an active living player
   */
  public castVote(voterId: string, targetId: string): void {
    const voter = this.players.get(voterId);
    if (!voter || !voter.alive) {
      throw new Error('Eliminated players cannot cast votes');
    }

    if (this.phase !== 'VOTING') {
      throw new Error('Voting is not currently active');
    }

    const target = this.players.get(targetId);
    if (!target || !target.alive) {
      throw new Error('Target player is not active or is already eliminated');
    }

    if (voterId === targetId) {
      throw new Error('You cannot vote for yourself');
    }

    this.votes.set(voterId, targetId);

    const living = this.getLivingPlayers();
    const votedCount = this.votes.size;

    // Send individualized progress (so each player knows if they have voted without revealing who voted for whom)
    for (const p of this.players.values()) {
      this.sendTo(p.id, {
        type: 'VOTE_PROGRESS',
        votedCount,
        totalLiving: living.length,
        hasVoted: this.votes.has(p.id)
      });
    }

    // If all living players have voted, resolve voting automatically
    if (this.votes.size >= living.length) {
      this.resolveVoting();
    }
  }

  /**
   * Resolve votes, announce result, and eliminate player if consensus reached
   */
  public resolveVoting(callerId?: string): void {
    if (callerId && callerId !== this.hostId) {
      throw new Error('Only the room host can manually resolve voting');
    }

    if (this.phase !== 'VOTING') {
      return;
    }

    const living = this.getLivingPlayers();
    const livingIds = living.map((p) => p.id);

    const { tallies: rawTallies, eliminatedId, isTie } = GameEngine.resolveVotes(
      this.votes,
      livingIds
    );

    let eliminatedPlayer: { id: string; name: string; role?: Role } | undefined = undefined;

    if (eliminatedId) {
      const p = this.players.get(eliminatedId);
      if (p) {
        p.alive = false;
        eliminatedPlayer = { id: p.id, name: p.name, role: p.role || 'CIVILIAN' };
      }
    }

    const tallies = Array.from(rawTallies.entries())
      .map(([id, votes]) => ({
        playerId: id,
        playerName: this.players.get(id)?.name || 'Unknown',
        votes
      }))
      .sort((a, b) => b.votes - a.votes);

    // Evaluate win condition
    const winCondition = GameEngine.checkWinCondition(Array.from(this.players.values()));

    this.phase = 'DAY_ELIMINATION';
    const durationMs = 6000;
    this.phaseEndsAt = Date.now() + durationMs;

    this.voteResult = {
      tallies,
      eliminatedPlayer,
      isTie,
      durationMs
    };

    this.broadcast({
      type: 'VOTE_RESULT',
      ...this.voteResult
    });

    this.broadcastRoomState();

    // After elimination reveal duration, either conclude game or advance to Night
    const timer = setTimeout(() => {
      if (this.phase === 'DAY_ELIMINATION') {
        if (winCondition.gameOver && winCondition.winner) {
          this.endGame(winCondition.winner);
        } else {
          // Advance to Night phase!
          this.startNight();
        }
      }
    }, durationMs);
    timer.unref();
  }

  /**
   * Transition to NIGHT phase (Civilians get minigames, Mafia gets private chat & target selection)
   */
  public startNight(callerId?: string): void {
    if (callerId && callerId !== this.hostId) {
      throw new Error('Only the room host can initiate Night');
    }

    this.phase = 'NIGHT';
    const durationMs = 60000;
    this.phaseEndsAt = Date.now() + durationMs;

    this.mafiaTargetVotes.clear();
    this.mafiaMessages = [];
    this.activeMinigames.clear();
    this.minigameResults.clear();
    this.minigamesSolved.clear();
    this.nightMafiaTargetId = undefined;

    const livingPlayers = Array.from(this.players.values()).filter((p) => p.alive);
    const livingMafia = livingPlayers.filter((p) => p.role === 'MAFIA');

    // Initialize looping minigames for all living players (Civilians + Mafia cover minigame)
    for (const player of livingPlayers) {
      this.minigamesSolved.set(player.id, 0);
      const { challenge, validator } = MinigameEngine.generateChallenge(player.id, this.round);
      this.activeMinigames.set(player.id, { token: challenge.token, validator, challenge });
      this.sendTo(player.id, {
        type: 'MINIGAME_ASSIGNED',
        challenge,
        score: 0
      });
    }

    // Initialize Mafia night target status with unanimous requirement
    for (const mafioso of livingMafia) {
      this.sendTo(mafioso.id, {
        type: 'MAFIA_TARGET_UPDATE',
        votes: {},
        isUnanimous: false,
        requiredVotes: livingMafia.length
      });
    }

    this.broadcastRoomState();

    // Schedule transition to next Day upon night end
    const timer = setTimeout(() => {
      if (this.phase === 'NIGHT') {
        this.resolveNight();
      }
    }, durationMs);
    timer.unref();
  }

  /**
   * Send a message in the private Mafia night chat (Mafia only)
   */
  public sendMafiaMessage(senderId: string, rawText: string): void {
    const sender = this.players.get(senderId);
    if (!sender || !sender.alive || sender.role !== 'MAFIA') {
      throw new Error('Only living Mafia members can send private Mafia messages');
    }

    if (this.phase !== 'NIGHT') {
      throw new Error('Mafia chat is only available during the Night phase');
    }

    const text = rawText.trim();
    if (!text) return;
    if (text.length > 200) {
      throw new Error('Message too long (max 200 characters)');
    }

    const message: MafiaChatMessage = {
      id: `msg_${Math.random().toString(36).substring(2, 9)}`,
      senderId,
      senderName: sender.name,
      text,
      timestamp: Date.now()
    };

    this.mafiaMessages.push(message);

    // Broadcast EXCLUSIVELY to living Mafia members in this room
    for (const player of this.players.values()) {
      if (player.alive && player.role === 'MAFIA') {
        this.sendTo(player.id, {
          type: 'MAFIA_CHAT_MESSAGE',
          message
        });
      }
    }
  }

  /**
   * Cast/update a Mafia target selection (Mafia only, targeting living Civilians).
   * Target is only locked for execution if 100% of living Mafia select the exact same person.
   */
  public selectMafiaTarget(mafiaId: string, targetId: string): void {
    const selector = this.players.get(mafiaId);
    if (!selector || !selector.alive || selector.role !== 'MAFIA') {
      throw new Error('Only living Mafia members can select night targets');
    }

    if (this.phase !== 'NIGHT') {
      throw new Error('Target selection is only active during the Night phase');
    }

    const target = this.players.get(targetId);
    if (!target || !target.alive) {
      throw new Error('Target is already eliminated or does not exist');
    }

    if (target.role === 'MAFIA') {
      throw new Error('Mafia cannot target fellow Mafia members');
    }

    this.mafiaTargetVotes.set(mafiaId, targetId);

    const livingMafia = Array.from(this.players.values()).filter(
      (p) => p.alive && p.role === 'MAFIA'
    );
    const requiredVotes = livingMafia.length;

    const votesObj: Record<string, string> = {};
    for (const [mId, tId] of this.mafiaTargetVotes.entries()) {
      votesObj[mId] = tId;
    }

    // Unanimous check: all living Mafia must have voted, and all must agree on the same target
    const allVoted = this.mafiaTargetVotes.size === requiredVotes;
    const allSameTarget = allVoted && Array.from(this.mafiaTargetVotes.values()).every((t) => t === targetId);

    if (allSameTarget) {
      this.nightMafiaTargetId = targetId;
    } else {
      this.nightMafiaTargetId = undefined;
    }

    // Broadcast live selections EXCLUSIVELY to living Mafia
    for (const player of this.players.values()) {
      if (player.alive && player.role === 'MAFIA') {
        this.sendTo(player.id, {
          type: 'MAFIA_TARGET_UPDATE',
          votes: votesObj,
          targetId: this.nightMafiaTargetId,
          isUnanimous: allSameTarget,
          requiredVotes
        });
      }
    }
  }

  /**
   * Validate and record a minigame action (playable by Civilians and Mafia for disguise).
   * Minigames run on loop throughout the entire night round:
   * each pass increments score and continuously supplies new challenges.
   * Note: Only Civilians' scores are eligible for the Proven Innocent Top Defender award.
   */
  public submitMinigameAction(playerId: string, token: string, payload: any): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive) {
      throw new Error('Only living players can perform night minigames');
    }

    if (this.phase !== 'NIGHT') {
      throw new Error('Minigames are only active during the Night phase');
    }

    const active = this.activeMinigames.get(playerId);
    if (!active || active.token !== token) {
      throw new Error('Invalid or expired minigame challenge token');
    }

    const passed = Boolean(active.validator(payload));
    const currentScore = this.minigamesSolved.get(playerId) || 0;
    const newScore = passed ? currentScore + 1 : currentScore;

    if (passed) {
      this.minigamesSolved.set(playerId, newScore);
      this.minigameResults.set(playerId, true);
    }

    // Send immediate result feedback with updated score
    this.sendTo(playerId, {
      type: 'MINIGAME_RESULT',
      passed,
      score: newScore,
      message: passed
        ? `Task solved! Total defenses secured: ${newScore}`
        : 'Task missed! Security recalibrating...'
    });

    // Immediately generate and issue next challenge in loop
    const next = MinigameEngine.generateChallenge(playerId, this.round);
    this.activeMinigames.set(playerId, {
      token: next.challenge.token,
      validator: next.validator,
      challenge: next.challenge
    });

    this.sendTo(playerId, {
      type: 'MINIGAME_ASSIGNED',
      challenge: next.challenge,
      score: newScore
    });
  }

  /**
   * Resolve night actions, transition to NIGHT_RESOLUTION, and announce concealed deaths.
   * Mafia only kills if unanimous consensus was achieved.
   * Top Defender among surviving civilians is revealed as Proven Innocent!
   */
  public resolveNight(callerId?: string): void {
    if (callerId && callerId !== this.hostId) {
      throw new Error('Only the room host can resolve Night');
    }

    if (this.phase !== 'NIGHT') {
      return;
    }

    const disappearedMap = new Map<string, { id: string; name: string }>();

    // 1. Safehouse defense check: Civilians who solved 0 minigames during the night are breached
    const livingCivilians = Array.from(this.players.values()).filter(
      (p) => p.alive && p.role === 'CIVILIAN'
    );
    for (const civ of livingCivilians) {
      const solved = this.minigamesSolved.get(civ.id) || 0;
      const passedDirect = this.minigameResults.get(civ.id) === true;
      if (solved === 0 && !passedDirect) {
        civ.alive = false;
        disappearedMap.set(civ.id, { id: civ.id, name: civ.name });
      }
    }

    // 2. Mafia assassination: ONLY executed if all living Mafia reached unanimous agreement
    if (this.nightMafiaTargetId) {
      const targetPlayer = this.players.get(this.nightMafiaTargetId);
      if (targetPlayer && targetPlayer.alive) {
        targetPlayer.alive = false;
        disappearedMap.set(targetPlayer.id, { id: targetPlayer.id, name: targetPlayer.name });
      }
    }

    // 3. Identify Top Defender among surviving living civilians
    const survivingCivilians = Array.from(this.players.values()).filter(
      (p) => p.alive && p.role === 'CIVILIAN'
    );

    let topDefender: { id: string; name: string; score: number } | undefined = undefined;
    let highestScore = 0;

    for (const civ of survivingCivilians) {
      const score = (this.minigamesSolved.get(civ.id) || 0) || (this.minigameResults.get(civ.id) === true ? 1 : 0);
      if (score > highestScore) {
        highestScore = score;
        topDefender = { id: civ.id, name: civ.name, score };
      }
    }

    if (topDefender && topDefender.score > 0) {
      if (!this.provenCivilianIds.includes(topDefender.id)) {
        this.provenCivilianIds.push(topDefender.id);
      }
    } else {
      topDefender = undefined;
    }

    // Clear active night challenge state
    this.activeMinigames.clear();
    this.mafiaTargetVotes.clear();

    const durationMs = 7000;
    this.phase = 'NIGHT_RESOLUTION';
    this.phaseEndsAt = Date.now() + durationMs;

    this.nightResult = {
      disappearedPlayers: Array.from(disappearedMap.values()),
      topDefender,
      durationMs
    };

    // Broadcast night resolution message
    this.broadcast({
      type: 'NIGHT_RESULT',
      disappearedPlayers: this.nightResult.disappearedPlayers,
      topDefender,
      durationMs
    });

    this.broadcastRoomState();

    // Auto-advance after 7 seconds
    const timer = setTimeout(() => {
      if (this.phase === 'NIGHT_RESOLUTION') {
        this.completeNightResolution();
      }
    }, durationMs);
    timer.unref();
  }

  /**
   * Complete night resolution: check win conditions, advance round, and transition to Day or Game Over.
   */
  public completeNightResolution(callerId?: string): void {
    if (callerId && callerId !== this.hostId) {
      throw new Error('Only the room host can advance dawn');
    }

    if (this.phase !== 'NIGHT_RESOLUTION') {
      return;
    }

    // Check win condition after night eliminations
    const living = Array.from(this.players.values()).filter((p) => p.alive);
    const winCheck = GameEngine.checkWinCondition(living);

    if (winCheck.gameOver && winCheck.winner) {
      this.endGame(winCheck.winner);
    } else {
      this.round += 1;
      this.startDay();
    }
  }

  /**
   * End the game and broadcast final role reveal and winner
   */
  public endGame(winner: 'CIVILIANS' | 'MAFIA'): void {
    this.phase = 'GAME_OVER';
    this.phaseEndsAt = undefined;
    this.rejoinedPlayerIds.clear();

    const mafiaPlayers = Array.from(this.players.values())
      .filter((p) => p.role === 'MAFIA')
      .map((p) => ({ id: p.id, name: p.name }));

    const allPlayers = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role || 'CIVILIAN',
      alive: p.alive
    }));

    this.gameOverResult = {
      winner,
      mafiaPlayers,
      allPlayers,
      rejoinedPlayerIds: []
    };

    this.broadcast({
      type: 'GAME_OVER',
      ...this.gameOverResult
    });

    this.broadcastRoomState();
  }

  /**
   * Handle player clicking "Return to Lobby" on the Game Over screen
   */
  public rejoinLobby(playerId: string): void {
    if (this.phase !== 'GAME_OVER') {
      return;
    }

    const player = this.players.get(playerId);
    if (!player) return;

    this.rejoinedPlayerIds.add(playerId);
    player.alive = true;
    player.role = undefined;

    if (this.gameOverResult) {
      this.gameOverResult.rejoinedPlayerIds = Array.from(this.rejoinedPlayerIds);
    }

    this.broadcast({
      type: 'REJOIN_UPDATE',
      rejoinedPlayerIds: Array.from(this.rejoinedPlayerIds)
    });

    this.broadcastRoomState();

    // If all connected players have returned, reset phase back to LOBBY
    const connectedCount = this.getConnectedPlayerCount();
    if (connectedCount > 0 && this.rejoinedPlayerIds.size >= connectedCount) {
      this.resetToLobby();
    }
  }

  /**
   * Restores all private game state for a reconnecting player based on the current phase
   */
  public sendPrivateGameState(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // 1. Role restoration (if assigned and active)
    if (player.role && this.phase !== 'LOBBY') {
      const teammates =
        player.role === 'MAFIA'
          ? Array.from(this.players.values())
              .filter((p) => p.role === 'MAFIA' && p.id !== player.id)
              .map((p) => ({ id: p.id, name: p.name }))
          : undefined;

      const durationMs =
        this.phase === 'ROLE_REVEAL' && this.phaseEndsAt
          ? Math.max(0, this.phaseEndsAt - Date.now())
          : 0;

      this.sendTo(playerId, {
        type: 'ROLE_ASSIGNED',
        role: player.role,
        teammates,
        durationMs
      });
    }

    // 2. Voting phase state restoration
    if (this.phase === 'VOTING') {
      const living = this.getLivingPlayers();
      this.sendTo(playerId, {
        type: 'VOTE_PROGRESS',
        votedCount: this.votes.size,
        totalLiving: living.length,
        hasVoted: this.votes.has(playerId)
      });
    }

    // 3. Day Elimination state restoration
    if (this.phase === 'DAY_ELIMINATION' && this.voteResult) {
      this.sendTo(playerId, {
        type: 'VOTE_RESULT',
        ...this.voteResult
      });
    }

    // 4. Night phase state restoration
    if (this.phase === 'NIGHT') {
      // Restore minigame for any living player (Civilians and Mafia cover game)
      if (player.alive && this.activeMinigames.has(playerId)) {
        const score = this.minigamesSolved.get(playerId) || 0;
        const active = this.activeMinigames.get(playerId)!;
        this.sendTo(playerId, {
          type: 'MINIGAME_ASSIGNED',
          challenge: active.challenge,
          score
        });
      }

      if (player.role === 'MAFIA') {
        const livingMafia = Array.from(this.players.values()).filter(
          (p) => p.alive && p.role === 'MAFIA'
        );
        const votesObj = Object.fromEntries(this.mafiaTargetVotes.entries());
        this.sendTo(playerId, {
          type: 'MAFIA_TARGET_UPDATE',
          votes: votesObj,
          targetId: this.nightMafiaTargetId,
          isUnanimous: Boolean(this.nightMafiaTargetId),
          requiredVotes: livingMafia.length
        });

        // Replay mafia chat history
        for (const msg of this.mafiaMessages) {
          this.sendTo(playerId, {
            type: 'MAFIA_CHAT_MESSAGE',
            message: msg
          });
        }
      }
    }

    // 5. Dawn / Night Resolution state restoration
    if (this.phase === 'NIGHT_RESOLUTION' && this.nightResult) {
      this.sendTo(playerId, {
        type: 'NIGHT_RESULT',
        disappearedPlayers: this.nightResult.disappearedPlayers,
        topDefender: this.nightResult.topDefender,
        durationMs: this.nightResult.durationMs
      });
    }

    // 6. Game Over state restoration
    if (this.phase === 'GAME_OVER' && this.gameOverResult) {
      this.sendTo(playerId, {
        type: 'GAME_OVER',
        ...this.gameOverResult
      });
    }
  }

  /**
   * Force reset the active game back to LOBBY (Emergency reset action)
   */
  public resetToLobby(callerId?: string): void {
    if (callerId && !this.players.has(callerId)) {
      throw new Error('Only active players in the room can reset the room to lobby');
    }

    this.phase = 'LOBBY';
    this.phaseEndsAt = undefined;
    this.round = 0;
    this.votes.clear();
    this.rejoinedPlayerIds.clear();
    this.gameOverResult = undefined;
    this.voteResult = undefined;
    this.nightResult = undefined;
    this.nightMafiaTargetId = undefined;
    this.minigameResults.clear();
    this.minigamesSolved.clear();
    this.activeMinigames.clear();
    this.provenCivilianIds = [];
    this.clearForcedMafia();

    // Revive all players and clear roles
    for (const player of this.players.values()) {
      player.alive = true;
      player.role = undefined;
    }

    this.broadcastRoomState();
  }
}
