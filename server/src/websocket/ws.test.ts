import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { setupWebSocket } from './wsHandler.js';
import { ClientMessage, ServerMessage } from '../../../shared/types.js';

describe('WebSocket Multi-Client Flow', () => {
  let server: http.Server;
  let wss: WebSocketServer;
  let port: number;
  let wsUrl: string;

  before(async () => {
    const app = express();
    server = http.createServer(app);
    wss = new WebSocketServer({ server, path: '/ws' });
    setupWebSocket(wss);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        port = addr.port;
        wsUrl = `ws://127.0.0.1:${port}/ws`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      wss.close(() => {
        server.close(() => resolve());
      });
    });
  });

  function connectClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function waitForMessage(ws: WebSocket, type?: string): Promise<ServerMessage> {
    return new Promise((resolve) => {
      const handler = (data: any) => {
        const msg = JSON.parse(data.toString()) as ServerMessage;
        if (!type || msg.type === type) {
          ws.off('message', handler);
          resolve(msg);
        }
      };
      ws.on('message', handler);
    });
  }

  function waitForMessageMatching(ws: WebSocket, predicate: (msg: any) => boolean): Promise<ServerMessage> {
    return new Promise((resolve) => {
      const handler = (data: any) => {
        const msg = JSON.parse(data.toString()) as ServerMessage;
        if (predicate(msg)) {
          ws.off('message', handler);
          resolve(msg);
        }
      };
      ws.on('message', handler);
    });
  }

  it('allows Host to create room and multiple clients to join simultaneously', async () => {
    const clientHost = await connectClient();
    const client2 = await connectClient();
    const client3 = await connectClient();

    // 1. Host creates room
    const hostCreatedPromise = waitForMessage(clientHost, 'ROOM_CREATED');
    clientHost.send(JSON.stringify({ type: 'CREATE_ROOM', name: 'Krish' } as ClientMessage));

    const createdMsg = (await hostCreatedPromise) as any;
    assert.equal(createdMsg.type, 'ROOM_CREATED');
    assert.ok(createdMsg.roomCode);
    assert.equal(createdMsg.isHost, true);

    const roomCode = createdMsg.roomCode;

    // 2. Client 2 joins
    const client2JoinedPromise = waitForMessage(client2, 'ROOM_JOINED');
    const hostStateUpdatePromise = waitForMessage(clientHost, 'ROOM_STATE');

    client2.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        name: 'Aryan'
      } as ClientMessage)
    );

    const client2Joined = (await client2JoinedPromise) as any;
    assert.equal(client2Joined.type, 'ROOM_JOINED');
    assert.equal(client2Joined.roomCode, roomCode);
    assert.equal(client2Joined.isHost, false);

    const hostState = (await hostStateUpdatePromise) as any;
    assert.equal(hostState.type, 'ROOM_STATE');
    assert.equal(hostState.players.length, 2);
    assert.ok(hostState.players.some((p: any) => p.name === 'Krish'));
    assert.ok(hostState.players.some((p: any) => p.name === 'Aryan'));

    // 3. Client 3 joins
    const client3JoinedPromise = waitForMessage(client3, 'ROOM_JOINED');
    client3.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        name: 'Neha'
      } as ClientMessage)
    );

    const client3Joined = (await client3JoinedPromise) as any;
    assert.equal(client3Joined.type, 'ROOM_JOINED');

    // Verify all 3 are in the room
    assert.equal(client3Joined.players.length, 3);

    // 4. Duplicate name check
    const clientDuplicate = await connectClient();
    const errorPromise = waitForMessage(clientDuplicate, 'ERROR');
    clientDuplicate.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        name: 'aryan' // duplicate of Aryan
      } as ClientMessage)
    );

    const errorMsg = (await errorPromise) as any;
    assert.equal(errorMsg.type, 'ERROR');
    assert.match(errorMsg.message, /already taken/i);

    // Clean up connections
    clientHost.close();
    client2.close();
    client3.close();
    clientDuplicate.close();
  });

  it('assigns roles securely when host starts the game with 4 players', async () => {
    const host = await connectClient();
    const p2 = await connectClient();
    const p3 = await connectClient();
    const p4 = await connectClient();

    // 1. Host creates room
    const hostCreatedPromise = waitForMessage(host, 'ROOM_CREATED');
    host.send(JSON.stringify({ type: 'CREATE_ROOM', name: 'HostDev' } as ClientMessage));
    const { roomCode } = (await hostCreatedPromise) as any;

    // 2. Three more players join
    const p2Join = waitForMessage(p2, 'ROOM_JOINED');
    p2.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode, name: 'PlayerTwo' } as ClientMessage));
    await p2Join;

    const p3Join = waitForMessage(p3, 'ROOM_JOINED');
    p3.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode, name: 'PlayerThree' } as ClientMessage));
    await p3Join;

    const p4Join = waitForMessage(p4, 'ROOM_JOINED');
    p4.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode, name: 'PlayerFour' } as ClientMessage));
    await p4Join;

    // 3. Non-host player tries to start game (must fail)
    const unauthorizedErrorPromise = waitForMessage(p2, 'ERROR');
    p2.send(JSON.stringify({ type: 'START_GAME' } as ClientMessage));
    const unauthorizedError = (await unauthorizedErrorPromise) as any;
    assert.match(unauthorizedError.message, /only the room host/i);

    // 4. Host starts game
    const hostRolePromise = waitForMessage(host, 'ROLE_ASSIGNED');
    const p2RolePromise = waitForMessage(p2, 'ROLE_ASSIGNED');
    const p3RolePromise = waitForMessage(p3, 'ROLE_ASSIGNED');
    const p4RolePromise = waitForMessage(p4, 'ROLE_ASSIGNED');
    const hostStatePromise = waitForMessage(host, 'ROOM_STATE');

    host.send(JSON.stringify({ type: 'START_GAME' } as ClientMessage));

    const [roleHost, roleP2, roleP3, roleP4, roomState] = (await Promise.all([
      hostRolePromise,
      p2RolePromise,
      p3RolePromise,
      p4RolePromise,
      hostStatePromise
    ])) as any[];

    // 5. Verify room state phase is ROLE_REVEAL and hides all roles
    assert.equal(roomState.phase, 'ROLE_REVEAL');
    assert.ok(roomState.phaseEndsAt > Date.now());
    for (const playerSummary of roomState.players) {
      assert.equal(
        (playerSummary as any).role,
        undefined,
        'Player summary in ROOM_STATE must NEVER leak player roles!'
      );
    }

    // 6. Verify role assignment counts: exactly 1 Mafia, 3 Civilians
    const allRoles = [roleHost, roleP2, roleP3, roleP4];
    const mafiaList = allRoles.filter((r) => r.role === 'MAFIA');
    const civList = allRoles.filter((r) => r.role === 'CIVILIAN');

    assert.equal(mafiaList.length, 1);
    assert.equal(civList.length, 3);

    // Civilians must receive zero teammate information
    for (const civ of civList) {
      assert.equal(civ.teammates, undefined);
    }

    // Clean up
    host.close();
    p2.close();
    p3.close();
    p4.close();
  });

  it('handles Day -> Voting -> Hidden Votes -> Elimination flow', async () => {
    const host = await connectClient();
    const p2 = await connectClient();
    const p3 = await connectClient();
    const p4 = await connectClient();

    // 1. Setup room and 4 players
    const hostCreatedPromise = waitForMessage(host, 'ROOM_CREATED');
    host.send(JSON.stringify({ type: 'CREATE_ROOM', name: 'HostAlice' } as ClientMessage));
    const { roomCode, playerId: hostId } = (await hostCreatedPromise) as any;

    const p2Join = waitForMessage(p2, 'ROOM_JOINED');
    p2.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode, name: 'Bob' } as ClientMessage));
    const { playerId: p2Id } = (await p2Join) as any;

    const p3Join = waitForMessage(p3, 'ROOM_JOINED');
    p3.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode, name: 'Charlie' } as ClientMessage));
    const { playerId: p3Id } = (await p3Join) as any;

    const p4Join = waitForMessage(p4, 'ROOM_JOINED');
    p4.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode, name: 'Dave' } as ClientMessage));
    const { playerId: p4Id } = (await p4Join) as any;

    // 2. Start game and transition to Day
    const hostStateRoleReveal = waitForMessageMatching(
      host,
      (m) => m.type === 'ROOM_STATE' && m.phase === 'ROLE_REVEAL'
    );
    host.send(JSON.stringify({ type: 'START_GAME' } as ClientMessage));
    await hostStateRoleReveal;

    // Transition room to Day for test
    const { roomManager } = await import('../room/RoomManager.js');
    const room = roomManager.getRoom(roomCode)!;
    const hostStateDay = waitForMessageMatching(
      host,
      (m) => m.type === 'ROOM_STATE' && m.phase === 'DAY'
    );
    room.startDay();
    await hostStateDay;

    // 3. Host starts voting
    const votingStatePromise = waitForMessageMatching(
      host,
      (m) => m.type === 'ROOM_STATE' && m.phase === 'VOTING'
    );
    host.send(JSON.stringify({ type: 'START_VOTING' } as ClientMessage));
    const votingState = (await votingStatePromise) as any;
    assert.equal(votingState.phase, 'VOTING');

    // 4. Test self-voting restriction
    const selfVoteErrorPromise = waitForMessage(p2, 'ERROR');
    p2.send(JSON.stringify({ type: 'CAST_VOTE', targetPlayerId: p2Id } as ClientMessage));
    const selfVoteError = (await selfVoteErrorPromise) as any;
    assert.match(selfVoteError.message, /cannot vote for yourself/i);

    // 5. Cast votes: Host, P2, P3 vote for P4 (Dave); P4 votes for P2 (Bob)
    const resultPromise = waitForMessage(host, 'VOTE_RESULT');
    const eliminationStatePromise = waitForMessage(host, 'ROOM_STATE');

    host.send(JSON.stringify({ type: 'CAST_VOTE', targetPlayerId: p4Id } as ClientMessage));
    p2.send(JSON.stringify({ type: 'CAST_VOTE', targetPlayerId: p4Id } as ClientMessage));
    p3.send(JSON.stringify({ type: 'CAST_VOTE', targetPlayerId: p4Id } as ClientMessage));
    p4.send(JSON.stringify({ type: 'CAST_VOTE', targetPlayerId: p2Id } as ClientMessage));

    const voteResult = (await resultPromise) as any;
    const eliminationState = (await eliminationStatePromise) as any;

    // 6. Verify result
    assert.equal(voteResult.type, 'VOTE_RESULT');
    assert.equal(voteResult.isTie, false);
    assert.equal(voteResult.eliminatedPlayer.id, p4Id);
    assert.equal(voteResult.eliminatedPlayer.name, 'Dave');

    const p4Tally = voteResult.tallies.find((t: any) => t.playerId === p4Id);
    assert.equal(p4Tally.votes, 3);

    // 7. Verify P4 is marked dead in updated room state
    assert.equal(eliminationState.phase, 'DAY_ELIMINATION');
    const daveSummary = eliminationState.players.find((p: any) => p.id === p4Id);
    assert.equal(daveSummary.alive, false);

    // 8. Dead player cannot vote
    const deadVoteErrorPromise = waitForMessage(p4, 'ERROR');
    p4.send(JSON.stringify({ type: 'CAST_VOTE', targetPlayerId: p2Id } as ClientMessage));
    const deadVoteError = (await deadVoteErrorPromise) as any;
    assert.match(deadVoteError.message, /eliminated/i);

    // Clean up
    host.close();
    p2.close();
    p3.close();
    p4.close();
  });
});
