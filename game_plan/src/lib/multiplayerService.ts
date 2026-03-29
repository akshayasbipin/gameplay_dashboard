import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a guest session (temporary player without auth)
 * Guests are stored in localStorage, not in database
 */
export const createGuestSession = async (guestName: string) => {
  const sessionToken = uuidv4();
  
  // Return guest session object without database insert
  // Guests are temporary session-based players stored in localStorage
  return {
    id: sessionToken,
    session_token: sessionToken,
    guest_name: guestName,
    created_at: new Date().toISOString(),
  };
};

/**
 * Get guest session details
 */
export const getGuestSession = async (sessionToken: string) => {
  const { data, error } = await supabase
    .from('guest_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create a new game room
 */
export const createGameRoom = async (
  hostId: string | null,
  hostName: string,
  isHostGuest: boolean,
  gameType: string = 'snakes_and_ladders'
) => {
  // Generate unique room code (6 characters)
  const roomCode = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      room_code: roomCode,
      game_type: gameType,
      host_id: hostId,
      host_name: hostName,
      is_host_guest: isHostGuest,
      current_players: 1,
    })
    .select();

  if (error) throw error;
  
  const room = data?.[0];
  
  // Add host to room_players table
  if (room) {
    const hostColors = ['#FF4757', '#2196F3', '#2ed573', '#ffa502', '#a55eea', '#ff6b81'];
    const hostEmoji = ['🔴', '🔵', '🟢', '🟡', '🟣', '🩷'];
    
    // Use a unique player ID for host (use hostId if provided, otherwise use guest ID)
    const uniqueHostId = hostId || `guest-${uuidv4()}`;
    
    const { error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: uniqueHostId,
        player_name: hostName,
        color: hostColors[0],
        emoji: hostEmoji[0],
        is_guest: isHostGuest,
      })
      .select();
    
    if (playerError) {
      console.error('Error adding host to room players:', playerError);
      // Don't throw - room was created, just player wasn't added
    }
  }
  
  return room;
};

/**
 * Get game room by room code
 */
export const getGameRoom = async (roomCode: string) => {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Add player to game room (with duplicate prevention)
 */
export const addPlayerToRoom = async (
  roomId: string,
  playerId: string | null,
  playerName: string,
  color: string,
  emoji: string,
  isGuest: boolean
) => {
  // Check if player already exists in this room
  const { data: existingPlayers, error: checkError } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', roomId)
    .eq('player_id', playerId || '')
    .limit(1);

  if (!checkError && existingPlayers && existingPlayers.length > 0) {
    // Player already in room, just return existing record
    return existingPlayers[0];
  }

  const { data, error } = await supabase
    .from('room_players')
    .insert({
      room_id: roomId,
      player_id: playerId,
      player_name: playerName,
      color,
      emoji,
      is_guest: isGuest,
    })
    .select();

  if (error) throw error;

  // Update room player count
  const { data: currentRoom } = await supabase
    .from('game_rooms')
    .select('current_players')
    .eq('id', roomId)
    .single();

  if (currentRoom) {
    await supabase
      .from('game_rooms')
      .update({ current_players: (currentRoom.current_players || 0) + 1 })
      .eq('id', roomId);
  }

  return data?.[0];
};

/**
 * Get all players in a room
 */
export const getRoomPlayers = async (roomId: string) => {
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get game state for a room
 */
export const getGameState = async (roomId: string) => {
  const { data, error } = await supabase
    .from('multiplayer_game_state')
    .select('*')
    .eq('room_id', roomId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data;
};

/**
 * Initialize game state for a room
 */
export const initializeGameState = async (roomId: string, initialState: any) => {
  const { data, error } = await supabase
    .from('multiplayer_game_state')
    .insert({
      room_id: roomId,
      game_data: initialState,
    })
    .select();

  if (error && !error.message.includes('duplicate key')) {
    throw error;
  }
  return data?.[0];
};

/**
 * Update game state
 */
export const updateGameState = async (
  roomId: string,
  currentTurnPlayer: string,
  diceValue: number,
  gameData: any
) => {
  const { data, error } = await supabase
    .from('multiplayer_game_state')
    .update({
      current_turn_player_name: currentTurnPlayer,
      dice_value: diceValue,
      game_data: gameData,
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', roomId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Update player position in room
 */
export const updatePlayerPosition = async (
  roomPlayerId: string,
  position: number
) => {
  const { data, error } = await supabase
    .from('room_players')
    .update({ position })
    .eq('id', roomPlayerId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Update room status
 */
export const updateRoomStatus = async (
  roomId: string,
  status: 'waiting' | 'playing' | 'finished'
) => {
  const { data, error } = await supabase
    .from('game_rooms')
    .update({ status })
    .eq('id', roomId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Subscribe to room changes (real-time)
 */
export const subscribeToRoom = (
  roomId: string,
  callback: (payload: any) => void
) => {
  const channelName = `room:${roomId}:${Date.now()}`; // Add timestamp to ensure unique channels
  
  const subscription = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        console.log('🎮 New player inserted:', payload);
        callback(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        console.log('🎮 Player updated:', payload);
        callback(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'multiplayer_game_state',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        console.log('🎮 Game state changed:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ Subscription error on channel');
      } else if (status === 'SUBSCRIBED') {
        console.log('✅ Subscription established for room:', roomId);
      }
    });

  return subscription;
};

/**
 * Record a player move in multiplayer game
 */
export const recordPlayerMove = async (
  roomId: string,
  currentPlayerId: string,
  _currentPlayerName: string,
  diceValue: number,
  newPosition: number,
  event: string,
  playersState: any[]
) => {
  // Find which player is next
  const currentPlayerIndex = playersState.findIndex(p => p.id === currentPlayerId);
  let nextPlayerIndex = (currentPlayerIndex + 1) % playersState.length;
  
  // Skip finished players
  let tries = 0;
  while (playersState[nextPlayerIndex].finished && tries < playersState.length) {
    nextPlayerIndex = (nextPlayerIndex + 1) % playersState.length;
    tries++;
  }

  const gameData = {
    players: playersState.map((p, idx) => ({
      id: p.id,
      name: p.name,
      position: idx === currentPlayerIndex ? newPosition : p.position,
      color: p.color,
      emoji: p.emoji,
      isBot: p.isBot,
      finished: idx === currentPlayerIndex ? p.finished : p.finished,
    })),
    currentPlayerIndex: nextPlayerIndex,
    lastEvent: event,
    lastMoveTimestamp: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('multiplayer_game_state')
    .update({
      current_turn_player_name: playersState[nextPlayerIndex].name,
      dice_value: diceValue,
      game_data: gameData,
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', roomId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Get current game state for a room
 */
export const getGameStateForRoom = async (roomId: string) => {
  const { data, error } = await supabase
    .from('multiplayer_game_state')
    .select('*')
    .eq('room_id', roomId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data;
};

/**
 * Update winner in multiplayer game
 */
export const recordGameWinner = async (
  roomId: string,
  winnerId: string,
  winnerName: string,
  playersState: any[]
) => {
  const { data, error } = await supabase
    .from('multiplayer_game_state')
    .update({
      current_turn_player_name: winnerName,
      game_data: {
        players: playersState,
        winner: { id: winnerId, name: winnerName },
        gameFinished: true,
        finishedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', roomId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Subscribe to game moves (multiplayer gameplay)
 */
export const subscribeToGameMoves = (
  roomId: string,
  callback: (gameState: any) => void
) => {
  const subscription = supabase
    .channel(`game-moves-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'multiplayer_game_state',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        console.log('🎲 Game move received:', payload);
        callback(payload.new);
      }
    )
    .subscribe(
      (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to game moves for room:', roomId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to game moves');
        }
      }
    );

  return subscription;
};
