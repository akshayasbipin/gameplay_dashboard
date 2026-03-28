// Utility functions and constants for Words Are Hard game

// Emoji list covering various categories for broader gameplay
export const EMOJIS = [
  '🍎', '🍌', '🍒', '🍊', '🍋', '🍌', '🍉', '🍓', '🫐', '🍇',
  '🥕', '🥒', '🌽', '🥬', '🥦', '🧅', '🧄', '🥔', '🍠', '🥐',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
  '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
  '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗',
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '⭐',
  '🌙', '☀️', '⛅', '🌤', '🌥', '☁️', '🌦', '🌧', '⛈', '🌩',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐',
  '✈️', '🚀', '🛸', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇',
  '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏧', '🏨', '🏩',
  '🎵', '🎶', '🎤', '🎧', '🎼', '🎹', '🎸', '🥁', '🎷', '🎺',
  '⚡', '🔥', '💧', '🌊', '⛄', '🌈', '☔', '⛱', '🧊', '🎃',
];

export interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
  emoji: string;
}

export interface GameState {
  phase: 'setup' | 'playing' | 'finished';
  players: Player[];
  currentEmoji: string;
  timeLeft: number;
  isRunning: boolean;
  winner: Player | null;
}

export const PLAYER_CONFIGS = [
  { color: '#FF4757', emoji: '🔴', label: 'Player 1' },
  { color: '#2196F3', emoji: '🔵', label: 'Player 2' },
  { color: '#2ed573', emoji: '🟢', label: 'Player 3' },
  { color: '#ffa502', emoji: '🟡', label: 'Player 4' },
];

export const GAME_DURATION = 30; // seconds

/**
 * Get a random emoji from the available emoji list
 */
export function getRandomEmoji(previousEmoji?: string): string {
  let newEmoji: string;
  do {
    newEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  } while (newEmoji === previousEmoji && EMOJIS.length > 1);
  return newEmoji;
}

/**
 * Initialize players for the game
 */
export function initializePlayers(numPlayers: number): Player[] {
  return Array.from({ length: numPlayers }, (_, index) => ({
    id: `player-${index + 1}`,
    name: PLAYER_CONFIGS[index].label,
    score: 0,
    color: PLAYER_CONFIGS[index].color,
    emoji: PLAYER_CONFIGS[index].emoji,
  }));
}

/**
 * Format time display (MM:SS)
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get the player with the highest score
 */
export function getWinner(players: Player[]): Player | null {
  if (players.length === 0) return null;
  return players.reduce((max, player) =>
    player.score > max.score ? player : max
  );
}
