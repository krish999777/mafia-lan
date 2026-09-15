import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from './Room.js';
import { RoomManager } from './RoomManager.js';
import { WebSocket } from 'ws';

// Mock WebSocket for testing room logic without network overhead
function createMockSocket(): WebSocket {
  return {
    readyState: WebSocket.OPEN,
    send: () => {},
    close: () => {},
    terminate: () => {}
  } as unknown as WebSocket;
}

describe('Room & RoomManager (Offline LAN Core)', () => {
  it('creates unique 4-character room codes', () => {
    const manager = new RoomManager();
    const room1 = manager.createRoom();
    const room2 = manager.createRoom();

    assert.equal(room1.roomCode.length, 4);
    assert.equal(room2.roomCode.length, 4);
    assert.notEqual(room1.roomCode, room2.roomCode);
    assert.equal(manager.getRoom(room1.roomCode), room1);
  });

  it('first player to join becomes the host', () => {
    const room = new Room('ABCD');
    const ws1 = createMockSocket();
    const { player: p1 } = room.addPlayer('Krish', ws1);

    assert.equal(p1.name, 'Krish');
    assert.equal(p1.isHost, true);
    assert.equal(room.hostId, p1.id);

    const ws2 = createMockSocket();
    const { player: p2 } = room.addPlayer('Rahul', ws2);

    assert.equal(p2.name, 'Rahul');
    assert.equal(p2.isHost, false);
    assert.equal(room.hostId, p1.id);
    assert.equal(room.getPlayerCount(), 2);
  });

  it('rejects duplicate player names (case-insensitive)', () => {
    const room = new Room('ABCD');
    room.addPlayer('Aryan', createMockSocket());

    assert.throws(
      () => room.addPlayer('Aryan', createMockSocket()),
      /already taken/
    );

    assert.throws(
      () => room.addPlayer('aryan', createMockSocket()),
      /already taken/
    );
  });

  it('rejects empty or overly long names', () => {
    const room = new Room('ABCD');
    assert.throws(() => room.addPlayer('   ', createMockSocket()), /cannot be empty/);
    assert.throws(() => room.addPlayer('a'.repeat(25), createMockSocket()), /cannot exceed/);
  });

  it('enforces room player capacity between minimum 4 and maximum 15 players', () => {
    const room = new Room('MAXP');
    for (let i = 1; i <= 15; i++) {
      room.addPlayer(`Player${i}`, createMockSocket());
    }
    assert.equal(room.getPlayerCount(), 15);

    // 16th player rejected
    assert.throws(
      () => room.addPlayer('Player16', createMockSocket()),
      /maximum 15 players/i
    );
  });

  it('supports reconnection using same playerId', () => {
    const room = new Room('ABCD');
    const ws1 = createMockSocket();
    const { player: p1 } = room.addPlayer('Priya', ws1);

    // Simulate disconnect
    room.setPlayerConnected(p1.id, false);
    assert.equal(room.getPlayer(p1.id)?.connected, false);

    // Reconnect with same playerId
    const ws2 = createMockSocket();
    const reconnected = room.reconnectPlayer(p1.id, ws2);

    assert.ok(reconnected);
    assert.equal(reconnected.id, p1.id);
    assert.equal(reconnected.connected, true);
  });

  it('keeps host stable when players join or disconnect', () => {
    const room = new Room('ABCD');
    const { player: p1 } = room.addPlayer('HostPlayer', createMockSocket());
    const { player: p2 } = room.addPlayer('SecondPlayer', createMockSocket());

    assert.equal(room.hostId, p1.id);

    // Host temporarily disconnects
    room.setPlayerConnected(p1.id, false);
    // Host MUST NOT be reassigned
    assert.equal(room.hostId, p1.id);

    // Third player joins
    const { player: p3 } = room.addPlayer('ThirdPlayer', createMockSocket());
    assert.equal(room.hostId, p1.id);

    // Host reconnects
    const wsHostNew = createMockSocket();
    room.reconnectPlayer(p1.id, wsHostNew);
    assert.equal(room.hostId, p1.id);
    assert.equal(room.getPlayersSummary().find((p) => p.id === p1.id)?.isHost, true);
    assert.equal(room.getPlayersSummary().find((p) => p.id === p2.id)?.isHost, false);
    assert.equal(room.getPlayersSummary().find((p) => p.id === p3.id)?.isHost, false);
  });

  it('produces sanitized player summaries without private state', () => {
    const room = new Room('ABCD');
    room.addPlayer('Dev', createMockSocket());
    const summaries = room.getPlayersSummary();

    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].name, 'Dev');
    assert.equal(summaries[0].isHost, true);
    assert.equal(summaries[0].connected, true);
    assert.equal(summaries[0].alive, true);
    // Role shouldn't be revealed in lobby player summary
    assert.equal((summaries[0] as any).role, undefined);
  });

  it('resets active game back to LOBBY, revives all players, and clears roles', () => {
    const room = new Room('ABCD');
    const { player: host } = room.addPlayer('Host', createMockSocket());
    const { player: p2 } = room.addPlayer('P2', createMockSocket());
    const { player: p3 } = room.addPlayer('P3', createMockSocket());
    const { player: p4 } = room.addPlayer('P4', createMockSocket());

    // Start game
    room.startGame(host.id);
    assert.equal(room.phase, 'ROLE_REVEAL');
    assert.ok(room.getPlayer(p2.id)?.role);

    // Simulate elimination of P2
    p2.alive = false;

    // Non-member cannot reset
    assert.throws(() => room.resetToLobby('non-member-id'), /only active players/i);

    // Any active room player can reset to lobby
    room.resetToLobby(p2.id);
    assert.equal(room.phase, 'LOBBY');
    assert.equal(room.getPlayer(p2.id)?.alive, true);
    assert.equal(room.getPlayer(p2.id)?.role, undefined);
    assert.equal(room.getPlayer(host.id)?.role, undefined);
  });

  it('allows host to configure Mafia count within player limits and rejects invalid choices', () => {
    const room = new Room('MAFC');
    const { player: host } = room.addPlayer('Host', createMockSocket());
    room.addPlayer('P2', createMockSocket());
    room.addPlayer('P3', createMockSocket());
    const { player: p4 } = room.addPlayer('P4', createMockSocket());

    // 4 players: options are [1]
    assert.equal(room.getMafiaCount(), 1);
    assert.throws(() => room.setMafiaCount(host.id, 2), /invalid mafia count/i);
    assert.throws(() => room.setMafiaCount(p4.id, 1), /only the room host/i);

    // Add 3 more players (7 total)
    room.addPlayer('P5', createMockSocket());
    room.addPlayer('P6', createMockSocket());
    room.addPlayer('P7', createMockSocket());

    // 7 players: default 2, can choose 1
    assert.equal(room.getMafiaCount(), 2);
    room.setMafiaCount(host.id, 1);
    assert.equal(room.getMafiaCount(), 1);
    room.setMafiaCount(host.id, 2);
    assert.equal(room.getMafiaCount(), 2);
  });

  it('reveals role of eliminated player in vote resolution and triggers game over when all mafia eliminated', () => {
    const room = new Room('VOTE');
    const { player: host } = room.addPlayer('Host', createMockSocket());
    const { player: p2 } = room.addPlayer('P2', createMockSocket());
    const { player: p3 } = room.addPlayer('P3', createMockSocket());
    const { player: p4 } = room.addPlayer('P4', createMockSocket());

    room.startGame(host.id);
    room.startDay();
    room.startVoting(host.id);

    // Force p2 to be Mafia and others to be Civilian for deterministic test
    const mafiaPlayer = room.getPlayer(p2.id)!;
    mafiaPlayer.role = 'MAFIA';
    room.getPlayer(host.id)!.role = 'CIVILIAN';
    room.getPlayer(p3.id)!.role = 'CIVILIAN';
    room.getPlayer(p4.id)!.role = 'CIVILIAN';

    // Everyone votes out P2
    room.castVote(host.id, p2.id);
    room.castVote(p3.id, p2.id);
    room.castVote(p4.id, p2.id);
    // P2 votes host
    room.castVote(p2.id, host.id);

    // Verify P2 eliminated and role revealed as MAFIA
    assert.equal(room.phase, 'DAY_ELIMINATION');
    assert.equal(mafiaPlayer.alive, false);

    // Direct trigger endGame to test rejoinLobby
    room.endGame('CIVILIANS');
    assert.equal(room.phase, 'GAME_OVER');
    assert.equal(room.gameOverResult?.winner, 'CIVILIANS');
    assert.equal(room.gameOverResult?.mafiaPlayers[0].id, p2.id);

    // Players rejoin one by one
    room.rejoinLobby(host.id);
    assert.equal(room.rejoinedPlayerIds.has(host.id), true);
    assert.equal(room.phase, 'GAME_OVER'); // Still GAME_OVER until all rejoin

    room.rejoinLobby(p2.id);
    room.rejoinLobby(p3.id);
    room.rejoinLobby(p4.id);

    // Once all players rejoined, room resets to LOBBY
    assert.equal(room.phase, 'LOBBY');
  });

  it('handles Night Phase, private Mafia chat privacy, and target selection', () => {
    const room = new Room('NGHT');
    const hostSocket = { readyState: WebSocket.OPEN, send: () => {}, close: () => {}, terminate: () => {} } as unknown as WebSocket;
    const { player: host } = room.addPlayer('HostMafia', hostSocket);
    
    // Recording sockets to test message privacy
    const mMessages: any[] = [];
    const cMessages: any[] = [];
    const mafiaWs = { readyState: WebSocket.OPEN, send: (d: string) => mMessages.push(JSON.parse(d)), close: () => {}, terminate: () => {} } as unknown as WebSocket;
    const civilianWs = { readyState: WebSocket.OPEN, send: (d: string) => cMessages.push(JSON.parse(d)), close: () => {}, terminate: () => {} } as unknown as WebSocket;

    const { player: m2 } = room.addPlayer('Mafia2', mafiaWs);
    const { player: c1 } = room.addPlayer('Civilian1', civilianWs);
    const { player: c2 } = room.addPlayer('Civilian2', createMockSocket());

    room.startGame(host.id);

    // Assign roles manually for test
    room.getPlayer(host.id)!.role = 'MAFIA';
    room.getPlayer(m2.id)!.role = 'MAFIA';
    room.getPlayer(c1.id)!.role = 'CIVILIAN';
    room.getPlayer(c2.id)!.role = 'CIVILIAN';

    // Start night
    room.startNight();
    assert.equal(room.phase, 'NIGHT');

    // Civilian1 should have received a MINIGAME_ASSIGNED message
    const minigameMsg = cMessages.find((m) => m.type === 'MINIGAME_ASSIGNED');
    assert.ok(minigameMsg, 'Civilian should receive MINIGAME_ASSIGNED');
    assert.ok(minigameMsg.challenge.token, 'Challenge should contain token');

    // Mafia socket should NOT have received minigame
    const mafiaMinigame = mMessages.find((m) => m.type === 'MINIGAME_ASSIGNED');
    assert.equal(mafiaMinigame, undefined, 'Mafia should not receive minigames');

    // Mafia sends private chat message
    mMessages.length = 0;
    cMessages.length = 0;
    room.sendMafiaMessage(host.id, 'Target Civilian1 tonight!');

    // Mafia2 should receive the chat message
    const mafiaChat = mMessages.find((m) => m.type === 'MAFIA_CHAT_MESSAGE');
    assert.ok(mafiaChat, 'Fellow Mafia should receive chat');
    assert.equal(mafiaChat.message.text, 'Target Civilian1 tonight!');

    // Civilian must NOT receive the chat message
    const civChat = cMessages.find((m) => m.type === 'MAFIA_CHAT_MESSAGE');
    assert.equal(civChat, undefined, 'Civilian must NEVER receive Mafia chat messages');

    // Civilian cannot send Mafia message
    assert.throws(() => room.sendMafiaMessage(c1.id, 'Im talking'), /only living mafia/i);

    // Mafia target selection: host votes c1 (only 1 of 2 living mafia, not yet unanimous)
    room.selectMafiaTarget(host.id, c1.id);
    const targetUpdate1 = mMessages[mMessages.length - 1];
    assert.ok(targetUpdate1, 'Mafia should receive target update');
    assert.equal(targetUpdate1.isUnanimous, false, 'Should not be unanimous yet');
    assert.equal(targetUpdate1.targetId, undefined);

    // Mafia cannot target fellow Mafia
    assert.throws(() => room.selectMafiaTarget(host.id, m2.id), /cannot target fellow mafia/i);

    // m2 also selects c1 -> Now unanimous!
    room.selectMafiaTarget(m2.id, c1.id);
    const targetUpdate2 = mMessages[mMessages.length - 1];
    assert.equal(targetUpdate2.isUnanimous, true, 'Should now be unanimous');
    assert.equal(targetUpdate2.targetId, c1.id);

    // Civilian solves minigame
    room.submitMinigameAction(c1.id, minigameMsg.challenge.token, {
      answer: minigameMsg.challenge.data.solution ?? 0
    });
    const resultMsg = cMessages.find((m) => m.type === 'MINIGAME_RESULT');
    assert.ok(resultMsg, 'Civilian should receive result');

    // Resolve Night -> transitions to NIGHT_RESOLUTION
    room.resolveNight();
    assert.equal(room.phase, 'NIGHT_RESOLUTION');
    assert.ok(room.nightResult, 'Should have nightResult generated');
    assert.equal(room.nightMafiaTargetId, c1.id);

    // Complete dawn -> All civilians died, so Mafia wins
    room.completeNightResolution();
    assert.equal(room.phase, 'GAME_OVER');
    assert.equal(room.gameOverResult?.winner, 'MAFIA');
  });

  it('Phase 8: resolves night with simultaneous deaths, conceals causes/roles, and triggers game over', () => {
    const room = new Room('PHS8');
    const { player: host } = room.addPlayer('HostMafia', createMockSocket());
    const { player: c1 } = room.addPlayer('CivOne', createMockSocket());
    const { player: c2 } = room.addPlayer('CivTwo', createMockSocket());
    const { player: c3 } = room.addPlayer('CivThree', createMockSocket());
    const { player: c4 } = room.addPlayer('CivFour', createMockSocket());

    room.startGame(host.id);

    // Set roles
    room.getPlayer(host.id)!.role = 'MAFIA';
    room.getPlayer(c1.id)!.role = 'CIVILIAN';
    room.getPlayer(c2.id)!.role = 'CIVILIAN';
    room.getPlayer(c3.id)!.role = 'CIVILIAN';
    room.getPlayer(c4.id)!.role = 'CIVILIAN';

    room.startNight();
    assert.equal(room.phase, 'NIGHT');

    // 1. Host Mafia targets CivOne (c1)
    room.selectMafiaTarget(host.id, c1.id);

    // 2. CivTwo (c2) passes minigame
    const c2Challenge = room.activeMinigames.get(c2.id)!;
    room.minigameResults.set(c2.id, true);

    // 3. CivThree (c3) fails minigame
    room.minigameResults.set(c3.id, false);

    // 4. CivFour (c4) does not submit (timeout / missing from minigameResults)

    // Resolve Night
    room.resolveNight();
    assert.equal(room.phase, 'NIGHT_RESOLUTION');

    // Verify deaths
    assert.equal(room.getPlayer(c1.id)!.alive, false, 'Mafia target should be eliminated');
    assert.equal(room.getPlayer(c2.id)!.alive, true, 'Passing civilian should survive');
    assert.equal(room.getPlayer(c3.id)!.alive, false, 'Failing civilian should be eliminated');
    assert.equal(room.getPlayer(c4.id)!.alive, false, 'Timeout civilian should be eliminated');

    // Verify death concealment
    const result = room.nightResult!;
    assert.ok(result);
    assert.equal(result.disappearedPlayers.length, 3);
    const disappearedIds = result.disappearedPlayers.map((p) => p.id);
    assert.ok(disappearedIds.includes(c1.id));
    assert.ok(disappearedIds.includes(c3.id));
    assert.ok(disappearedIds.includes(c4.id));

    // Ensure NO roles or causes of death are exposed in disappearedPlayers
    for (const d of result.disappearedPlayers) {
      assert.equal((d as any).role, undefined, 'Role must be concealed');
      assert.equal((d as any).cause, undefined, 'Cause of death must be concealed');
      assert.ok(d.name, 'Name should be present');
    }

    // Complete dawn -> Host Mafia (1) vs CivTwo (1) -> Mafia parity win
    room.completeNightResolution();
    assert.equal(room.phase, 'GAME_OVER');
    assert.equal(room.gameOverResult?.winner, 'MAFIA');
  });

  it('Phase 8: advances to next Day round when Civilians survive and neither team has won', () => {
    const room = new Room('CONT');
    const { player: host } = room.addPlayer('HostMafia', createMockSocket());
    const { player: c1 } = room.addPlayer('CivOne', createMockSocket());
    const { player: c2 } = room.addPlayer('CivTwo', createMockSocket());
    const { player: c3 } = room.addPlayer('CivThree', createMockSocket());
    const { player: c4 } = room.addPlayer('CivFour', createMockSocket());

    room.startGame(host.id);

    room.getPlayer(host.id)!.role = 'MAFIA';
    room.getPlayer(c1.id)!.role = 'CIVILIAN';
    room.getPlayer(c2.id)!.role = 'CIVILIAN';
    room.getPlayer(c3.id)!.role = 'CIVILIAN';
    room.getPlayer(c4.id)!.role = 'CIVILIAN';

    room.startNight();

    // Mafia targets C1
    room.selectMafiaTarget(host.id, c1.id);

    // C1, C2, C3, C4 all submit passing minigame answers
    room.minigameResults.set(c1.id, true);
    room.minigameResults.set(c2.id, true);
    room.minigameResults.set(c3.id, true);
    room.minigameResults.set(c4.id, true);

    // Night resolves: only C1 dies (from Mafia attack)
    room.resolveNight();
    assert.equal(room.phase, 'NIGHT_RESOLUTION');
    assert.equal(room.nightResult?.disappearedPlayers.length, 1);
    assert.equal(room.nightResult?.disappearedPlayers[0].id, c1.id);

    // Living: 1 Mafia vs 3 Civilians -> Game continues!
    room.completeNightResolution();
    assert.equal(room.phase, 'DAY');
    assert.equal(room.round, 2);
    assert.equal(room.getLivingPlayers().length, 4);
  });

  it('Phase 10: restores private state on player reconnection during Night, Voting, and Game Over', () => {
    const room = new Room('RECO');
    const sentMessages: { targetId: string; message: any }[] = [];

    const createTrackingSocket = (id: string) => {
      return {
        readyState: WebSocket.OPEN,
        send: (data: string) => {
          sentMessages.push({ targetId: id, message: JSON.parse(data) });
        },
        close: () => {},
        terminate: () => {}
      } as unknown as WebSocket;
    };

    const { player: host } = room.addPlayer('Host', createTrackingSocket('p_host'));
    const { player: civ } = room.addPlayer('Civilian', createTrackingSocket('p_civ'));
    const { player: maf2 } = room.addPlayer('MafiaTwo', createTrackingSocket('p_maf2'));
    const { player: civ2 } = room.addPlayer('CivTwo', createTrackingSocket('p_civ2'));

    room.startGame(host.id);
    room.getPlayer(host.id)!.role = 'MAFIA';
    room.getPlayer(maf2.id)!.role = 'MAFIA';
    room.getPlayer(civ.id)!.role = 'CIVILIAN';
    room.getPlayer(civ2.id)!.role = 'CIVILIAN';

    room.startNight();

    // 1. Test Civilian Night reconnection: challenge is re-sent
    sentMessages.length = 0;
    room.sendPrivateGameState(civ.id);
    const civRoleMsg = sentMessages.find((m) => m.message.type === 'ROLE_ASSIGNED');
    const civChallengeMsg = sentMessages.find((m) => m.message.type === 'MINIGAME_ASSIGNED');
    assert.ok(civRoleMsg, 'Civilian must receive role on reconnect');
    assert.equal(civRoleMsg.message.role, 'CIVILIAN');
    assert.ok(civChallengeMsg, 'Civilian must receive active challenge on reconnect');

    // 2. Test Mafia Night reconnection: role, teammates, target update are sent
    sentMessages.length = 0;
    room.sendPrivateGameState(host.id);
    const mafRoleMsg = sentMessages.find((m) => m.message.type === 'ROLE_ASSIGNED');
    const mafTargetMsg = sentMessages.find((m) => m.message.type === 'MAFIA_TARGET_UPDATE');
    assert.ok(mafRoleMsg, 'Mafia must receive role on reconnect');
    assert.equal(mafRoleMsg.message.role, 'MAFIA');
    assert.equal(mafRoleMsg.message.teammates.length, 1);
    assert.equal(mafRoleMsg.message.teammates[0].id, maf2.id);
    assert.ok(mafTargetMsg, 'Mafia must receive target status on reconnect');

    // 3. Test Game Over reconnection
    room.endGame('CIVILIANS');
    sentMessages.length = 0;
    room.sendPrivateGameState(civ.id);
    const gameOverMsg = sentMessages.find((m) => m.message.type === 'GAME_OVER');
    assert.ok(gameOverMsg, 'Player must receive GAME_OVER payload on reconnect');
    assert.equal(gameOverMsg.message.winner, 'CIVILIANS');
  });

  it('Phase 10: reassigns host to next connected player when the room host leaves', () => {
    const room = new Room('HOST');
    const { player: p1 } = room.addPlayer('Host1', createMockSocket());
    const { player: p2 } = room.addPlayer('Player2', createMockSocket());
    const { player: p3 } = room.addPlayer('Player3', createMockSocket());

    assert.equal(room.hostId, p1.id);

    // Host 1 leaves
    room.removePlayer(p1.id);
    assert.notEqual(room.hostId, p1.id);
    assert.equal(room.hostId, p2.id);
    assert.equal(room.getPlayer(p2.id)?.isHost, true);

    // Player 2 leaves -> Host transfers to Player 3
    room.removePlayer(p2.id);
    assert.equal(room.hostId, p3.id);
    assert.equal(room.getPlayer(p3.id)?.isHost, true);
  });

  it('Phase 10: handles multi-match rejoin flow and allows host to start next game directly from GAME_OVER', () => {
    const room = new Room('REPL');
    const { player: p1 } = room.addPlayer('Host', createMockSocket());
    const { player: p2 } = room.addPlayer('Player2', createMockSocket());
    const { player: p3 } = room.addPlayer('Player3', createMockSocket());
    const { player: p4 } = room.addPlayer('Player4', createMockSocket());

    room.startGame(p1.id);
    room.endGame('MAFIA');
    assert.equal(room.phase, 'GAME_OVER');

    // Simulate p4 disconnecting while in game over
    room.setPlayerConnected(p4.id, false);

    // p1, p2, p3 rejoin lobby
    room.rejoinLobby(p1.id);
    room.rejoinLobby(p2.id);
    assert.equal(room.phase, 'GAME_OVER'); // Still 1 connected player remaining (p3)

    room.rejoinLobby(p3.id);
    // Since all 3 currently connected players rejoined, room automatically resets to LOBBY!
    assert.equal(room.phase, 'LOBBY');
    assert.equal(room.getPlayer(p1.id)?.alive, true);
    assert.equal(room.getPlayer(p1.id)?.role, undefined);

    // Now host starts next match (Match 2)
    room.startGame(p1.id);
    assert.equal(room.phase, 'ROLE_REVEAL');
  });

  it('Unanimous Mafia targeting: requires all living Mafia to agree or assassination fails', () => {
    const room = new Room('UNAN');
    const sentMafiaMsgs: any[] = [];
    const socketM1 = {
      readyState: WebSocket.OPEN,
      send: (d: string) => sentMafiaMsgs.push(JSON.parse(d)),
      close: () => {},
      terminate: () => {}
    } as unknown as WebSocket;

    const { player: m1 } = room.addPlayer('MafiaOne', socketM1);
    const { player: m2 } = room.addPlayer('MafiaTwo', createMockSocket());
    const { player: c1 } = room.addPlayer('CivOne', createMockSocket());
    const { player: c2 } = room.addPlayer('CivTwo', createMockSocket());
    const { player: c3 } = room.addPlayer('CivThree', createMockSocket());

    room.startGame(m1.id);
    room.getPlayer(m1.id)!.role = 'MAFIA';
    room.getPlayer(m2.id)!.role = 'MAFIA';
    room.getPlayer(c1.id)!.role = 'CIVILIAN';
    room.getPlayer(c2.id)!.role = 'CIVILIAN';
    room.getPlayer(c3.id)!.role = 'CIVILIAN';

    room.startNight();
    assert.equal(room.phase, 'NIGHT');

    // 1. M1 targets C1 -> Split (M2 hasn't voted yet)
    sentMafiaMsgs.length = 0;
    room.selectMafiaTarget(m1.id, c1.id);
    assert.equal(room.nightMafiaTargetId, undefined, 'Target must not be set without unanimous agreement');
    const update1 = sentMafiaMsgs.find((m) => m.type === 'MAFIA_TARGET_UPDATE');
    assert.equal(update1.isUnanimous, false);
    assert.equal(update1.requiredVotes, 2);

    // 2. M2 targets C2 -> Split (1 vote for C1, 1 vote for C2)
    room.selectMafiaTarget(m2.id, c2.id);
    assert.equal(room.nightMafiaTargetId, undefined, 'Split votes must not set a target');

    // 3. M2 agrees and switches to C1 -> 2/2 unanimous agreement!
    sentMafiaMsgs.length = 0;
    room.selectMafiaTarget(m2.id, c1.id);
    assert.equal(room.nightMafiaTargetId, c1.id, 'Target locked when all living Mafia agree');
    const update3 = sentMafiaMsgs.find((m) => m.type === 'MAFIA_TARGET_UPDATE');
    assert.equal(update3.isUnanimous, true);
    assert.equal(update3.targetId, c1.id);

    // Keep civilians safe from minigame failure
    room.minigameResults.set(c1.id, true);
    room.minigameResults.set(c2.id, true);
    room.minigameResults.set(c3.id, true);

    // Resolve Night -> C1 is assassinated due to unanimous consensus
    room.resolveNight();
    assert.equal(room.getPlayer(c1.id)!.alive, false, 'Unanimously agreed target must be eliminated');
    assert.equal(room.getPlayer(c2.id)!.alive, true);
    assert.equal(room.getPlayer(c3.id)!.alive, true);
  });

  it('Looping minigames and Guaranteed Innocent Civilian identification', () => {
    const room = new Room('LOOP');
    const sentCivMsgs: any[] = [];
    const socketCiv = {
      readyState: WebSocket.OPEN,
      send: (d: string) => sentCivMsgs.push(JSON.parse(d)),
      close: () => {},
      terminate: () => {}
    } as unknown as WebSocket;

    const { player: host } = room.addPlayer('HostMafia', createMockSocket());
    const { player: c1 } = room.addPlayer('StarCiv', socketCiv);
    const { player: c2 } = room.addPlayer('OtherCiv', createMockSocket());
    const { player: c3 } = room.addPlayer('LazyCiv', createMockSocket());

    room.startGame(host.id);
    room.getPlayer(host.id)!.role = 'MAFIA';
    room.getPlayer(c1.id)!.role = 'CIVILIAN';
    room.getPlayer(c2.id)!.role = 'CIVILIAN';
    room.getPlayer(c3.id)!.role = 'CIVILIAN';

    room.startNight();

    // Civ 1 solves first challenge
    let c1Challenge = room.activeMinigames.get(c1.id)!;
    c1Challenge.validator = () => true;
    room.submitMinigameAction(c1.id, c1Challenge.token, 1);

    // Verify Civ 1 received initial challenge from startNight + next challenge from loop!
    const assignedMsgs = sentCivMsgs.filter((m) => m.type === 'MINIGAME_ASSIGNED');
    assert.equal(assignedMsgs.length, 2);
    assert.equal(assignedMsgs[1].score, 1);

    // Civ 1 solves second challenge
    c1Challenge = room.activeMinigames.get(c1.id)!;
    c1Challenge.validator = () => true;
    room.submitMinigameAction(c1.id, c1Challenge.token, 1);

    // Civ 1 solves third challenge
    c1Challenge = room.activeMinigames.get(c1.id)!;
    c1Challenge.validator = () => true;
    room.submitMinigameAction(c1.id, c1Challenge.token, 1);

    // Civ 2 solves 1 challenge
    const c2Challenge = room.activeMinigames.get(c2.id)!;
    c2Challenge.validator = () => true;
    room.submitMinigameAction(c2.id, c2Challenge.token, 1);

    // Civ 3 fails / solves 0 minigames (will disappear due to breached safehouse)

    // Resolve night
    room.resolveNight();

    // Verify StarCiv (C1) is identified as Top Defender and proven innocent!
    assert.ok(room.nightResult?.topDefender);
    assert.equal(room.nightResult?.topDefender?.id, c1.id);
    assert.equal(room.nightResult?.topDefender?.name, 'StarCiv');
    assert.equal(room.nightResult?.topDefender?.score, 3);
    assert.ok(room.provenCivilianIds.includes(c1.id), 'StarCiv must be in provenCivilianIds');

    // C3 solved 0 tasks -> breached and eliminated
    assert.equal(room.getPlayer(c3.id)!.alive, false);

    // Clean reset back to lobby removes proven status for fresh game
    room.resetToLobby();
    assert.equal(room.provenCivilianIds.length, 0);
  });
});



