// Game Constants and Utilities for Snakes and Ladders

export const BOARD_SIZE = 100;
export const COLS = 10;
export const ROWS = 10;
export const CELL_SIZE = 50;

// Classic Snakes and Ladders board configuration
// Key: starting position, Value: ending position
export const SNAKES_AND_LADDERS: Record<number, number> = {
  // Snakes (position > target)
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 18,
  87: 24,
  93: 73,
  95: 75,
  98: 79,
  
  // Ladders (position < target)
  2: 38,
  7: 14,
  15: 26,
  21: 42,
  28: 84,
  51: 67,
  72: 91,
  78: 98,
  86: 99,
};

export const PLAYER_COLORS = [
  '#FF6B6B',  // Red
  '#4ECDC4',  // Teal
  '#45B7D1',  // Blue
  '#FFA07A',  // Light Salmon
  '#98D8C8',  // Mint
  '#F7DC6F',  // Yellow
];

/**
 * Get the grid position for a board position (0-100)
 * Accounts for zigzag pattern of snakes and ladders board
 */
export function getGridPos(position: number) {
  if (position === 0) return { x: 0, y: 0 };

  const adjustedPos = position - 1;
  const row = Math.floor(adjustedPos / COLS);
  let col = adjustedPos % COLS;

  // Zigzag pattern: odd rows go right-to-left
  if (row % 2 === 1) {
    col = COLS - 1 - col;
  }

  const x = col * CELL_SIZE;
  const y = (ROWS - 1 - row) * CELL_SIZE;

  return { x, y };
}

/**
 * Check if a position has a snake or ladder
 */
export function checkSnakeOrLadder(position: number): number | null {
  return SNAKES_AND_LADDERS[position] ?? null;
}

/**
 * Roll a dice (1-6)
 */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Calculate new position after moving
 * Returns the final position after considering snakes/ladders
 */
export function calculateNewPosition(
  currentPosition: number,
  diceRoll: number
): { position: number; hasSnakeOrLadder: boolean } {
  let newPosition = currentPosition + diceRoll;

  // Can't exceed board
  if (newPosition > BOARD_SIZE) {
    return { position: currentPosition, hasSnakeOrLadder: false };
  }

  // Check for snake or ladder
  const snakeOrLadderEnd = SNAKES_AND_LADDERS[newPosition];
  if (snakeOrLadderEnd) {
    return {
      position: snakeOrLadderEnd,
      hasSnakeOrLadder: true,
    };
  }

  return { position: newPosition, hasSnakeOrLadder: false };
}

/**
 * Generate a match/game ID
 */
export function generateMatchId(): string {
  return Math.random().toString(36).substring(2, 11).toUpperCase();
}

/**
 * Position type for player pieces
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Get CSS position style for a piece
 */
export function getPieceStyle(position: number) {
  const { x, y } = getGridPos(position);
  return {
    left: `${x}px`,
    top: `${y}px`,
  };
}
