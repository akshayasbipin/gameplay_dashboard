import { supabase } from './supabase';

/**
 * ─────────────────────────────────────────────────────────────────────
 * "Guess My Code" — service layer
 *
 * Reuses the existing multiplayer tables — no new tables required:
 *   - game_rooms             (room_code, status, max_players, ...)
 *   - room_players           (who's in the room)
 *   - multiplayer_game_state (jsonb "game_data" column holds everything
 *                              this game needs: codes, guesses, timer)
 *
 * game_data shape while this game is running:
 * {
 *   phase: 'enter-code' | 'guessing' | 'finished',
 *   codes: { [playerId]: string },            // 4-digit strings
 *   guesses: { [playerId]: GuessEntry[] },     // guesses THAT player made
 *   timerStartedAt: string | null,             // ISO — set once both codes are in
 *   durationMs: number,                        // 90000
 *   winnerId: string | null,
 *   winnerName: string | null,
 *   revealedAt: string | null,
 * }
 * ─────────────────────────────────────────────────────────────────────
 */

export interface GuessEntry {
  guess: string;
  bulls: number; // correct digit, correct position
  cows: number;  // correct digit, wrong position
  at: string;
}

export interface CodeGameData {
  phase: 'enter-code' | 'guessing' | 'finished';
  codes: Record<string, string>;
  guesses: Record<string, GuessEntry[]>;
  timerStartedAt: string | null;
  durationMs: number;
  winnerId: string | null;
  winnerName: string | null;
  revealedAt: string | null;
}

export const GUESS_CODE_GAME_TYPE = 'guess_my_code';
export const ROUND_DURATION_MS = 90 * 1000; // 1 min 30 sec

export const emptyGameData = (): CodeGameData => ({
  phase: 'enter-code',
  codes: {},
  guesses: {},
  timerStartedAt: null,
  durationMs: ROUND_DURATION_MS,
  winnerId: null,
  winnerName: null,
  revealedAt: null,
});

/** 4 digits, no leading zero (so it's never read as a <4-digit number) */
export const CODE_PATTERN = /^[1-9]\d{3}$/;

export const isValidCode = (code: string) => CODE_PATTERN.test(code);

/**
 * Create a room for this game specifically (max 2 players).
 * Mirrors createGameRoom() in multiplayerService, but pins max_players to 2
 * so a third person can never join a 1-v-1 code-guessing match.
 */
export const createCodeGameRoom = async (
  hostPlayerId: string, // always set — used for both host_id (FK-ish) and room_players.player_id
  hostName: string,
  isHostGuest: boolean
) => {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      room_code: roomCode,
      game_type: GUESS_CODE_GAME_TYPE,
      host_id: hostPlayerId,
      host_name: hostName,
      is_host_guest: isHostGuest,
      current_players: 1,
      max_players: 2,
    })
    .select();

  if (error) throw error;
  const room = data?.[0];
  if (!room) return null;

  const { error: playerError } = await supabase.from('room_players').insert({
    room_id: room.id,
    player_id: hostPlayerId,
    player_name: hostName,
    color: '#FF4757',
    emoji: '🔴',
    is_guest: isHostGuest,
  });
  if (playerError) console.error('Error adding host to room players:', playerError);

  const { error: stateError } = await supabase.from('multiplayer_game_state').insert({
    room_id: room.id,
    game_data: emptyGameData(),
    updated_at: new Date().toISOString(),
  });
  if (stateError) console.error('Error initializing game state:', stateError);

  return room;
};

/**
 * Read-modify-write helper against multiplayer_game_state.game_data.
 * Good enough for a casual 1-v-1 game; not meant to survive true
 * simultaneous writes from both players in the same instant.
 */
const mutateGameData = async (
  roomId: string,
  updater: (current: CodeGameData) => CodeGameData
) => {
  const { data: row, error: fetchError } = await supabase
    .from('multiplayer_game_state')
    .select('*')
    .eq('room_id', roomId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const current: CodeGameData = (row?.game_data as CodeGameData) || emptyGameData();
  const next = updater(current);

  const { data, error } = await supabase
    .from('multiplayer_game_state')
    .update({
      game_data: next,
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', roomId)
    .select();

  if (error) throw error;
  return (data?.[0]?.game_data as CodeGameData) || next;
};

/** Bulls & cows scoring for a guess against a secret code */
export const evaluateGuess = (guess: string, secret: string) => {
  const g = guess.split('');
  const s = secret.split('');
  let bulls = 0;
  let cows = 0;
  const usedSecret = [false, false, false, false];
  const usedGuess = [false, false, false, false];

  for (let i = 0; i < 4; i++) {
    if (g[i] === s[i]) {
      bulls++;
      usedSecret[i] = true;
      usedGuess[i] = true;
    }
  }
  for (let i = 0; i < 4; i++) {
    if (usedGuess[i]) continue;
    const idx = s.findIndex((d, j) => d === g[i] && !usedSecret[j]);
    if (idx !== -1) {
      cows++;
      usedSecret[idx] = true;
    }
  }
  return { bulls, cows };
};

/**
 * Submit a player's own secret 4-digit code.
 * Once both players have submitted, the shared timer starts and the
 * phase flips to 'guessing'.
 */
export const submitSecretCode = async (roomId: string, playerId: string, code: string) => {
  if (!isValidCode(code)) throw new Error('Code must be exactly 4 digits and not start with 0.');

  return mutateGameData(roomId, (current) => {
    const codes = { ...current.codes, [playerId]: code };
    const bothIn = Object.keys(codes).length >= 2;

    return {
      ...current,
      codes,
      phase: bothIn ? 'guessing' : current.phase,
      timerStartedAt: bothIn && !current.timerStartedAt ? new Date().toISOString() : current.timerStartedAt,
    };
  });
};

/**
 * Submit a guess at the opponent's code. If it's an exact match, the game
 * ends immediately with this player as the winner.
 */
export const submitGuess = async (
  roomId: string,
  playerId: string,
  opponentId: string,
  playerName: string,
  guess: string
) => {
  if (!isValidCode(guess)) throw new Error('Guess must be exactly 4 digits and not start with 0.');

  return mutateGameData(roomId, (current) => {
    const secret = current.codes[opponentId];
    if (!secret) return current; // opponent hasn't submitted yet, ignore

    const { bulls, cows } = evaluateGuess(guess, secret);
    const entry: GuessEntry = { guess, bulls, cows, at: new Date().toISOString() };
    const guesses = {
      ...current.guesses,
      [playerId]: [...(current.guesses[playerId] || []), entry],
    };

    const won = bulls === 4;

    return {
      ...current,
      guesses,
      phase: won ? 'finished' : current.phase,
      winnerId: won ? playerId : current.winnerId,
      winnerName: won ? playerName : current.winnerName,
      revealedAt: won ? new Date().toISOString() : current.revealedAt,
    };
  });
};

/**
 * Called by either client when the shared 90-second timer runs out.
 * No-ops if the round already ended (someone guessed correctly first).
 */
export const finalizeRoundOnTimeout = async (roomId: string) => {
  return mutateGameData(roomId, (current) => {
    if (current.phase === 'finished') return current;
    return {
      ...current,
      phase: 'finished',
      revealedAt: current.revealedAt || new Date().toISOString(),
    };
  });
};
