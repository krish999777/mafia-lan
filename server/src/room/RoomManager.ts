import { Room } from './Room.js';
import { generateRoomCode } from '../utils/codeGen.js';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  /**
   * Create a new room with a unique room code
   */
  public createRoom(): Room {
    let code: string;
    let attempts = 0;

    do {
      code = generateRoomCode(4);
      attempts++;
      if (attempts > 100) {
        // Fallback to longer code if collisions occur
        code = generateRoomCode(6);
        break;
      }
    } while (this.rooms.has(code));

    const room = new Room(code);
    this.rooms.set(code, room);
    console.log(`[RoomManager] Room created: ${code}`);
    return room;
  }

  /**
   * Get an existing room by code
   */
  public getRoom(rawCode: string): Room | undefined {
    if (!rawCode) return undefined;
    const code = rawCode.trim().toUpperCase();
    return this.rooms.get(code);
  }

  /**
   * Delete a room
   */
  public deleteRoom(rawCode: string): boolean {
    const code = rawCode.trim().toUpperCase();
    const deleted = this.rooms.delete(code);
    if (deleted) {
      console.log(`[RoomManager] Room deleted: ${code}`);
    }
    return deleted;
  }

  /**
   * Find a room containing a given playerId
   */
  public findRoomByPlayerId(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.getPlayer(playerId)) {
        return room;
      }
    }
    return undefined;
  }

  /**
   * Total number of active rooms
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Cleanup empty rooms older than 1 hour or with 0 players for 15 minutes
   */
  public cleanupStaleRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      // If room has 0 players and is older than 5 minutes
      if (room.getPlayerCount() === 0 && now - room.createdAt > 5 * 60 * 1000) {
        this.deleteRoom(code);
      }
    }
  }
}

export const roomManager = new RoomManager();
