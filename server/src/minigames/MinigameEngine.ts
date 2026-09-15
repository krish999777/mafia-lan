import { MinigameChallenge, MinigameId } from '../../../shared/types.js';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedChallenge {
  challenge: MinigameChallenge;
  validator: (payload: any) => boolean;
}

export class MinigameEngine {
  public static readonly MINIGAME_IDS: MinigameId[] = [
    'number-sequence',
    'memory-grid',
    'reaction-test',
    'quick-math',
    'color-match',
    'odd-one-out',
    'find-number',
    'tap-in-order',
    'pattern-completion',
    'count-shapes'
  ];

  /**
   * Determine difficulty based on game round
   * Rounds 1-2: Easy
   * Rounds 3-4: Medium
   * Rounds 5+: Hard
   */
  public static getDifficulty(round: number): Difficulty {
    if (round <= 2) return 'easy';
    if (round <= 4) return 'medium';
    return 'hard';
  }

  /**
   * Generates a minigame challenge for a player.
   * Supports overloaded signature:
   * (playerId, forcedGameId) or (playerId, round, forcedGameId)
   */
  public static generateChallenge(
    playerId: string,
    roundOrGameId?: number | MinigameId,
    forcedGameId?: MinigameId
  ): GeneratedChallenge {
    let round = 1;
    let selectedGameId: MinigameId | undefined;

    if (typeof roundOrGameId === 'number') {
      round = roundOrGameId;
      selectedGameId = forcedGameId;
    } else if (typeof roundOrGameId === 'string') {
      selectedGameId = roundOrGameId as MinigameId;
    }

    const gameId =
      selectedGameId ||
      this.MINIGAME_IDS[Math.floor(Math.random() * this.MINIGAME_IDS.length)];

    const token = `tok_${playerId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const difficulty = this.getDifficulty(round);

    switch (gameId) {
      case 'number-sequence':
        return this.createNumberSequenceChallenge(token, difficulty);
      case 'memory-grid':
        return this.createMemoryGridChallenge(token, difficulty);
      case 'reaction-test':
        return this.createReactionTestChallenge(token, difficulty);
      case 'quick-math':
        return this.createQuickMathChallenge(token, difficulty);
      case 'color-match':
        return this.createColorMatchChallenge(token, difficulty);
      case 'odd-one-out':
        return this.createOddOneOutChallenge(token, difficulty);
      case 'find-number':
        return this.createFindNumberChallenge(token, difficulty);
      case 'tap-in-order':
        return this.createTapInOrderChallenge(token, difficulty);
      case 'pattern-completion':
        return this.createPatternCompletionChallenge(token, difficulty);
      case 'count-shapes':
      default:
        return this.createCountShapesChallenge(token, difficulty);
    }
  }

  /**
   * 1. Number Sequence
   */
  private static createNumberSequenceChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    let step = Math.floor(Math.random() * 4) + 2; // 2..5
    let length = 5;
    if (difficulty === 'medium') {
      step = Math.floor(Math.random() * 6) + 4; // 4..9
    } else if (difficulty === 'hard') {
      step = Math.floor(Math.random() * 8) + 7; // 7..14
      length = 6;
    }

    const start = Math.floor(Math.random() * 15) + 1;
    const blankIndex = Math.floor(Math.random() * (length - 2)) + 1; // Not the very first or last

    const sequence: (number | string)[] = [];
    let correctAnswer = 0;

    for (let i = 0; i < length; i++) {
      const val = start + i * step;
      if (i === blankIndex) {
        sequence.push('?');
        correctAnswer = val;
      } else {
        sequence.push(val);
      }
    }

    const distractors = new Set<number>();
    const offsets = [-step, step, 1, -1, step + 2, -2, step * 2];
    for (const offset of offsets) {
      const dist = correctAnswer + offset;
      if (dist > 0 && dist !== correctAnswer) {
        distractors.add(dist);
      }
      if (distractors.size === 3) break;
    }

    const options = [correctAnswer, ...Array.from(distractors)].sort(
      () => Math.random() - 0.5
    );

    return {
      challenge: {
        id: 'number-sequence',
        name: 'Sequence Decryption',
        instruction: 'Find the missing number in the security sequence before time expires.',
        data: {
          sequence,
          options,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload) return false;
        const ans = payload.selected !== undefined ? payload.selected : payload.answer;
        return Number(ans) === correctAnswer;
      }
    };
  }

  /**
   * 2. Memory Grid
   */
  private static createMemoryGridChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    const gridSize = 3;
    const totalTiles = gridSize * gridSize;
    let patternLength = 3;
    let previewDurationMs = 2500;

    if (difficulty === 'medium') {
      patternLength = 4;
      previewDurationMs = 2200;
    } else if (difficulty === 'hard') {
      patternLength = 5;
      previewDurationMs = 2000;
    }

    const available = Array.from({ length: totalTiles }, (_, i) => i);
    const pattern: number[] = [];

    for (let i = 0; i < patternLength; i++) {
      const idx = Math.floor(Math.random() * available.length);
      pattern.push(available[idx]);
      available.splice(idx, 1);
    }

    return {
      challenge: {
        id: 'memory-grid',
        name: 'Safe Tile Memory',
        instruction: 'Memorize the flashing security tiles and repeat the exact sequence.',
        data: {
          pattern,
          sequence: pattern, // Provide both for backward & forward client compatibility
          gridSize: 3,
          previewDurationMs,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload || !Array.isArray(payload.sequence)) return false;
        if (payload.sequence.length !== pattern.length) return false;
        return payload.sequence.every((val: number, i: number) => val === pattern[i]);
      }
    };
  }

  /**
   * 3. Reaction Test
   */
  private static createReactionTestChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    const delayMs = Math.floor(Math.random() * 2000) + 1800; // 1.8s to 3.8s
    let maxReactionTimeMs = 1200;

    if (difficulty === 'medium') {
      maxReactionTimeMs = 950;
    } else if (difficulty === 'hard') {
      maxReactionTimeMs = 800;
    }

    return {
      challenge: {
        id: 'reaction-test',
        name: 'Reflex Override',
        instruction: 'Wait for clearance scanner... Tap IMMEDIATELY when the light turns green!',
        data: {
          delayMs,
          triggerDelayMs: delayMs, // Provide both aliases
          maxReactionTimeMs,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload) return false;
        if (payload.tappedEarly) return false;
        const time = Number(payload.reactionTimeMs);
        return time > 40 && time <= maxReactionTimeMs;
      }
    };
  }

  /**
   * 4. Quick Math
   */
  private static createQuickMathChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    let equation = '';
    let correctAnswer = 0;

    if (difficulty === 'easy') {
      const isAdd = Math.random() > 0.5;
      const a = Math.floor(Math.random() * 18) + 3;
      const b = Math.floor(Math.random() * 15) + 2;
      if (isAdd) {
        equation = `${a} + ${b}`;
        correctAnswer = a + b;
      } else {
        const higher = Math.max(a, b);
        const lower = Math.min(a, b);
        equation = `${higher} - ${lower}`;
        correctAnswer = higher - lower;
      }
    } else if (difficulty === 'medium') {
      const opType = Math.floor(Math.random() * 3);
      if (opType === 0) {
        // Multiplication
        const a = Math.floor(Math.random() * 9) + 3;
        const b = Math.floor(Math.random() * 9) + 2;
        equation = `${a} × ${b}`;
        correctAnswer = a * b;
      } else if (opType === 1) {
        // 3-term addition/subtraction
        const a = Math.floor(Math.random() * 20) + 10;
        const b = Math.floor(Math.random() * 15) + 5;
        const c = Math.floor(Math.random() * 8) + 2;
        equation = `${a} + ${b} - ${c}`;
        correctAnswer = a + b - c;
      } else {
        // Higher subtraction
        const a = Math.floor(Math.random() * 50) + 30;
        const b = Math.floor(Math.random() * 25) + 5;
        equation = `${a} - ${b}`;
        correctAnswer = a - b;
      }
    } else {
      // Hard: 2-step mixed
      const a = Math.floor(Math.random() * 8) + 3;
      const b = Math.floor(Math.random() * 7) + 3;
      const c = Math.floor(Math.random() * 15) + 5;
      const isAdd = Math.random() > 0.5;
      if (isAdd) {
        equation = `(${a} × ${b}) + ${c}`;
        correctAnswer = a * b + c;
      } else {
        equation = `(${a} × ${b}) - ${c}`;
        correctAnswer = a * b - c;
      }
    }

    // Generate 3 plausible distractors
    const distractors = new Set<number>();
    const offsets = [1, -1, 10, -10, 2, -2, 5, -5];
    for (const offset of offsets) {
      const val = correctAnswer + offset;
      if (val !== correctAnswer && val >= 0) {
        distractors.add(val);
      }
      if (distractors.size === 3) break;
    }

    // Fallback if not enough distractors
    let fallbackOffset = 3;
    while (distractors.size < 3) {
      distractors.add(correctAnswer + fallbackOffset);
      fallbackOffset += 2;
    }

    const options = [correctAnswer, ...Array.from(distractors)].sort(
      () => Math.random() - 0.5
    );

    return {
      challenge: {
        id: 'quick-math',
        name: 'Power Generator Decryption',
        instruction: 'Solve the security equation to stabilize power flow.',
        data: {
          equation: `${equation} = ?`,
          options,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload) return false;
        const ans = payload.answer !== undefined ? payload.answer : payload.selected;
        return Number(ans) === correctAnswer;
      }
    };
  }

  /**
   * 5. Color Match (Stroop Effect)
   */
  private static createColorMatchChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    const COLORS = [
      { name: 'Red', hex: '#ef4444' },
      { name: 'Blue', hex: '#3b82f6' },
      { name: 'Green', hex: '#10b981' },
      { name: 'Yellow', hex: '#eab308' },
      { name: 'Purple', hex: '#a855f7' }
    ];

    const pool = difficulty === 'easy' ? COLORS.slice(0, 3) : COLORS.slice(0, 4);

    // Pick a word and a different ink color
    const wordItem = pool[Math.floor(Math.random() * pool.length)];
    let inkItem = pool[Math.floor(Math.random() * pool.length)];
    while (inkItem.name === wordItem.name) {
      inkItem = pool[Math.floor(Math.random() * pool.length)];
    }

    // On easy/medium: Always match ink color (classic Stroop)
    // On hard: 50% match word, 50% match ink
    let targetType: 'ink' | 'word' = 'ink';
    if (difficulty === 'hard' && Math.random() > 0.5) {
      targetType = 'word';
    }

    const expectedColorName = targetType === 'ink' ? inkItem.name : wordItem.name;

    const options = pool.map((c) => ({
      name: c.name,
      hex: c.hex
    }));

    const instruction =
      targetType === 'ink'
        ? 'Tap the INK COLOR of the text below (ignore what the word says)!'
        : 'Tap the COLOR WORD written below (ignore the ink color)!';

    return {
      challenge: {
        id: 'color-match',
        name: 'Optical Neural Check',
        instruction,
        data: {
          word: wordItem.name.toUpperCase(),
          inkHex: inkItem.hex,
          targetType,
          options,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload) return false;
        const chosen = payload.selectedColor || payload.answer || payload.selected;
        return (
          typeof chosen === 'string' &&
          chosen.toLowerCase() === expectedColorName.toLowerCase()
        );
      }
    };
  }

  /**
   * 6. Odd One Out
   */
  private static createOddOneOutChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    const SHAPE_PAIRS = [
      { normal: '🛡️', odd: '🗡️' },
      { normal: '🔒', odd: '🔓' },
      { normal: '🟢', odd: '🔴' },
      { normal: '🔷', odd: '🔶' },
      { normal: '⭐', odd: '🌟' },
      { normal: '👁️', odd: '🕶️' }
    ];

    const pair = SHAPE_PAIRS[Math.floor(Math.random() * SHAPE_PAIRS.length)];
    let tileCount = 9; // 3x3
    if (difficulty === 'medium') tileCount = 12; // 4x3
    if (difficulty === 'hard') tileCount = 16; // 4x4

    const oddIndex = Math.floor(Math.random() * tileCount);
    const tiles: string[] = [];
    for (let i = 0; i < tileCount; i++) {
      tiles.push(i === oddIndex ? pair.odd : pair.normal);
    }

    return {
      challenge: {
        id: 'odd-one-out',
        name: 'Anomaly Detection',
        instruction: 'Locate and tap the anomalous security tile before detection occurs.',
        data: {
          tiles,
          tileCount,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload) return false;
        const idx = payload.selectedIndex ?? payload.index ?? payload.answer;
        return Number(idx) === oddIndex;
      }
    };
  }

  /**
   * 7. Find Number
   */
  private static createFindNumberChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    let count = 9; // 3x3
    let maxRange = 30;
    if (difficulty === 'medium') {
      count = 16; // 4x4
      maxRange = 60;
    } else if (difficulty === 'hard') {
      count = 20; // 5x4
      maxRange = 99;
    }

    const numberSet = new Set<number>();
    while (numberSet.size < count) {
      numberSet.add(Math.floor(Math.random() * maxRange) + 1);
    }

    const grid = Array.from(numberSet).sort(() => Math.random() - 0.5);
    const targetNumber = grid[Math.floor(Math.random() * grid.length)];

    return {
      challenge: {
        id: 'find-number',
        name: 'Frequency Signal Scan',
        instruction: `Find and tap target signal frequency #${targetNumber} in the matrix!`,
        data: {
          targetNumber,
          grid,
          count,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload) return false;
        const num = payload.foundNumber ?? payload.answer ?? payload.selected;
        return Number(num) === targetNumber;
      }
    };
  }

  /**
   * 8. Tap In Order
   */
  private static createTapInOrderChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    let length = 4;
    if (difficulty === 'medium') length = 5;
    if (difficulty === 'hard') length = 6;

    const numSet = new Set<number>();
    while (numSet.size < length) {
      numSet.add(Math.floor(Math.random() * 80) + 1);
    }

    const sorted = Array.from(numSet).sort((a, b) => a - b);
    const numbers = Array.from(numSet).sort(() => Math.random() - 0.5);

    return {
      challenge: {
        id: 'tap-in-order',
        name: 'Circuit Reconnection',
        instruction: 'Tap all security nodes in ASCENDING order (lowest to highest)!',
        data: {
          numbers,
          count: length,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload || !Array.isArray(payload.sequence)) return false;
        if (payload.sequence.length !== sorted.length) return false;
        return payload.sequence.every(
          (val: number, i: number) => Number(val) === sorted[i]
        );
      }
    };
  }

  /**
   * 9. Pattern Completion
   */
  private static createPatternCompletionChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    const SYMBOLS = ['🔴', '🔷', '⚡', '🛡️', '🔑', '💎', '🌙', '⭐'];

    let sequence: string[] = [];
    let correctAnswer = '';
    let pool: string[] = [];

    if (difficulty === 'easy') {
      // ABAB pattern (e.g. A, B, A, B, A, ?) -> B
      const a = SYMBOLS[0];
      const b = SYMBOLS[1];
      sequence = [a, b, a, b, a, '?'];
      correctAnswer = b;
      pool = [a, b, SYMBOLS[2], SYMBOLS[3]];
    } else if (difficulty === 'medium') {
      // ABCABC pattern (e.g. A, B, C, A, B, ?) -> C
      const a = SYMBOLS[2];
      const b = SYMBOLS[3];
      const c = SYMBOLS[4];
      sequence = [a, b, c, a, b, '?'];
      correctAnswer = c;
      pool = [a, b, c, SYMBOLS[5]];
    } else {
      // AABBAABB pattern (e.g. A, A, B, B, A, ?) -> A
      const a = SYMBOLS[5];
      const b = SYMBOLS[6];
      sequence = [a, a, b, b, a, '?'];
      correctAnswer = a;
      pool = [a, b, SYMBOLS[0], SYMBOLS[7]];
    }

    const options = Array.from(new Set([correctAnswer, ...pool])).sort(
      () => Math.random() - 0.5
    );

    return {
      challenge: {
        id: 'pattern-completion',
        name: 'Encrypted Cipher Pattern',
        instruction: 'Deduce the missing symbol in the classified cipher stream.',
        data: {
          sequence,
          options,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload) return false;
        const ans = payload.answer || payload.selected;
        return ans === correctAnswer;
      }
    };
  }

  /**
   * 10. Count Shapes
   */
  private static createCountShapesChallenge(
    token: string,
    difficulty: Difficulty = 'easy'
  ): GeneratedChallenge {
    const SHAPES = ['⭐', '🔷', '🔴', '🔺', '💎'];

    const targetSymbol = SHAPES[0];
    const otherSymbols = SHAPES.slice(1);

    let targetCount = Math.floor(Math.random() * 3) + 3; // 3..5
    let otherCount = Math.floor(Math.random() * 3) + 4; // 4..6

    if (difficulty === 'medium') {
      targetCount = Math.floor(Math.random() * 3) + 5; // 5..7
      otherCount = Math.floor(Math.random() * 4) + 6; // 6..9
    } else if (difficulty === 'hard') {
      targetCount = Math.floor(Math.random() * 4) + 6; // 6..9
      otherCount = Math.floor(Math.random() * 5) + 8; // 8..12
    }

    const shapesList: string[] = [];
    for (let i = 0; i < targetCount; i++) {
      shapesList.push(targetSymbol);
    }
    for (let i = 0; i < otherCount; i++) {
      shapesList.push(otherSymbols[i % otherSymbols.length]);
    }

    // Shuffle shapes
    const shapes = shapesList.sort(() => Math.random() - 0.5);

    // Distractors
    const distractors = new Set<number>();
    const offsets = [1, -1, 2, -2, 3, -3];
    for (const off of offsets) {
      const val = targetCount + off;
      if (val > 0 && val !== targetCount) {
        distractors.add(val);
      }
      if (distractors.size === 3) break;
    }

    const options = [targetCount, ...Array.from(distractors)].sort(
      () => Math.random() - 0.5
    );

    return {
      challenge: {
        id: 'count-shapes',
        name: 'Perimeter Threat Census',
        instruction: `Count how many times ${targetSymbol} appears in the perimeter sector!`,
        data: {
          shapes,
          targetSymbol,
          options,
          difficulty
        },
        token
      },
      validator: (payload: any) => {
        if (!payload) return false;
        const ans = payload.count ?? payload.answer ?? payload.selected;
        return Number(ans) === targetCount;
      }
    };
  }
}

