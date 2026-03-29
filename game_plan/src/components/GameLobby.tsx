import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoomPlayers, subscribeToRoom, getGameRoom, addPlayerToRoom } from '../lib/multiplayerService';
import './GameLobby.css';

interface RoomPlayer {
  id: string;
  player_id: string | null;
  player_name: string;
  color: string;
  emoji: string;
  is_guest: boolean;
  joined_at: string;
}

interface GameLobbyProps {
  roomCode: string;
  roomId?: string;
  isHost: boolean;
  maxPlayers?: number;
  gameType?: string;
  onStartGame?: () => void;
  onBack?: () => void;
  onRoomIdReady?: (roomId: string) => void;
}

export default function GameLobby({
  roomCode,
  roomId: initialRoomId,
  isHost,
  maxPlayers = 6,
  gameType = 'snakes_and_ladders',
  onStartGame,
  onBack,
  onRoomIdReady,
}: GameLobbyProps) {
  const { currentPlayer } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(initialRoomId || null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasJoined, setHasJoined] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Utility function to reload and deduplicate players
  const reloadPlayers = useCallback(async (finalRoomId: string) => {
    try {
      const roomPlayers = await getRoomPlayers(finalRoomId);
      if (!roomPlayers) return;

      // Deduplicate by player_id (unique per player) instead of database id
      // This prevents duplicate display when same player record exists multiple times
      const uniquePlayers = Array.from(
        new Map(roomPlayers.map(p => [p.player_id || p.id, p])).values()
      );
      
      console.log('📋 Players loaded:', uniquePlayers.length, uniquePlayers);
      setPlayers(uniquePlayers);
    } catch (err) {
      console.error('Error reloading players:', err);
    }
  }, []);

  // Fetch room by code if joining, then join the room
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        let finalRoomId = roomId;

        // If roomId not provided, fetch it by roomCode
        if (!finalRoomId) {
          const room = await getGameRoom(roomCode);
          if (!room) {
            setError('Room not found! Invalid code.');
            setLoading(false);
            return;
          }
          finalRoomId = room.id;
          setRoomId(finalRoomId);
        }

        if (!finalRoomId) {
          setError('Unable to determine room ID');
          setLoading(false);
          return;
        }

        // 🔥 KEY FIX: Notify parent component that roomId is ready
        console.log('✅ ROOM ID AVAILABLE:', finalRoomId);
        if (onRoomIdReady) {
          onRoomIdReady(finalRoomId);
        }

        // Load initial players
        await reloadPlayers(finalRoomId);

        // For host: Just mark as joined (host already added during room creation)
        if (isHost) {
          setHasJoined(true);
          console.log('👑 Host initialization complete');
          setLoading(false);
          return;
        }

        // For joining player: Add themselves if not already in room
        if (currentPlayer && !hasJoined) {
          const currentPlayers = await getRoomPlayers(finalRoomId);
          const playerExists = currentPlayers?.some(p => p.player_id === currentPlayer.id);
          
          if (!playerExists) {
            const colors = ['#FF4757', '#2196F3', '#2ed573', '#ffa502', '#a55eea', '#ff6b81'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const emoji = ['🔴', '🔵', '🟢', '🟡', '🟣', '🩷'][Math.floor(Math.random() * 6)];
            
            await addPlayerToRoom(
              finalRoomId,
              currentPlayer.id,
              currentPlayer.name,
              color,
              emoji,
              currentPlayer.isGuest
            );
            
            // Reload after adding self
            await reloadPlayers(finalRoomId);
          }
          setHasJoined(true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Error initializing room: ' + (err instanceof Error ? err.message : 'Unknown error'));
        setLoading(false);
      }
    };

    initializeRoom();
  }, []);

  // Subscribe to real-time updates with debouncing + Polling fallback
  useEffect(() => {
    if (!roomId) return;

    let isSubscribed = true;
    
    // Debounced player reload to prevent too many rapid updates
    const debouncedReload = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        if (isSubscribed) {
          await reloadPlayers(roomId);
        }
      }, 300); // Wait 300ms after changes stop before reloading
    };

    // Set up real-time subscription
    try {
      const subscription = subscribeToRoom(roomId, () => {
        if (isSubscribed) {
          console.log('📡 Real-time update received');
          debouncedReload();
        }
      });
      
      subscriptionRef.current = subscription;
      console.log('✅ Subscribed to room updates');
    } catch (err) {
      console.error('❌ Subscription setup failed:', err);
    }

    // Add polling as a safety net - reload every 2 seconds for host
    // This ensures the host doesn't miss player updates
    if (isHost) {
      pollingIntervalRef.current = setInterval(() => {
        if (isSubscribed) {
          console.log('⏱️ Polling for updates (host)');
          reloadPlayers(roomId);
        }
      }, 2000); // Poll every 2 seconds
    } else {
      // For joining players, poll less frequently
      pollingIntervalRef.current = setInterval(() => {
        if (isSubscribed) {
          console.log('⏱️ Polling for updates (player)');
          reloadPlayers(roomId);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      isSubscribed = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [roomId, reloadPlayers]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareLink = `${window.location.origin}/join-game/${roomCode}`;

  const canStart = players.length >= 2 && isHost;

  if (error) {
    return (
      <div className="game-lobby-overlay">
        <div className="game-lobby-modal">
          <div className="lobby-header">
            <h1>Error</h1>
          </div>
          <div className="error-message">{error}</div>
          <div className="lobby-actions">
            <button onClick={onBack} className="cancel-btn">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-lobby-overlay">
      <div className="game-lobby-modal">
        {/* Header */}
        <div className="lobby-header">
          <h1>Game Lobby</h1>
          <button onClick={onBack} className="close-btn">✕</button>
        </div>

        {/* Room Code Section */}
        <div className="room-code-section">
          <p className="section-label">Share this code with friends:</p>
          <div className="room-code-box">
            <span className="room-code">{roomCode}</span>
            <button onClick={handleCopyCode} className="copy-btn">
              {copiedCode ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>
          <p className="share-hint">Or share this link: <br /> <small>{shareLink}</small></p>
        </div>

        {/* Players Section */}
        <div className="players-section">
          <div className="players-header">
            <h2>Players ({players.length}/{maxPlayers})</h2>
            {isHost && <span className="host-badge">HOST</span>}
          </div>

          {loading ? (
            <div className="loading">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="no-players">Waiting for players to join...</div>
          ) : (
            <div className="players-list">
              {players.map((player, idx) => (
                <div key={player.id} className="player-item">
                  <div className="player-avatar">
                    <span className="player-emoji">{player.emoji}</span>
                  </div>
                  <div className="player-info">
                    <span className="player-name">{player.player_name}</span>
                    {idx === 0 && <span className="host-label">HOST</span>}
                    {player.is_guest && <span className="guest-label">GUEST</span>}
                  </div>
                  <div className="player-status">Ready</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Game Info */}
        <div className="game-info">
          <p>
            <strong>Game:</strong> {gameType.replace(/_/g, ' ').toUpperCase()}
          </p>
          <p>
            <strong>Players Needed:</strong> 2-{maxPlayers}
          </p>
        </div>

        {/* Actions */}
        <div className="lobby-actions">
          {isHost ? (
            <>
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className="start-btn"
                title={!canStart ? 'Need at least 2 players to start' : 'Start the game'}
              >
                Start Game
              </button>
              <button onClick={onBack} className="cancel-btn">
                Cancel Game
              </button>
            </>
          ) : (
            <>
              <p className="waiting-text">Waiting for host to start...</p>
              <button onClick={onBack} className="leave-btn">
                Leave Room
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
