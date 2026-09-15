import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './GameEngine.js';

describe('GameEngine — Role Assignment & Balancing', () => {
  it('throws error when player count is below minimum (4) or above maximum (15)', () => {
    assert.throws(() => GameEngine.calculateMafiaCount(3), /between 4 and 15/);
    assert.throws(() => GameEngine.calculateMafiaCount(16), /between 4 and 15/);
    assert.throws(() => GameEngine.assignRoles(['p1', 'p2', 'p3']), /between 4 and 15/);
    assert.throws(() => GameEngine.assignRoles(Array(16).fill('p')), /between 4 and 15/);
  });

  it('balances Mafia and Civilian ratios according to player counts (4 to 15)', () => {
    // 4 to 6 players: exactly 1 Mafia
    assert.equal(GameEngine.calculateMafiaCount(4), 1);
    assert.equal(GameEngine.calculateMafiaCount(5), 1);
    assert.equal(GameEngine.calculateMafiaCount(6), 1);

    // 7 to 9 players: exactly 2 Mafia
    assert.equal(GameEngine.calculateMafiaCount(7), 2);
    assert.equal(GameEngine.calculateMafiaCount(8), 2);
    assert.equal(GameEngine.calculateMafiaCount(9), 2);

    // 10 to 12 players: exactly 3 Mafia
    assert.equal(GameEngine.calculateMafiaCount(10), 3);
    assert.equal(GameEngine.calculateMafiaCount(11), 3);
    assert.equal(GameEngine.calculateMafiaCount(12), 3);

    // 13 to 15 players: exactly 4 Mafia
    assert.equal(GameEngine.calculateMafiaCount(13), 4);
    assert.equal(GameEngine.calculateMafiaCount(14), 4);
    assert.equal(GameEngine.calculateMafiaCount(15), 4);
  });

  it('calculates selectable Mafia options according to rules (1 for 4-6, 2 at 7, 3 at 10, 4 at 13)', () => {
    assert.deepEqual(GameEngine.calculateMafiaOptions(4), [1]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(6), [1]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(7), [1, 2]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(9), [1, 2]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(10), [1, 2, 3]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(12), [1, 2, 3]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(13), [1, 2, 3, 4]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(15), [1, 2, 3, 4]);
  });

  it('assigns custom chosen Mafia count when valid', () => {
    const players7 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    
    // Choose 1 Mafia for 7 players
    const roles1 = GameEngine.assignRoles(players7, 1);
    const mafia1 = Array.from(roles1.values()).filter((r) => r === 'MAFIA').length;
    assert.equal(mafia1, 1);

    // Choose 2 Mafia for 7 players
    const roles2 = GameEngine.assignRoles(players7, 2);
    const mafia2 = Array.from(roles2.values()).filter((r) => r === 'MAFIA').length;
    assert.equal(mafia2, 2);
  });

  it('evaluates win conditions accurately for Civilians and Mafia', () => {
    // 1. Civilian Victory: All Mafia eliminated
    const civWinPlayers = [
      { alive: false, role: 'MAFIA' as const },
      { alive: true, role: 'CIVILIAN' as const },
      { alive: true, role: 'CIVILIAN' as const }
    ];
    assert.deepEqual(GameEngine.checkWinCondition(civWinPlayers), {
      gameOver: true,
      winner: 'CIVILIANS'
    });

    // 2. Mafia Victory: Living Mafia equals living Civilians (1 vs 1)
    const mafiaWinParity = [
      { alive: true, role: 'MAFIA' as const },
      { alive: true, role: 'CIVILIAN' as const },
      { alive: false, role: 'CIVILIAN' as const }
    ];
    assert.deepEqual(GameEngine.checkWinCondition(mafiaWinParity), {
      gameOver: true,
      winner: 'MAFIA'
    });

    // 3. Ongoing: Civilians outnumber Mafia (2 Civilians vs 1 Mafia)
    const ongoing = [
      { alive: true, role: 'MAFIA' as const },
      { alive: true, role: 'CIVILIAN' as const },
      { alive: true, role: 'CIVILIAN' as const }
    ];
    assert.deepEqual(GameEngine.checkWinCondition(ongoing), {
      gameOver: false
    });
  });

  it('assigns exact role counts to players without duplicates or missing players', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const roles = GameEngine.assignRoles(players);

    assert.equal(roles.size, 7);

    let mafiaCount = 0;
    let civilianCount = 0;

    for (const [id, role] of roles.entries()) {
      assert.ok(players.includes(id));
      if (role === 'MAFIA') mafiaCount++;
      if (role === 'CIVILIAN') civilianCount++;
    }

    assert.equal(mafiaCount, 2);
    assert.equal(civilianCount, 5);
  });

  it('demonstrates non-deterministic assignment over multiple rounds', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const mafiaHits: Record<string, number> = { p1: 0, p2: 0, p3: 0, p4: 0 };

    for (let i = 0; i < 100; i++) {
      const roles = GameEngine.assignRoles(players);
      for (const [id, role] of roles.entries()) {
        if (role === 'MAFIA') {
          mafiaHits[id]++;
        }
      }
    }

    // Every player should have been assigned Mafia at least once over 100 iterations
    for (const id of players) {
      assert.ok(
        mafiaHits[id] > 0,
        `Expected player ${id} to be assigned Mafia at least once, got ${mafiaHits[id]}`
      );
    }
  });
});

describe('GameEngine — Vote Tallying & Elimination', () => {
  it('eliminates candidate with clear majority', () => {
    const living = ['p1', 'p2', 'p3', 'p4'];
    const votes = new Map<string, string>([
      ['p1', 'p2'],
      ['p3', 'p2'],
      ['p4', 'p2'],
      ['p2', 'p1']
    ]);

    const result = GameEngine.resolveVotes(votes, living);
    assert.equal(result.isTie, false);
    assert.equal(result.eliminatedId, 'p2');
    assert.equal(result.tallies.get('p2'), 3);
    assert.equal(result.tallies.get('p1'), 1);
    assert.equal(result.tallies.get('p3'), 0);
  });

  it('detects tie and eliminates no one when top votes are equal', () => {
    const living = ['p1', 'p2', 'p3', 'p4'];
    const votes = new Map<string, string>([
      ['p1', 'p2'],
      ['p2', 'p1'],
      ['p3', 'p2'],
      ['p4', 'p1']
    ]);

    const result = GameEngine.resolveVotes(votes, living);
    assert.equal(result.isTie, true);
    assert.equal(result.eliminatedId, undefined);
    assert.equal(result.tallies.get('p1'), 2);
    assert.equal(result.tallies.get('p2'), 2);
  });

  it('handles zero votes cast without crashing (no elimination)', () => {
    const living = ['p1', 'p2', 'p3', 'p4'];
    const votes = new Map<string, string>();

    const result = GameEngine.resolveVotes(votes, living);
    assert.equal(result.eliminatedId, undefined);
    assert.equal(result.tallies.get('p1'), 0);
  });
});
