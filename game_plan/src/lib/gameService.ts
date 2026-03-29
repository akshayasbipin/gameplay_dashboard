import { supabase } from '../lib/supabase';

// Game progress tracking
export const saveGameProgress = async (
  playerId: string,
  gameType: string,
  currentPosition: number,
  boardState: any,
  isCompleted: boolean,
  score: number
) => {
  const { data, error } = await supabase.from('game_sessions').insert({
    player_id: playerId,
    game_type: gameType,
    current_position: currentPosition,
    board_state: boardState,
    is_completed: isCompleted,
    score,
  });

  if (error) throw error;
  return data;
};

// Update existing game session
export const updateGameProgress = async (
  sessionId: string,
  currentPosition: number,
  boardState: any,
  isCompleted: boolean,
  score: number
) => {
  const { data, error } = await supabase
    .from('game_sessions')
    .update({
      current_position: currentPosition,
      board_state: boardState,
      is_completed: isCompleted,
      score,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw error;
  return data;
};

// Get player's game history
export const getPlayerGameHistory = async (playerId: string, gameType?: string) => {
  let query = supabase
    .from('game_sessions')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (gameType) {
    query = query.eq('game_type', gameType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Get leaderboard for a game
export const getGameLeaderboard = async (gameType: string, limit: number = 10) => {
  const { data, error } = await supabase
    .from('leaderboards')
    .select(`
      *,
      players (username)
    `)
    .eq('game_type', gameType)
    .order('best_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

// Update leaderboard after game completion
export const updateLeaderboard = async (
  playerId: string,
  gameType: string,
  score: number,
  won: boolean
) => {
  // Get current leaderboard entry
  const { data: existingEntry, error: fetchError } = await supabase
    .from('leaderboards')
    .select('*')
    .eq('player_id', playerId)
    .eq('game_type', gameType)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingEntry) {
    // Update existing entry
    await supabase
      .from('leaderboards')
      .update({
        wins: won ? existingEntry.wins + 1 : existingEntry.wins,
        total_games: existingEntry.total_games + 1,
        best_score: Math.max(existingEntry.best_score, score),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingEntry.id);
  } else {
    // Create new entry
    await supabase.from('leaderboards').insert({
      player_id: playerId,
      game_type: gameType,
      wins: won ? 1 : 0,
      total_games: 1,
      best_score: score,
    });
  }
};
