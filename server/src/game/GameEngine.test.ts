import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './GameEngine.js';

describe('GameEngine — Role Assignment & Balancing', () => {
  it('throws error when player count is below minimum (4) or above maximum (30)', () => {
    assert.throws(() => GameEngine.calculateMafiaCount(3), /between 4 and 30/);
    assert.throws(() => GameEngine.calculateMafiaCount(31), /between 4 and 30/);
    assert.throws(() => GameEngine.assignRoles(['p1', 'p2', 'p3']), /between 4 and 30/);
    assert.throws(() => GameEngine.assignRoles(Array(31).fill('p')), /between 4 and 30/);
  });

  it('balances Mafia and Civilian ratios according to player counts (4 to 30)', () => {
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

    // 16 to 18 players: exactly 5 Mafia
    assert.equal(GameEngine.calculateMafiaCount(16), 5);
    assert.equal(GameEngine.calculateMafiaCount(17), 5);
    assert.equal(GameEngine.calculateMafiaCount(18), 5);

    // 19 to 21 players: exactly 6 Mafia
    assert.equal(GameEngine.calculateMafiaCount(19), 6);
    assert.equal(GameEngine.calculateMafiaCount(20), 6);
    assert.equal(GameEngine.calculateMafiaCount(21), 6);

    // 22 to 24 players: exactly 7 Mafia
    assert.equal(GameEngine.calculateMafiaCount(22), 7);
    assert.equal(GameEngine.calculateMafiaCount(23), 7);
    assert.equal(GameEngine.calculateMafiaCount(24), 7);

    // 25 to 27 players: exactly 8 Mafia
    assert.equal(GameEngine.calculateMafiaCount(25), 8);
    assert.equal(GameEngine.calculateMafiaCount(26), 8);
    assert.equal(GameEngine.calculateMafiaCount(27), 8);

    // 28 to 30 players: exactly 9 Mafia
    assert.equal(GameEngine.calculateMafiaCount(28), 9);
    assert.equal(GameEngine.calculateMafiaCount(29), 9);
    assert.equal(GameEngine.calculateMafiaCount(30), 9);
  });

  it('calculates selectable Mafia options according to rules (1 for 4-6 up to 9 for 28-30)', () => {
    assert.deepEqual(GameEngine.calculateMafiaOptions(4), [1]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(6), [1]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(7), [1, 2]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(9), [1, 2]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(10), [1, 2, 3]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(12), [1, 2, 3]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(13), [1, 2, 3, 4]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(15), [1, 2, 3, 4]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(16), [1, 2, 3, 4, 5]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(18), [1, 2, 3, 4, 5]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(19), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(21), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(22), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(24), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(25), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(27), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(28), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(GameEngine.calculateMafiaOptions(30), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
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

    // 30 players: default is 9 mafia, can choose 5 or 9
    const players30 = Array.from({ length: 30 }, (_, i) => `p${i + 1}`);
    const rolesDefault = GameEngine.assignRoles(players30);
    const mafiaDefault = Array.from(rolesDefault.values()).filter((r) => r === 'MAFIA').length;
    assert.equal(mafiaDefault, 9);

    const rolesCustom5 = GameEngine.assignRoles(players30, 5);
    const mafiaCustom5 = Array.from(rolesCustom5.values()).filter((r) => r === 'MAFIA').length;
    assert.equal(mafiaCustom5, 5);
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

  it('guarantees specified players receive Mafia when forcedMafiaIds is supplied', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

    // Run 50 times to prove deterministic guarantee
    for (let i = 0; i < 50; i++) {
      const roles = GameEngine.assignRoles(players, 1, ['p3']);
      assert.equal(roles.get('p3'), 'MAFIA');
      assert.equal(roles.get('p1'), 'CIVILIAN');
    }

    // Multiple forced mafia in 7-player game where 2 mafias are valid
    const players7 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const multiRoles = GameEngine.assignRoles(players7, 2, ['p2', 'p5']);
    assert.equal(multiRoles.get('p2'), 'MAFIA');
    assert.equal(multiRoles.get('p5'), 'MAFIA');

    // Forcing more than the allowed mafia count replaces the oldest chosen with the latest (without increasing mafia count)
    const excessRoles = GameEngine.assignRoles(players7, 2, ['p1', 'p2', 'p5']);
    assert.equal(excessRoles.get('p1'), 'CIVILIAN', 'Oldest chosen mafia p1 should be replaced');
    assert.equal(excessRoles.get('p2'), 'MAFIA', 'p2 should remain mafia');
    assert.equal(excessRoles.get('p5'), 'MAFIA', 'Latest chosen mafia p5 should be mafia');

    const totalMafia = Array.from(excessRoles.values()).filter((r) => r === 'MAFIA').length;
    assert.equal(totalMafia, 2, 'Total mafia count must not increase');
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
