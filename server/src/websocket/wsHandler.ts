import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { roomManager } from '../room/RoomManager.js';
import { ClientMessage, ServerMessage } from '../../../shared/types.js';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  roomId?: string;
  playerId?: string;
}

export function setupWebSocket(wss: WebSocketServer): void {
  // Connection heartbeat check
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as ExtendedWebSocket;
      if (!client.isAlive) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);
  heartbeatInterval.unref();

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (socket: WebSocket, _req: IncomingMessage) => {
    const ws = socket as ExtendedWebSocket;
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (rawData) => {
      try {
        const text = rawData.toString();
        const msg = JSON.parse(text) as ClientMessage;
        handleClientMessage(ws, msg);
      } catch (err) {
        console.error('[WS] Error processing message:', err);
        sendError(ws, 'Malformed message format');
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err);
    });
  });
}

function handleClientMessage(ws: ExtendedWebSocket, msg: ClientMessage): void {
  switch (msg.type) {
    case 'PING': {
      sendMessage(ws, { type: 'PONG' });
      break;
    }

    case 'CREATE_ROOM': {
      const name = (msg.name || '').trim();
      if (!name) {
        return sendError(ws, 'Display name is required');
      }

      const room = roomManager.createRoom();
      try {
        const { player } = room.addPlayer(name, ws);
        ws.roomId = room.roomCode;
        ws.playerId = player.id;

        sendMessage(ws, {
          type: 'ROOM_CREATED',
          roomCode: room.roomCode,
          playerId: player.id,
          isHost: true
        });

        // Send full initial room state
        room.sendRoomState(player.id);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to create room');
      }
      break;
    }

    case 'START_GAME': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.startGame(ws.playerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to start game');
      }
      break;
    }

    case 'START_VOTING': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.startVoting(ws.playerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to start voting');
      }
      break;
    }

    case 'CAST_VOTE': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.castVote(ws.playerId, msg.targetPlayerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to cast vote');
      }
      break;
    }

    case 'FORCE_RESOLVE_VOTE': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.resolveVoting(ws.playerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to resolve votes');
      }
      break;
    }

    case 'RESET_TO_LOBBY': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.resetToLobby(ws.playerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to reset room to lobby');
      }
      break;
    }

    case 'SET_MAFIA_COUNT': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.setMafiaCount(ws.playerId, msg.count);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to set Mafia count');
      }
      break;
    }

    case 'REJOIN_LOBBY': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.rejoinLobby(ws.playerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to return to lobby');
      }
      break;
    }

    case 'MAFIA_MESSAGE': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.sendMafiaMessage(ws.playerId, msg.text);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to send Mafia message');
      }
      break;
    }

    case 'SELECT_MAFIA_TARGET': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.selectMafiaTarget(ws.playerId, msg.targetPlayerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to select Mafia target');
      }
      break;
    }

    case 'SUBMIT_MINIGAME_ACTION': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.submitMinigameAction(ws.playerId, msg.token, msg.payload);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to submit minigame action');
      }
      break;
    }

    case 'START_NIGHT': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.startNight(ws.playerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to start Night');
      }
      break;
    }

    case 'FORCE_RESOLVE_NIGHT': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.resolveNight(ws.playerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to resolve Night');
      }
      break;
    }

    case 'FORCE_RESOLVE_DAWN': {
      if (!ws.roomId || !ws.playerId) {
        return sendError(ws, 'Not in an active room');
      }

      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        return sendError(ws, 'Room not found');
      }

      try {
        room.completeNightResolution(ws.playerId);
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to advance Dawn');
      }
      break;
    }

    case 'JOIN_ROOM': {
      const name = (msg.name || '').trim();
      const code = (msg.roomCode || '').trim().toUpperCase();

      if (!name) {
        return sendError(ws, 'Display name is required');
      }
      if (!code) {
        return sendError(ws, 'Room code is required');
      }

      const room = roomManager.getRoom(code);
      if (!room) {
        return sendError(ws, `Room "${code}" not found. Please verify the 4-letter code.`, 'ROOM_NOT_FOUND');
      }

      if (room.phase !== 'LOBBY') {
        return sendError(ws, 'Game has already started in this room', 'GAME_IN_PROGRESS');
      }

      try {
        const { player } = room.addPlayer(name, ws);
        ws.roomId = room.roomCode;
        ws.playerId = player.id;

        // Acknowledge join to the connecting player
        sendMessage(ws, {
          type: 'ROOM_JOINED',
          roomCode: room.roomCode,
          playerId: player.id,
          isHost: player.isHost,
          players: room.getPlayersSummary()
        });

        // Broadcast updated state to every player in the room
        room.broadcastRoomState();
      } catch (err: any) {
        sendError(ws, err.message || 'Failed to join room', 'JOIN_FAILED');
      }
      break;
    }

    case 'RECONNECT': {
      const code = (msg.roomCode || '').trim().toUpperCase();
      const playerId = msg.playerId;
      const room = roomManager.getRoom(code);

      if (!room) {
        return sendError(ws, 'Room no longer exists', 'ROOM_NOT_FOUND');
      }

      const player = room.reconnectPlayer(playerId, ws);
      if (!player) {
        return sendError(ws, 'Player session expired or not found', 'SESSION_EXPIRED');
      }

      ws.roomId = room.roomCode;
      ws.playerId = player.id;

      // Restore room state for player
      sendMessage(ws, {
        type: 'ROOM_JOINED',
        roomCode: room.roomCode,
        playerId: player.id,
        isHost: player.isHost,
        players: room.getPlayersSummary()
      });

      // Broadcast full room state with all metadata
      room.broadcastRoomState();

      // Restore private game state for the active phase
      room.sendPrivateGameState(player.id);
      break;
    }

    case 'LEAVE_ROOM': {
      if (ws.roomId && ws.playerId) {
        const room = roomManager.getRoom(ws.roomId);
        if (room) {
          const removedId = ws.playerId;
          room.removePlayer(removedId);
          ws.roomId = undefined;
          ws.playerId = undefined;

          if (room.getPlayerCount() === 0) {
            roomManager.deleteRoom(room.roomCode);
          } else {
            room.broadcast({
              type: 'PLAYER_LEFT',
              playerId: removedId
            });
            room.broadcastRoomState();
          }
        }
      }
      break;
    }

    default:
      console.warn('[WS] Unhandled client message:', msg);
  }
}

function handleDisconnect(ws: ExtendedWebSocket): void {
  if (ws.roomId && ws.playerId) {
    const room = roomManager.getRoom(ws.roomId);
    if (room) {
      room.setPlayerConnected(ws.playerId, false);
      // Notify remaining players in room about connection drop
      room.broadcastRoomState();
    }
  }
}

function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, message: string, code?: string): void {
  sendMessage(ws, {
    type: 'ERROR',
    message,
    code
  });
}
