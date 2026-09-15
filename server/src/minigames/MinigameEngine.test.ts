import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MinigameEngine } from './MinigameEngine.js';

describe('MinigameEngine — Challenge Generation & Validation', () => {
  it('correctly maps round numbers to difficulty levels', () => {
    assert.equal(MinigameEngine.getDifficulty(1), 'easy');
    assert.equal(MinigameEngine.getDifficulty(2), 'easy');
    assert.equal(MinigameEngine.getDifficulty(3), 'medium');
    assert.equal(MinigameEngine.getDifficulty(4), 'medium');
    assert.equal(MinigameEngine.getDifficulty(5), 'hard');
    assert.equal(MinigameEngine.getDifficulty(8), 'hard');
  });

  it('1. generates valid Number Sequence challenge and verifies answers', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p1', 'number-sequence');
    assert.equal(challenge.id, 'number-sequence');
    assert.ok(challenge.token.startsWith('tok_p1_'));
    assert.equal(challenge.data.sequence.length, 5);
    assert.ok(challenge.data.sequence.includes('?'));
    assert.equal(challenge.data.options.length, 4);

    // Find the correct answer by deducing from sequence
    const blankIdx = challenge.data.sequence.indexOf('?');
    const seq = challenge.data.sequence;
    let step = 0;
    if (blankIdx > 1) {
      step = seq[1] - seq[0];
    } else {
      step = seq[seq.length - 1] - seq[seq.length - 2];
    }

    const prevVal = blankIdx > 0 ? seq[blankIdx - 1] : seq[blankIdx + 1] - step;
    const correctVal = prevVal + step;

    assert.equal(validator({ selected: correctVal }), true);
    assert.equal(validator({ answer: correctVal }), true);
    assert.equal(validator({ selected: correctVal + 999 }), false);
    assert.equal(validator({ selected: null }), false);
  });

  it('2. generates valid Memory Grid challenge and verifies pattern matching', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p2', 'memory-grid');
    assert.equal(challenge.id, 'memory-grid');
    assert.equal(challenge.data.pattern.length, 3);
    assert.equal(challenge.data.gridSize, 3);

    const correctPattern = challenge.data.pattern;
    assert.equal(validator({ sequence: correctPattern }), true);

    // Wrong order or wrong items fail
    assert.equal(validator({ sequence: [99, 100, 101] }), false);
    assert.equal(validator({ sequence: [...correctPattern].reverse() }), false);
    assert.equal(validator({ sequence: [] }), false);
  });

  it('3. generates valid Reaction Test challenge and verifies reaction bounds', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p3', 'reaction-test');
    assert.equal(challenge.id, 'reaction-test');
    assert.ok(challenge.data.delayMs >= 1500);

    // Valid reaction time
    assert.equal(validator({ reactionTimeMs: 250, tappedEarly: false }), true);

    // Tapped early fails
    assert.equal(validator({ reactionTimeMs: 250, tappedEarly: true }), false);

    // Too slow fails (> 1200ms)
    assert.equal(validator({ reactionTimeMs: 1500, tappedEarly: false }), false);

    // Unrealistic/glitched reaction fails (<= 40ms)
    assert.equal(validator({ reactionTimeMs: 10, tappedEarly: false }), false);
  });

  it('4. generates valid Quick Math challenge and verifies calculation answers', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p4', 'quick-math');
    assert.equal(challenge.id, 'quick-math');
    assert.ok(challenge.data.equation.includes('= ?'));
    assert.equal(challenge.data.options.length, 4);

    // Find the correct option by testing which option passes the validator
    const correctOpt = challenge.data.options.find((opt: number) => validator({ answer: opt }));
    assert.ok(correctOpt !== undefined, 'At least one of the options must be the correct answer');

    assert.equal(validator({ answer: correctOpt }), true);
    assert.equal(validator({ selected: correctOpt }), true);
    assert.equal(validator({ answer: correctOpt + 9999 }), false);
    assert.equal(validator({}), false);
  });

  it('5. generates valid Color Match challenge and verifies Stroop answer', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p5', 'color-match');
    assert.equal(challenge.id, 'color-match');
    assert.ok(challenge.data.word);
    assert.ok(challenge.data.inkHex);
    assert.ok(challenge.data.options.length >= 3);

    // One option should be valid
    const passingOption = challenge.data.options.find(
      (opt: { name: string }) => validator({ selectedColor: opt.name })
    );
    assert.ok(passingOption !== undefined, 'Should have a passing color option');

    assert.equal(validator({ selectedColor: passingOption.name }), true);
    assert.equal(validator({ selectedColor: 'INVALID_NEON_MAGENTA' }), false);
  });

  it('6. generates valid Odd One Out challenge and identifies anomaly', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p6', 'odd-one-out');
    assert.equal(challenge.id, 'odd-one-out');
    assert.ok(challenge.data.tiles.length >= 9);

    // Find the index of the odd item
    const tiles: string[] = challenge.data.tiles;
    const counts = new Map<string, number>();
    for (const t of tiles) counts.set(t, (counts.get(t) || 0) + 1);
    const oddItem = Array.from(counts.entries()).find(([, count]) => count === 1)![0];
    const oddIndex = tiles.indexOf(oddItem);

    assert.equal(validator({ selectedIndex: oddIndex }), true);
    assert.equal(validator({ selectedIndex: (oddIndex + 1) % tiles.length }), false);
  });

  it('7. generates valid Find Number challenge and verifies target finding', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p7', 'find-number');
    assert.equal(challenge.id, 'find-number');
    const target = challenge.data.targetNumber;
    assert.ok(challenge.data.grid.includes(target));

    assert.equal(validator({ foundNumber: target }), true);
    assert.equal(validator({ answer: target }), true);
    assert.equal(validator({ foundNumber: target + 9999 }), false);
  });

  it('8. generates valid Tap In Order challenge and verifies ascending sequence', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p8', 'tap-in-order');
    assert.equal(challenge.id, 'tap-in-order');
    const numbers: number[] = challenge.data.numbers;
    const sorted = [...numbers].sort((a, b) => a - b);

    assert.equal(validator({ sequence: sorted }), true);
    assert.equal(validator({ sequence: numbers.sort((a, b) => b - a) }), false);
    assert.equal(validator({ sequence: [1, 2] }), false);
  });

  it('9. generates valid Pattern Completion challenge and verifies cipher symbol', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p9', 'pattern-completion');
    assert.equal(challenge.id, 'pattern-completion');
    assert.ok(challenge.data.sequence.includes('?'));
    assert.equal(challenge.data.options.length, 4);

    const correctSymbol = challenge.data.options.find((opt: string) => validator({ answer: opt }));
    assert.ok(correctSymbol !== undefined);

    assert.equal(validator({ answer: correctSymbol }), true);
    assert.equal(validator({ answer: 'WRONG_SYMBOL_🚀' }), false);
  });

  it('10. generates valid Count Shapes challenge and verifies shape tally', () => {
    const { challenge, validator } = MinigameEngine.generateChallenge('p10', 'count-shapes');
    assert.equal(challenge.id, 'count-shapes');
    const target = challenge.data.targetSymbol;
    const shapes: string[] = challenge.data.shapes;
    const actualCount = shapes.filter((s) => s === target).length;

    assert.equal(validator({ count: actualCount }), true);
    assert.equal(validator({ count: actualCount + 10 }), false);
  });

  it('generates random challenges from all 10 games when none is specified', () => {
    const seenIds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const { challenge } = MinigameEngine.generateChallenge(`p_${i}`);
      seenIds.add(challenge.id);
    }
    // With 50 rolls across 10 games, we expect at least 4 distinct minigames to be picked
    assert.ok(seenIds.size >= 4, `Expected varied games, got: ${Array.from(seenIds).join(', ')}`);
  });
});

