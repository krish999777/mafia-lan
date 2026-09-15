import { Role, MIN_PLAYERS, MAX_PLAYERS } from '../../../shared/types.js';

export class GameEngine {
  public static readonly MIN_PLAYERS = MIN_PLAYERS;
  public static readonly MAX_PLAYERS = MAX_PLAYERS;

  /**
   * Determine selectable Mafia options based on total player count (4 to 15):
   * 4-6 players: [1] (fixed 1)
   * 7-9 players: [1, 2] (7 needed for 2)
   * 10-12 players: [1, 2, 3] (10 needed for 3)
   * 13-15 players: [1, 2, 3, 4]
   */
  public static calculateMafiaOptions(totalPlayers: number): number[] {
    if (totalPlayers < this.MIN_PLAYERS || totalPlayers > this.MAX_PLAYERS) {
      return [1];
    }
    if (totalPlayers <= 6) return [1];
    if (totalPlayers <= 9) return [1, 2];
    if (totalPlayers <= 12) return [1, 2, 3];
    return [1, 2, 3, 4];
  }

  /**
   * Determine balanced default Mafia count based on total players (4 to 15):
   * 4-6 players: 1 Mafia
   * 7-9 players: 2 Mafia
   * 10-12 players: 3 Mafia
   * 13-15 players: 4 Mafia
   */
  public static calculateMafiaCount(totalPlayers: number): number {
    if (totalPlayers < this.MIN_PLAYERS || totalPlayers > this.MAX_PLAYERS) {
      throw new Error(`Cannot calculate roles: player count must be between ${this.MIN_PLAYERS} and ${this.MAX_PLAYERS}`);
    }

    if (totalPlayers <= 6) return 1;
    if (totalPlayers <= 9) return 2;
    if (totalPlayers <= 12) return 3;
    return 4;
  }

  /**
   * Randomly assigns roles to a list of player IDs using Fisher-Yates shuffle.
   * Optionally accepts a host-chosen mafiaCount if valid for player size.
   * Returns a Map of playerId -> Role.
   */
  public static assignRoles(playerIds: string[], chosenMafiaCount?: number): Map<string, Role> {
    if (playerIds.length < this.MIN_PLAYERS || playerIds.length > this.MAX_PLAYERS) {
      throw new Error(`Cannot start game: player count must be between ${this.MIN_PLAYERS} and ${this.MAX_PLAYERS}`);
    }

    const validOptions = this.calculateMafiaOptions(playerIds.length);
    const mafiaCount =
      chosenMafiaCount !== undefined && validOptions.includes(chosenMafiaCount)
        ? chosenMafiaCount
        : this.calculateMafiaCount(playerIds.length);

    const shuffled = [...playerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    const roleMap = new Map<string, Role>();

    for (let i = 0; i < shuffled.length; i++) {
      const pid = shuffled[i];
      const role: Role = i < mafiaCount ? 'MAFIA' : 'CIVILIAN';
      roleMap.set(pid, role);
    }

    return roleMap;
  }

  /**
   * Check win conditions:
   * - Civilians win: all Mafia are eliminated (livingMafia === 0)
   * - Mafia win: living Mafia >= living Civilians
   */
  public static checkWinCondition(
    players: { alive: boolean; role?: Role }[]
  ): { gameOver: boolean; winner?: 'CIVILIANS' | 'MAFIA' } {
    const livingMafia = players.filter((p) => p.alive && p.role === 'MAFIA').length;
    const livingCivilians = players.filter((p) => p.alive && p.role === 'CIVILIAN').length;

    // Civilian victory: zero living mafia
    if (livingMafia === 0) {
      return { gameOver: true, winner: 'CIVILIANS' };
    }

    // Mafia victory: mafia count equals or exceeds living civilian count
    if (livingMafia >= livingCivilians && livingMafia > 0) {
      return { gameOver: true, winner: 'MAFIA' };
    }

    return { gameOver: false };
  }

  /**
   * Tally votes and determine who (if anyone) is eliminated.
   * - Tallies votes per candidate.
   * - If there is a tie between the top candidates (or 0 votes cast), isTie is true and eliminatedId is undefined.
   * - Otherwise, the candidate with the highest vote count is eliminated.
   */
  public static resolveVotes(
    votes: Map<string, string>,
    livingPlayerIds: string[]
  ): {
    tallies: Map<string, number>;
    eliminatedId?: string;
    isTie: boolean;
  } {
    const tallies = new Map<string, number>();
    for (const pid of livingPlayerIds) {
      tallies.set(pid, 0);
    }

    for (const targetId of votes.values()) {
      if (tallies.has(targetId)) {
        tallies.set(targetId, (tallies.get(targetId) || 0) + 1);
      }
    }

    let maxVotes = 0;
    let topCandidates: string[] = [];

    for (const [candidateId, count] of tallies.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        topCandidates = [candidateId];
      } else if (count === maxVotes && count > 0) {
        topCandidates.push(candidateId);
      }
    }

    if (maxVotes === 0 || topCandidates.length > 1) {
      return {
        tallies,
        eliminatedId: undefined,
        isTie: topCandidates.length > 1
      };
    }

    return {
      tallies,
      eliminatedId: topCandidates[0],
      isTie: false
    };
  }
}
