import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getGameRoom,
  addPlayerToRoom,
  getRoomPlayers,
} from '../lib/multiplayerService';
import GameLobby from '../components/GameLobby';
import './join_game.css';

const PLAYER_COLORS = [
  { color: '#FF4757', emoji: '🔴' },
  { color: '#2196F3', emoji: '🔵' },
  { color: '#2ed573', emoji: '🟢' },
  { color: '#ffa502', emoji: '🟡' },
  { color: '#a55eea', emoji: '🟣' },
  { color: '#ff6b81', emoji: '🩷' },
];

export default function JoinGamePage() {
  const { roomCode: paramRoomCode } = useParams();
  const navigate = useNavigate();
  const { currentPlayer } = useAuth();
  const [inputRoomCode, setInputRoomCode] = useState(paramRoomCode || '');
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  // Auto-search for room if parameter provided
  useEffect(() => {
    if (paramRoomCode) {
      handleSearchRoom(paramRoomCode);
    }
  }, [paramRoomCode]);

  const handleSearchRoom = async (code: string) => {
    setError('');
    setLoading(true);

    try {
      const foundRoom = await getGameRoom(code.toUpperCase());
      if (!foundRoom) {
        setError('Room not found. Please check the code and try again.');
        setRoom(null);
      } else {
        setRoom(foundRoom);
      }
    } catch (err) {
      setError('Error finding room: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setRoom(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!room || !currentPlayer) return;

    setLoading(true);
    try {
      // Get available color for this player
      const roomPlayers = await getRoomPlayers(room.id);
      const usedEmojis = roomPlayers.map((p) => p.emoji);
      const availableColor = PLAYER_COLORS.find((c) => !usedEmojis.includes(c.emoji)) || PLAYER_COLORS[0];

      // Add player to room
      const newRoomPlayer = await addPlayerToRoom(
        room.id,
        currentPlayer.isGuest ? null : currentPlayer.id,
        currentPlayer.name,
        availableColor.color,
        availableColor.emoji,
        currentPlayer.isGuest
      );

      if (newRoomPlayer) {
        setJoined(true);
      }
    } catch (err) {
      setError('Error joining room: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    // Navigate to the actual game with room info
    navigate(`/snakes-and-ladders?roomId=${room.id}&roomCode=${room.room_code}`);
  };

  const handleLeaveLobby = () => {
    setJoined(false);
    setRoom(null);
    setInputRoomCode('');
  };

  // If joined, show the lobby
  if (joined && room) {
    return (
      <GameLobby
        roomCode={room.room_code}
        roomId={room.id}
        isHost={room.host_id === currentPlayer?.id && !room.is_host_guest}
        maxPlayers={room.max_players}
        gameType={room.game_type}
        onStartGame={handleStartGame}
        onBack={handleLeaveLobby}
      />
    );
  }

  // If not authenticated, show error
  if (!currentPlayer) {
    return (
      <div className="join-game-page">
        <div className="join-container">
          <div className="error-message">
            Please login or play as guest to join a game.
          </div>
          <button onClick={() => navigate('/')} className="go-back-btn">
            Go Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-game-page">
      <div className="join-container">
        <div className="join-card">
          <h1>Join a Game</h1>

          {error && <div className="error-message">{error}</div>}

          {!room ? (
            <>
              <p className="join-subtitle">Enter the room code to join a multiplayer game</p>

              <div className="form-group">
                <label htmlFor="roomCode">Room Code</label>
                <input
                  id="roomCode"
                  type="text"
                  placeholder="e.g., ABC123"
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchRoom(inputRoomCode)}
                  maxLength={6}
                  disabled={loading}
                  className="room-code-input"
                />
              </div>

              <button
                onClick={() => handleSearchRoom(inputRoomCode)}
                disabled={!inputRoomCode || loading}
                className="search-btn"
              >
                {loading ? 'Searching...' : 'Search Room'}
              </button>

              <button onClick={() => navigate('/')} className="back-btn">
                Go Back
              </button>
            </>
          ) : (
            <>
              <div className="room-details">
                <div className="detail-item">
                  <span className="detail-label">Room Code:</span>
                  <span className="detail-value">{room.room_code}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Game Type:</span>
                  <span className="detail-value">
                    {room.game_type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Host:</span>
                  <span className="detail-value">{room.host_name}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Players:</span>
                  <span className="detail-value">
                    {room.current_players}/{room.max_players}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${room.status}`}>
                    {room.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  onClick={handleJoinRoom}
                  disabled={loading || room.status !== 'waiting' || room.current_players >= room.max_players}
                  className="join-btn"
                >
                  {loading ? 'Joining...' : 'Join Room'}
                </button>

                <button onClick={() => setRoom(null)} disabled={loading} className="try-again-btn">
                  Try Another Code
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
