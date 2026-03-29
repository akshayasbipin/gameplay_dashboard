import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GameLobby from '../components/GameLobby';
import { 
  createGameRoom, 
  getRoomPlayers, 
  initializeGameState, 
  recordPlayerMove,
  recordGameWinner,
  subscribeToGameMoves,
  updateRoomStatus,
  subscribeToRoom,
  getGameStateForRoom
} from '../lib/multiplayerService';
import { useAudio } from '../context/AudioContext';
import { AudioToggle } from '../components/AudioToggle';
import './snakes_and_ladders.css';

// ─── Board constants ────────────────────────────────────────────────
const BOARD_SIZE = 100;
const COLS = 10;
const ROWS = 10;

// Snakes: head → tail (player slides DOWN)

const SNAKES: Record<number, number> = {
  99: 56,
  92: 66,
  58: 7,
  53: 36,
  50: 13,
  30: 9,
  21: 4,
  14: 5,
};

// Ladders: bottom → top (player climbs UP)
const LADDERS: Record<number, number> = {
  3: 24,
  28: 84,
  35: 45,
  39: 62,
  69: 71,
  75: 86,
  80: 98,
};

// ─── Types ───────────────────────────────────────────────────────────
interface Player {
  id: string;
  name: string;
  position: number; // 0 = off board (before square 1), 1-100 on board
  color: string;
  isBot: boolean;
  emoji: string;
  finished: boolean;
}

type Phase = 'mode-select' | 'join-screen' | 'lobby' | 'game-lobby' | 'playing' | 'finished';

interface GameState {
  phase: Phase;
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  matchId: string;
  winner: Player | null;
  lastEvent: string; // snake / ladder message
  botThinking: boolean;
  snakeHit: boolean; // Track if a snake was hit this turn
}

// ─── Player config ───────────────────────────────────────────────────
const PLAYER_CONFIGS = [
  { color: '#FF4757', emoji: '🔴', label: 'Red' },
  { color: '#2196F3', emoji: '🔵', label: 'Blue' },
  { color: '#2ed573', emoji: '🟢', label: 'Green' },
  { color: '#ffa502', emoji: '🟡', label: 'Yellow' },
  { color: '#a55eea', emoji: '🟣', label: 'Purple' },
  { color: '#ff6b81', emoji: '🩷', label: 'Pink' },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function generateMatchId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Convert board position (1-100) to percentage-based CSS top/left
 * matching the board image layout:
 *   Row 0 (bottom): squares 1-10, left→right
 *   Row 1:          squares 11-20, right→left  (zigzag)
 *   …
 *   Row 9 (top):    squares 91-100, right→left
 */
function getCellCenter(position: number): { left: string; top: string } {
  if (position <= 0) {
    // Off board — park just outside bottom-left corner
    return { left: '-8%', top: '93%' };
  }
  const idx = position - 1;                  // 0-based
  const row = Math.floor(idx / COLS);        // 0 = bottom row
  const posInRow = idx % COLS;
  const col = row % 2 === 0 ? posInRow : (COLS - 1 - posInRow);

  // Each cell is 10% of the board width/height
  const cellW = 100 / COLS;
  const cellH = 100 / ROWS;

  const left = col * cellW + cellW / 2;       // % from left
  const top = (ROWS - 1 - row) * cellH + cellH / 2; // % from top (row 0 is bottom)

  return { left: `${left}%`, top: `${top}%` };
}

// Offset pieces that share the same square so they don't stack exactly
const PIECE_OFFSETS = [
  { dx: 0, dy: 0 },
  { dx: 2.5, dy: 0 },
  { dx: 0, dy: 2.5 },
  { dx: 2.5, dy: 2.5 },
  { dx: -2.5, dy: 0 },
  { dx: 1.2, dy: -2.5 },
];

function getPieceStyle(
  position: number,
  playerIndex: number,
  allPlayers: Player[],
): React.CSSProperties {
  // How many OTHER players are on this same square, and what offset index am I?
  const playersOnSquare = allPlayers.filter(p => p.position === position);
  const myOffsetIndex = playersOnSquare.findIndex((_, i) => {
    const p = playersOnSquare[i];
    return p.id === allPlayers[playerIndex].id;
  });

  const base = getCellCenter(position);
  const off = PIECE_OFFSETS[myOffsetIndex] ?? PIECE_OFFSETS[0];

  return {
    left: position <= 0
      ? base.left
      : `calc(${base.left} + ${off.dx}%)`,
    top: position <= 0
      ? `calc(${base.top} + ${playerIndex * 12}%)` // stack off-board pieces vertically
      : `calc(${base.top} + ${off.dy}%)`,
  };
}

// ─── Dice face SVG ───────────────────────────────────────────────────
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

function DiceFace({ value }: { value: number }) {
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <rect x="4" y="4" width="92" height="92" rx="14" ry="14"
        fill="white" stroke="#ddd" strokeWidth="3"
        style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }}
      />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill="#222" />
      ))}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────
export default function SnakesAndLaddersGame() {
  const navigate = useNavigate();
  const { currentPlayer: authPlayer } = useAuth();
  
  const [gameMode, setGameMode] = useState<'single' | 'host' | 'join'>('single'); // single=local, host=create room, join=join room
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinError, setJoinError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const { bgmRef, playButtonClick, playSnakeHiss, playVictory } = useAudio();
  const [playerCount, setPlayerCount] = useState(2);
  const [botCount, setBotCount] = useState(0); // number of CPU opponents
  const [playerNames, setPlayerNames] = useState<string[]>(
    Array.from({ length: 6 }, (_, i) => `Player ${i + 1}`)
  );
  const [copied, setCopied] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [rollingAnim, setRollingAnim] = useState(false);
  const [animDice, setAnimDice] = useState(1); // dice face shown during animation

  const [gameState, setGameState] = useState<GameState>({
    phase: 'mode-select',
    players: [],
    currentPlayerIndex: 0,
    diceValue: null,
    isRolling: false,
    matchId: generateMatchId(),
    winner: null,
    lastEvent: '',
    botThinking: false,
    snakeHit: false,
  });

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameMovesSubscriptionRef = useRef<any>(null);
  const remoteGameStateRef = useRef<any>(null);
  const gameStartSubscriptionRef = useRef<any>(null);
  const localPlayerIdRef = useRef<string | null>(null);
  const gameInitializedRef = useRef<boolean>(false);

  // ── Core roll logic (pure — takes current state, returns next state) ──
  const computeRoll = useCallback((state: GameState): GameState => {
    const dice = Math.floor(Math.random() * 6) + 1;
    const player = state.players[state.currentPlayerIndex];

    let newPos = player.position + dice;
    let event = '';

    // Can't overshoot 100
    if (newPos > BOARD_SIZE) {
      newPos = player.position;
      event = `${player.name} rolled ${dice} — needs ${BOARD_SIZE - player.position} to win. No move!`;
    }

    // Check snake / ladder
    if (newPos > 0 && newPos <= BOARD_SIZE) {
      if (SNAKES[newPos] !== undefined) {
        const dest = SNAKES[newPos];
        event = `🐍 ${player.name} rolled ${dice}! Snake at ${newPos} → slides to ${dest}!`;
        newPos = dest;
      } else if (LADDERS[newPos] !== undefined) {
        const dest = LADDERS[newPos];
        event = `🪜 ${player.name} rolled ${dice}! Ladder at ${newPos} → climbs to ${dest}!`;
        newPos = dest;
      } else {
        if (!event) event = `${player.name} rolled ${dice} → moved to ${newPos}`;
      }
    }

    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, position: newPos, finished: newPos === 100 } : p
    );

    // Detect if snake was hit
    const snakeHit = SNAKES[player.position + dice] !== undefined;

    // Check win
    if (newPos === BOARD_SIZE) {
      // Broadcast winner if multiplayer
      if (isMultiplayer && roomId) {
        console.log(`🏆 Broadcasting winner: ${player.name}`);
        recordGameWinner(roomId, player.id, player.name, updatedPlayers).catch(err => {
          console.error('Error recording winner:', err);
        });
      }

      return {
        ...state,
        players: updatedPlayers,
        diceValue: dice,
        phase: 'finished',
        winner: { ...player, position: newPos, finished: true },
        lastEvent: `🎉 ${player.name} reached 100 and WINS!`,
        isRolling: false,
        botThinking: false,
        snakeHit,
      };
    }

    // Advance to next player (skip finished players) — UNLESS rolled a 6!
    let nextIndex = state.currentPlayerIndex;
    let isReroll = false;

    if (dice === 6) {
      // Rolled a 6 — same player gets a re-roll!
      isReroll = true;
      event = `${player.name} rolled 6! 🎲 Re-rolling...`;
    } else {
      // Advance to next player
      nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      let tries = 0;
      while (updatedPlayers[nextIndex].finished && tries < state.players.length) {
        nextIndex = (nextIndex + 1) % state.players.length;
        tries++;
      }
    }

    return {
      ...state,
      players: updatedPlayers,
      diceValue: dice,
      currentPlayerIndex: nextIndex,
      lastEvent: event,
      isRolling: false,
      botThinking: isReroll && updatedPlayers[state.currentPlayerIndex]?.isBot ? true : false,
      snakeHit,
    };
  }, [isMultiplayer, roomId]);

  // ── Animated roll then apply result ──
  const doRoll = useCallback((currentState: GameState) => {
    // Animate dice for 600ms, then apply result
    setRollingAnim(true);

    if (rollAnimRef.current) clearInterval(rollAnimRef.current);
    rollAnimRef.current = setInterval(() => {
      setAnimDice(Math.floor(Math.random() * 6) + 1);
    }, 80);

    setTimeout(() => {
      if (rollAnimRef.current) clearInterval(rollAnimRef.current);
      setRollingAnim(false);

      const next = computeRoll(currentState);
      setAnimDice(next.diceValue ?? 1);

      // If multiplayer, broadcast the move to database
      if (isMultiplayer && roomId && next.diceValue) {
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        const newPosition = next.players[currentState.currentPlayerIndex].position;

        console.log(`📤 Broadcasting move: ${currentPlayer.name} rolled ${next.diceValue}, moved to ${newPosition}`);

        recordPlayerMove(
          roomId,
          currentPlayer.id,
          currentPlayer.name,
          next.diceValue,
          newPosition,
          next.lastEvent,
          next.players
        ).catch(err => {
          console.error('Error broadcasting move:', err);
        });
      }

      setGameState(next);

      // Schedule bot turn if needed
      if (
        next.phase === 'playing' &&
        next.players[next.currentPlayerIndex]?.isBot
      ) {
        setGameState(prev => ({ ...prev, botThinking: true }));
      }
    }, 700);
  }, [isMultiplayer, roomId, computeRoll]);

  // ── Auto-roll for bots ──
  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    if (!gameState.botThinking) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer?.isBot) return;

    botTimerRef.current = setTimeout(() => {
      doRoll(gameState);
    }, 1200); // bot "thinks" for 1.2s

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [gameState.botThinking, gameState.currentPlayerIndex, doRoll, gameState]);

  // ── Fallback polling for joining players waiting in lobby ──
  // If Realtime is delayed, this ensures they still transition to playing phase
  useEffect(() => {
    // Only for joining players in game-lobby phase
    if (gameMode === 'host' || gameState.phase !== 'game-lobby' || !roomId) {
      return;
    }

    console.log('⏱️ JOINING PLAYER: Starting fallback polling for game initialization');
    
    let isMounted = true;
    const pollingInterval = setInterval(async () => {
      if (!isMounted) return;

      try {
        // Check if game has been initialized
        const gameState = await getGameStateForRoom(roomId);
        
        if (gameState && gameState.game_data && gameState.game_data.players && gameState.game_data.players.length > 0) {
          console.log('✅ JOINING PLAYER: Fallback polling detected game initialization!');
          
          // Fetch fresh room players
          const roomPlayers = await getRoomPlayers(roomId);
          if (!roomPlayers || roomPlayers.length === 0) {
            console.error('❌ No room players found');
            return;
          }

          // Deduplicate
          const uniqueRoomPlayers = Array.from(
            new Map(roomPlayers.map(rp => [rp.player_id || rp.id, rp])).values()
          );
          
          const gamePlayers: Player[] = uniqueRoomPlayers.map((rp) => ({
            id: rp.player_id || rp.id,
            name: rp.player_name,
            position: rp.position || 0,
            color: rp.color,
            emoji: rp.emoji,
            isBot: false,
            finished: false,
          }));

          console.log('🎮 JOINING PLAYER: Synced with', gamePlayers.length, 'players via polling');
          
          // Store local player ID - Find the joining player in the game players list
          // BUT only if not already set by the stable effect
          if (!localPlayerIdRef.current) {
            const localPlayer = gamePlayers.find(p => p.name === authPlayer?.name);
            const localPlayerId = localPlayer?.id || null;
            localPlayerIdRef.current = localPlayerId;
            console.log('👤 Local player matched (polling):', { playerName: authPlayer?.name, matchedId: localPlayerId, allPlayers: gamePlayers.map(p => `${p.name}(${p.id})`) });
          } else {
            console.log('🔒 Local player ID already set (polling), skipping update:', localPlayerIdRef.current);
          }
          
          // Mark as initialized
          gameInitializedRef.current = true;

          // Move subscription already set up in early effect, just transition
          console.log('📌 JOINING PLAYER: Transitioning to playing phase (via polling fallback)');
          
          setAnimDice(1);
          setGameState(prev => ({
            ...prev,
            phase: 'playing',
            players: gamePlayers,
            currentPlayerIndex: gameState.game_data?.currentPlayerIndex || 0,
            diceValue: null,
            isRolling: false,
            winner: null,
            lastEvent: gameState.game_data?.lastEvent || 'Game started! Good luck!',
            botThinking: false,
          }));

          // Stop polling since game has started
          clearInterval(pollingInterval);
        }
      } catch (err) {
        console.warn('⏱️ Polling check error (this is OK):', err instanceof Error ? err.message : err);
      }
    }, 1000); // Poll every 1 second

    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
      console.log('🧹 Cleanup: Stopped fallback polling');
    };
  }, [roomId, gameMode, gameState.phase, authPlayer?.id]);

  // ── Set up game moves subscription EARLY (for all multiplayer players) ──
  // This should be ready BEFORE game starts so we don't miss the host's first move
  useEffect(() => {
    // Only for multiplayer players with a room
    if (!isMultiplayer || !roomId) {
      return;
    }

    console.log('📡 Setting up game moves subscription early for room:', roomId);

    // Set up moves subscription (this will be used once game starts)
    if (gameMovesSubscriptionRef.current) {
      gameMovesSubscriptionRef.current.unsubscribe();
    }

    gameMovesSubscriptionRef.current = subscribeToGameMoves(roomId, (remoteGameState) => {
      console.log('📨 Move update received:', { 
        currentPlayerIndex: remoteGameState.game_data?.currentPlayerIndex,
        lastEvent: remoteGameState.game_data?.lastEvent 
      });

      if (remoteGameState.game_data) {
        setGameState(prev => ({
          ...prev,
          players: remoteGameState.game_data.players || prev.players,
          currentPlayerIndex: remoteGameState.game_data.currentPlayerIndex !== undefined ? remoteGameState.game_data.currentPlayerIndex : prev.currentPlayerIndex,
          lastEvent: remoteGameState.game_data.lastEvent || prev.lastEvent,
        }));
      }

      if (remoteGameState.game_data?.gameFinished && remoteGameState.game_data?.winner) {
        const winner = remoteGameState.game_data.winner;
        setGameState(prev => ({
          ...prev,
          phase: 'finished',
          winner: {
            id: winner.id,
            name: winner.name,
            position: 100,
            color: prev.players.find(p => p.id === winner.id)?.color || '#FFF',
            emoji: prev.players.find(p => p.id === winner.id)?.emoji || '😊',
            isBot: false,
            finished: true,
          },
          lastEvent: `🎉 ${winner.name} reached 100 and WINS!`,
        }));
      }
    });

    return () => {
      // Don't unsubscribe - keep listening throughout the game
      console.log('📡 Game moves subscription remains active for room:', roomId);
    };
  }, [isMultiplayer, roomId]);

  // ── Set up game start listener EARLY (for joining players) ──
  // This effect ensures localPlayerIdRef is set ONLY from the current game's player list
  // and never gets overwritten by subsequent effects
  useEffect(() => {
    if (gameState.phase !== 'playing' || !gameState.players || gameState.players.length === 0) {
      return;
    }

    // If already set to a player in the current game, don't change it
    if (localPlayerIdRef.current) {
      const currentPlayer = gameState.players.find(p => p.id === localPlayerIdRef.current);
      if (currentPlayer) {
        console.log('🔒 Local player ID stable:', { name: currentPlayer.name, id: localPlayerIdRef.current });
        return; // Already set correctly, don't change
      }
    }

    // Find the local player by matching name
    const localPlayer = gameState.players.find(p => p.name === authPlayer?.name);
    if (localPlayer && !localPlayerIdRef.current) {
      localPlayerIdRef.current = localPlayer.id;
      console.log('🎯 Local player ID LOCKED IN:', { playerName: localPlayer.name, playerId: localPlayer.id });
    }
  }, [gameState.phase, gameState.players, authPlayer?.name]);

  // ── Watch for game start via Realtime subscription (for joining players) ──
  // When host initializes game, subscribeToRoom fires and we detect it here
  useEffect(() => {
    // Only set up subscription for joining players with a valid room
    if (!roomId || gameMode === 'host' || gameInitializedRef.current) {
      console.log('⏭️ Skipping subscription setup:', { roomId: !!roomId, isHost: gameMode === 'host', alreadyInitialized: gameInitializedRef.current });
      return;
    }

    console.log('👁️ Joining player subscribed to real-time game start notifications for room:', roomId);

    // Set up subscription to detect when host starts the game
    const subscription = subscribeToRoom(roomId, async (payload) => {
      // subscribeToRoom listens to multiplayer_game_state table changes
      // When host initializes game, this fires with INSERT event
      console.log('📡 Subscription received payload:', {
        table: payload.table,
        eventType: payload.eventType,
        hasGameData: !!payload.new?.game_data,
        hasPlayers: !!payload.new?.game_data?.players,
      });

      // Check if this is a game initialization event (multiplayer_game_state INSERT)
      if (payload.table === 'multiplayer_game_state' && payload.new?.game_data) {
        console.log('✅ REALTIME: Joining player detected game state change!', payload.new.game_data);
        
        // Only proceed if game_data has players (game has been initialized)
        if (!payload.new.game_data.players || payload.new.game_data.players.length === 0) {
          console.log('⏸️ Game state exists but no players yet, waiting...');
          return;
        }

        try {
          // Fetch fresh room players to sync with host
          const roomPlayers = await getRoomPlayers(roomId);
          if (!roomPlayers || roomPlayers.length === 0) {
            console.error('❌ No room players found after game init');
            return;
          }

          // Deduplicate room players by player_id
          const uniqueRoomPlayers = Array.from(
            new Map(roomPlayers.map(rp => [rp.player_id || rp.id, rp])).values()
          );
          
          const gamePlayers: Player[] = uniqueRoomPlayers.map((rp) => ({
            id: rp.player_id || rp.id,
            name: rp.player_name,
            position: rp.position || 0,
            color: rp.color,
            emoji: rp.emoji,
            isBot: false,
            finished: false,
          }));

          console.log('🎮 Joining player synced with', gamePlayers.length, 'players:', gamePlayers.map(p => `${p.name} (${p.id})`));
          
          // Store local player ID for turn validation - Find the joining player in the game players list
          // BUT only if not already set by the stable effect
          if (!localPlayerIdRef.current) {
            const localPlayer = gamePlayers.find(p => p.name === authPlayer?.name);
            const localPlayerId = localPlayer?.id || null;
            localPlayerIdRef.current = localPlayerId;
            console.log('👤 Local player matched (realtime):', { playerName: authPlayer?.name, matchedId: localPlayerId, allPlayers: gamePlayers.map(p => `${p.name}(${p.id})`) });
          } else {
            console.log('🔒 Local player ID already set (realtime), skipping update:', localPlayerIdRef.current);
          }

          // Mark as initialized to prevent re-subscription
          gameInitializedRef.current = true;

          // Subscribe to game moves (for receiving updates during play)
          if (gameMovesSubscriptionRef.current) {
            gameMovesSubscriptionRef.current.unsubscribe();
          }
          
          gameMovesSubscriptionRef.current = subscribeToGameMoves(roomId, (remoteGameState) => {
            console.log('📨 Move update received:', remoteGameState);

            if (remoteGameState.game_data) {
              setGameState(prev => ({
                ...prev,
                players: remoteGameState.game_data.players || prev.players,
                currentPlayerIndex: remoteGameState.game_data.currentPlayerIndex !== undefined ? remoteGameState.game_data.currentPlayerIndex : prev.currentPlayerIndex,
                lastEvent: remoteGameState.game_data.lastEvent || prev.lastEvent,
              }));
            }

            // Check for winner
            if (remoteGameState.game_data?.gameFinished && remoteGameState.game_data?.winner) {
              const winner = remoteGameState.game_data.winner;
              setGameState(prev => ({
                ...prev,
                phase: 'finished',
                winner: {
                  id: winner.id,
                  name: winner.name,
                  position: 100,
                  color: prev.players.find(p => p.id === winner.id)?.color || '#FFF',
                  emoji: prev.players.find(p => p.id === winner.id)?.emoji || '😊',
                  isBot: false,
                  finished: true,
                },
                lastEvent: `🎉 ${winner.name} reached 100 and WINS!`,
              }));
            }
          });

          // Transition to playing phase - THIS IS THE KEY TRANSITION!
          console.log('📌 Joining player transitioning to PLAYING phase');
          
          setAnimDice(1);
          setGameState(prev => ({
            ...prev,
            phase: 'playing',
            players: gamePlayers,
            currentPlayerIndex: payload.new?.game_data?.currentPlayerIndex || 0,
            diceValue: null,
            isRolling: false,
            winner: null,
            lastEvent: payload.new?.game_data?.lastEvent || 'Game started! Good luck!',
            botThinking: false,
          }));
        } catch (err) {
          console.error('❌ Error starting game from real-time notification:', err);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      console.log('🧹 Cleanup: Unsubscribed from game start notifications');
    };
  }, [roomId, gameMode, authPlayer?.id]);
  // ── Play snake hiss sound when a snake is hit ──
  useEffect(() => {
    if (gameState.snakeHit && gameState.phase === 'playing') {
      playSnakeHiss();
      // Reset snakeHit after playing sound
      setGameState(prev => ({ ...prev, snakeHit: false }));
    }
  }, [gameState.snakeHit, gameState.phase, playSnakeHiss]);

  // ── Play victory sound when game finishes ──
  useEffect(() => {
    if (gameState.phase === 'finished' && gameState.winner) {
      playVictory();
    }
  }, [gameState.phase, gameState.winner, playVictory]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      if (rollAnimRef.current) clearInterval(rollAnimRef.current);
      if (gameMovesSubscriptionRef.current) {
        gameMovesSubscriptionRef.current.unsubscribe();
      }
      if (gameStartSubscriptionRef.current) {
        gameStartSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  // ── Host a new multiplayer game ──
  async function handleHostGame() {
    try {
      if (!authPlayer) {
        alert('You must be logged in to host a game');
        return;
      }

      const newRoom = await createGameRoom(
        authPlayer.id,
        authPlayer.name,
        authPlayer.isGuest,
        'snakes_and_ladders'
      );

      setRoomId(newRoom.id);
      setRoomCode(newRoom.room_code);
      setIsMultiplayer(true);
      setGameMode('host');
      setGameState(prev => ({
        ...prev,
        phase: 'game-lobby'
      }));
    } catch (error) {
      alert('Error creating room: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // ── Join a multiplayer game ──
  async function handleJoinGame() {
    if (!joinCode.trim()) {
      setJoinError('Please enter a room code');
      return;
    }

    try {
      setJoinError('');
      // Room will be fetched by GameLobby component
      setRoomCode(joinCode.toUpperCase());
      setIsMultiplayer(true);
      setGameMode('join');
      setGameState(prev => ({
        ...prev,
        phase: 'game-lobby'
      }));
    } catch (error) {
      setJoinError('Error joining room: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // ── Start game from mode select ──
  function handlePlayLocally() {
    setIsMultiplayer(false);
    setGameMode('single');
    setGameState(prev => ({
      ...prev,
      phase: 'lobby'
    }));
  }

  // ── Start game from game lobby (multiplayer) ──
  async function handleStartFromLobby() {
    if (!isMultiplayer || !roomId) {
      console.error('❌ handleStartFromLobby: isMultiplayer=', isMultiplayer, 'roomId=', roomId);
      setGameState(prev => ({
        ...prev,
        phase: 'lobby'
      }));
      return;
    }

    console.log('👑 HOST: Starting multiplayer game from lobby');

    try {
      console.log('👑 HOST: Marking room as playing...');
      // Mark room as playing
      await updateRoomStatus(roomId, 'playing');
      console.log('👑 HOST: Room status updated to playing');
      
      // Fetch all room players
      console.log('👑 HOST: Fetching room players...');
      const roomPlayers = await getRoomPlayers(roomId);
      if (!roomPlayers || roomPlayers.length === 0) {
        console.error('👑 HOST: No players found in room!');
        alert('No players found in room');
        return;
      }
      console.log('👑 HOST: Found', roomPlayers.length, 'room players');

      // Convert room players to game players with deduplication by player_id
      const uniqueRoomPlayers = Array.from(
        new Map(roomPlayers.map(rp => [rp.player_id || rp.id, rp])).values()
      );
      
      const gamePlayers: Player[] = uniqueRoomPlayers.map((rp) => ({
        id: rp.player_id || rp.id,
        name: rp.player_name,
        position: rp.position || 0,
        color: rp.color,
        emoji: rp.emoji,
        isBot: false,
        finished: false,
      }));
      
      // Identify which player index is the local player by matching name
      // Set it only if not already set
      if (!localPlayerIdRef.current) {
        const localPlayer = gamePlayers.find(p => p.name === authPlayer?.name);
        const localPlayerId = localPlayer?.id || null;
        localPlayerIdRef.current = localPlayerId;
        console.log('👑 HOST: Local player matched:', { playerName: authPlayer?.name, matchedId: localPlayerId });
      } else {
        console.log('👑 HOST: Local player ID already set, skipping update');
      }
      
      console.log('👑 HOST: Game players (deduplicated):', gamePlayers.map(p => `${p.name} (${p.id}`));

      // Initialize game state in database
      const initialGameState = {
        players: gamePlayers,
        currentPlayerIndex: 0,
        lastEvent: 'Multiplayer game started! Good luck!',
        lastMoveTimestamp: new Date().toISOString(),
      };

      console.log('👑 HOST: About to initialize game state in database with', gamePlayers.length, 'players');
      await initializeGameState(roomId, initialGameState);
      console.log('👑 HOST: ✅ Game state initialized in database! Realtime should fire now');

      // Subscribe to game moves from other players
      if (gameMovesSubscriptionRef.current) {
        gameMovesSubscriptionRef.current.unsubscribe();
      }
      
      gameMovesSubscriptionRef.current = subscribeToGameMoves(roomId, (remoteGameState) => {
        console.log('📨 Received game state update:', remoteGameState);
        remoteGameStateRef.current = remoteGameState;

        // Update local game state with remote data
        if (remoteGameState.game_data) {
          setGameState(prev => ({
            ...prev,
            players: remoteGameState.game_data.players || prev.players,
            currentPlayerIndex: remoteGameState.game_data.currentPlayerIndex !== undefined ? remoteGameState.game_data.currentPlayerIndex : prev.currentPlayerIndex,
            lastEvent: remoteGameState.game_data.lastEvent || prev.lastEvent,
          }));
        }

        // Check for winner
        if (remoteGameState.game_data?.gameFinished && remoteGameState.game_data?.winner) {
          const winner = remoteGameState.game_data.winner;
          setGameState(prev => ({
            ...prev,
            phase: 'finished',
            winner: {
              id: winner.id,
              name: winner.name,
              position: 100,
              color: prev.players.find(p => p.id === winner.id)?.color || '#FFF',
              emoji: prev.players.find(p => p.id === winner.id)?.emoji || '😊',
              isBot: false,
              finished: true,
            },
            lastEvent: `🎉 ${winner.name} reached 100 and WINS!`,
          }));
        }
      });

      // Start the game
      setAnimDice(1);
      gameInitializedRef.current = true; // Mark as initialized so effect knows to stop polling
      console.log('👑 HOST: Game initialized and started');
      setGameState(prev => ({
        ...prev,
        phase: 'playing',
      }));

    } catch (error) {
      console.error('Error starting multiplayer game:', error);
      alert('Error starting game: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // ── Back to mode select ──
  function handleBackToModeSelect() {
    setJoinError('');
    setJoinCode('');
    setGameState(prev => ({
      ...prev,
      phase: 'mode-select'
    }));
  }

  // ── Start game ──
  function startGame() {
    const humanCount = Math.max(1, playerCount - botCount);
    const bots = Math.min(botCount, playerCount - 1);
    //const total = humanCount + bots;

    const players: Player[] = [];

    for (let i = 0; i < humanCount; i++) {
      players.push({
        id: `human-${i}`,
        name: playerNames[i] || `Player ${i + 1}`,
        position: 0,
        color: PLAYER_CONFIGS[i].color,
        isBot: false,
        emoji: PLAYER_CONFIGS[i].emoji,
        finished: false,
      });
    }

    for (let i = 0; i < bots; i++) {
      const cfg = PLAYER_CONFIGS[humanCount + i];
      players.push({
        id: `bot-${i}`,
        name: `CPU ${i + 1}`,
        position: 0,
        color: cfg.color,
        isBot: true,
        emoji: cfg.emoji,
        finished: false,
      });
    }

    const firstIsBot = players[0]?.isBot;

    setAnimDice(1);
    setGameState({
      phase: 'playing',
      players,
      currentPlayerIndex: 0,
      diceValue: null,
      isRolling: false,
      matchId: gameState.matchId,
      winner: null,
      lastEvent: 'Game started! All players begin at position 0.',
      botThinking: firstIsBot,
      snakeHit: false,
    });
  }

  function resetGame() {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (rollAnimRef.current) clearInterval(rollAnimRef.current);
    if (gameMovesSubscriptionRef.current) {
      gameMovesSubscriptionRef.current.unsubscribe();
    }
    
    // Reset multiplayer state and initialization flag
    gameInitializedRef.current = false;
    if (isMultiplayer && roomId) {
      updateRoomStatus(roomId, 'waiting').catch(err => {
        console.error('Error updating room status:', err);
      });
    }
    
    setRollingAnim(false);
    setGameState({
      phase: 'game-lobby',
      players: [],
      currentPlayerIndex: 0,
      diceValue: null,
      isRolling: false,
      matchId: generateMatchId(),
      winner: null,
      lastEvent: '',
      botThinking: false,
      snakeHit: false,
    });
  }

  function copyLink() {
    const link = `${window.location.origin}${window.location.pathname}?match=${gameState.matchId}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Check if it's the local player's turn (for multiplayer)
  const isLocalPlayerTurn = !isMultiplayer || (currentPlayer?.id === localPlayerIdRef.current);
  
  // Determine if the local player can roll
  let canRoll = false;
  if (gameState.phase === 'playing' && !rollingAnim && !gameState.botThinking && currentPlayer && !currentPlayer.finished) {
    if (isMultiplayer && localPlayerIdRef.current) {
      // Multiplayer: Only the player whose actual ID matches the current player can roll
      canRoll = currentPlayer.id === localPlayerIdRef.current && !currentPlayer.isBot;
      
      // Debug logging - show when it works and when it fails
      if (currentPlayer && localPlayerIdRef.current) {
        if (canRoll) {
          console.log(`✅ Turn validation PASSED - It's your turn!:`, {
            currentPlayerName: currentPlayer.name,
            currentPlayerId: currentPlayer.id,
            localPlayerId: localPlayerIdRef.current,
            authPlayerName: authPlayer?.name,
            match: true,
          });
        } else {
          console.log(`❌ Turn validation failed:`, {
            currentPlayerName: currentPlayer.name,
            currentPlayerId: currentPlayer.id,
            localPlayerId: localPlayerIdRef.current,
            authPlayerName: authPlayer?.name,
            isBot: currentPlayer.isBot,
            match: currentPlayer.id === localPlayerIdRef.current,
          });
        }
      }
    } else {
      // Single-player: Only if current player is human-controlled (not bot)
      canRoll = !currentPlayer.isBot;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // MODE SELECT
  // ════════════════════════════════════════════════════════════════════
  if (gameState.phase === 'mode-select') {
    return (
      <div className="snakes-container">
        <div className="mode-select-screen">
          <h1 className="mode-select-title">🐍 Snakes & Ladders 🪜</h1>
          <p className="mode-select-subtitle">Choose your game mode</p>

          <div className="mode-buttons">
            <button className="mode-btn" onClick={handlePlayLocally}>
              <span className="mode-icon">👤</span>
              <span className="mode-label">Play Locally</span>
              <span className="mode-desc">Play with friends on this device</span>
            </button>

            <button className="mode-btn" onClick={handleHostGame}>
              <span className="mode-icon">🎮</span>
              <span className="mode-label">Host Online</span>
              <span className="mode-desc">Create a room and share the code</span>
            </button>

            <button className="mode-btn" onClick={() => setGameState(prev => ({ ...prev, phase: 'join-screen' }))}>
              <span className="mode-icon">🔗</span>
              <span className="mode-label">Join Online</span>
              <span className="mode-desc">Join a friend's game by code</span>
            </button>
          </div>

          <button className="btn-back" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // JOIN GAME SCREEN
  // ════════════════════════════════════════════════════════════════════
  if (gameState.phase === 'join-screen') {
    return (
      <div className="snakes-container">
        <div className="join-game-screen">
          <h1 className="join-title">Join a Game</h1>
          
          <div className="join-input-section">
            <label>Enter Room Code:</label>
            <input
              type="text"
              placeholder="e.g., ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              className="join-code-input"
              maxLength={6}
              autoFocus
            />
            {joinError && <p className="join-error">{joinError}</p>}
          </div>

          <div className="join-actions">
            <button className="btn-primary" onClick={handleJoinGame}>
              Join Game
            </button>
            <button className="btn-secondary" onClick={handleBackToModeSelect}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // GAME LOBBY (Multiplayer)
  // ════════════════════════════════════════════════════════════════════
  if (gameState.phase === 'game-lobby' && isMultiplayer && roomCode) {
    return (
      <div className="snakes-container">
        <div className="game-lobby-wrapper">
          <GameLobby 
            roomCode={roomCode}
            roomId={roomId || undefined}
            onStartGame={handleStartFromLobby}
            onBack={handleBackToModeSelect}
            isHost={gameMode === 'host'}
            onRoomIdReady={(id: string) => {
              console.log('🎯 Parent received roomId from GameLobby:', id);
              setRoomId(id);
            }}
          />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // LOBBY (Single player setup)
  // ════════════════════════════════════════════════════════════════════
  if (gameState.phase === 'lobby') {
    const humanCount = Math.max(1, playerCount - botCount);

    return (
      <div className="snakes-container">
        <div className="lobby">
          <h1 className="lobby-title">🐍 Snakes &amp; Ladders 🪜</h1>

          {/* Total players */}
          <div className="lobby-section">
            <label>Total Players (including you):</label>
            <div className="player-count-selector">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  className={`count-btn ${playerCount === n ? 'active' : ''}`}
                  onClick={() => {
                    playButtonClick();
                    setPlayerCount(n);
                    setBotCount(prev => Math.min(prev, n - 1));
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* CPU opponents */}
          <div className="lobby-section">
            <label>CPU Opponents: <span className="bot-count-label">{botCount}</span></label>
            <div className="player-count-selector">
              {Array.from({ length: playerCount }, (_, i) => i).map(n => (
                <button
                  key={n}
                  className={`count-btn ${botCount === n ? 'active' : ''}`}
                  onClick={() => {
                    playButtonClick();
                    setBotCount(n);
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="lobby-hint">
              {humanCount} human{humanCount > 1 ? 's' : ''} + {botCount} CPU
              {botCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Player names */}
          <div className="lobby-section">
            <button className="btn-secondary" onClick={() => {
              playButtonClick();
              setShowNames(v => !v);
            }}>
              {showNames ? '▲ Hide Names' : '▼ Set Player Names'}
            </button>

            {showNames && (
              <div className="names-list">
                {Array.from({ length: humanCount }, (_, i) => (
                  <div key={i} className="name-row">
                    <span className="name-dot" style={{ background: PLAYER_CONFIGS[i].color }}>
                      {PLAYER_CONFIGS[i].emoji}
                    </span>
                    <input
                      className="name-input"
                      type="text"
                      placeholder={`Player ${i + 1}`}
                      value={playerNames[i]}
                      onChange={e => {
                        const updated = [...playerNames];
                        updated[i] = e.target.value;
                        setPlayerNames(updated);
                      }}
                    />
                  </div>
                ))}
                {Array.from({ length: botCount }, (_, i) => (
                  <div key={`bot-${i}`} className="name-row name-row--bot">
                    <span className="name-dot" style={{ background: PLAYER_CONFIGS[humanCount + i].color }}>
                      {PLAYER_CONFIGS[humanCount + i].emoji}
                    </span>
                    <span className="bot-label">CPU {i + 1} (Auto-play)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share link */}
          <div className="lobby-section">
            <label>Share match link:</label>
            <div className="match-id-display">
              <code>{`${window.location.origin}?match=${gameState.matchId}`}</code>
              <button className="btn-copy" onClick={() => {
                playButtonClick();
                copyLink();
              }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <button className="btn-primary" onClick={() => {
            playButtonClick();
            startGame();
          }}>
            🎲 Start Game
          </button>
        </div>

        {/* Audio Toggle */}
        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem' }}>
          <AudioToggle />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // PLAYING
  // ════════════════════════════════════════════════════════════════════
  if (gameState.phase === 'playing') {
    return (
      <div className="snakes-container">
        <div className="game-board-wrapper">

          {/* ── Top bar ── */}
          <div className="game-info">
            <div className="current-player-info">
              <span className="current-dot" style={{ background: currentPlayer?.color }}>
                {currentPlayer?.emoji}
              </span>
              <div>
                <div className="current-name">{currentPlayer?.name}'s Turn</div>
                <div className="current-pos">
                  Square {currentPlayer?.position === 0 ? 'Start' : currentPlayer?.position}
                </div>
              </div>
            </div>

            {/* Dice */}
            <div className="dice-wrapper">
              <div className={`dice-face-wrap ${rollingAnim ? 'dice-rolling' : ''}`}>
                <DiceFace value={rollingAnim ? animDice : (gameState.diceValue ?? 1)} />
              </div>
            </div>

            <button
              className="btn-roll"
              onClick={() => {
                playButtonClick();
                doRoll(gameState);
              }}
              disabled={!canRoll}
              title={isMultiplayer && !isLocalPlayerTurn ? "Waiting for other players..." : ""}
            >
              {rollingAnim
                ? '⏳ Rolling…'
                : gameState.botThinking
                ? '🤖 CPU thinking…'
                : isMultiplayer && !isLocalPlayerTurn
                ? '⏱️ Waiting...'
                : '🎲 Roll Dice'}
            </button>

            {/* Room code badge for multiplayer */}
            {isMultiplayer && roomCode && (
              <div className="room-badge">
                🎮 Room: <strong>{roomCode}</strong>
              </div>
            )}
          </div>

          {/* ── Event banner ── */}
          {gameState.lastEvent && (
            <div className="event-banner">
              {gameState.lastEvent}
            </div>
          )}

          {/* ── Board ── */}
          <div className="board-container">
            {/*
              Place your board image as `snakes_ladders_board.jpg`
              in your /public folder (for Vite/CRA) or next to the component.
              The image name used here is: snakes_ladders_board.jpg
            */}
            <div
              className="game-board"
              style={{
                backgroundImage: "url('./snakes_ladders_board_light.jpg')",
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Transparent clickable grid (for reference — no visual) */}
              <div className="board-grid" aria-hidden="true">
                {Array.from({ length: BOARD_SIZE }).map((_, i) => (
                  <div key={i} className="grid-cell" />
                ))}
              </div>

              {/* Pieces — positioned absolutely over board */}
              {gameState.players.map((player, idx) => {
                const style = getPieceStyle(player.position, idx, gameState.players);
                const isActive = idx === gameState.currentPlayerIndex;
                return (
                  <div
                    key={player.id}
                    className={`player-piece ${isActive ? 'player-piece--active' : ''} ${player.finished ? 'player-piece--finished' : ''}`}
                    style={{
                      ...style,
                      backgroundColor: player.color,
                      zIndex: isActive ? 30 : 20 + idx,
                    }}
                    title={`${player.name} — Square ${player.position}`}
                  >
                    <span className="piece-emoji">{player.emoji}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Players sidebar ── */}
          <div className="players-status">
            <h3>Players</h3>
            {gameState.players.map((player, idx) => (
              <div
                key={player.id}
                className={`player-status ${idx === gameState.currentPlayerIndex ? 'active' : ''} ${player.finished ? 'finished' : ''}`}
                style={{ borderLeftColor: player.color }}
              >
                <span className="ps-emoji">{player.emoji}</span>
                <div className="ps-info">
                  <span className="ps-name">
                    {player.name}
                    {player.isBot && <span className="ps-bot-tag">CPU</span>}
                  </span>
                  <span className="ps-bar-wrap">
                    <span
                      className="ps-bar"
                      style={{
                        width: `${player.position}%`,
                        background: player.color,
                      }}
                    />
                  </span>
                </div>
                <span className="ps-pos">
                  {player.finished ? '🏆' : `${player.position}/100`}
                </span>
              </div>
            ))}
          </div>

          <button className="btn-secondary btn-reset" onClick={() => {
            playButtonClick();
            resetGame();
          }}>
            ↩ Back to Lobby
          </button>

          {/* Audio Toggle */}
          <div style={{ position: 'absolute', bottom: '2rem', right: '2rem' }}>
            <AudioToggle />
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // WIN SCREEN
  // ════════════════════════════════════════════════════════════════════
  if (gameState.phase === 'finished' && gameState.winner) {
    return (
      <div className="snakes-container">
        <div className="win-screen">
          <div className="confetti" />
          <div className="win-emoji">{gameState.winner.emoji}</div>
          <h1 className="win-title">
            🎉 {gameState.winner.name} Wins! 🎉
          </h1>
          <p className="win-subtitle">
            {gameState.winner.isBot ? 'The CPU beat you! Better luck next time.' : 'Congratulations!'}
          </p>

          <div className="win-rankings">
            {[...gameState.players]
              .sort((a, b) => (b.position - a.position))
              .map((p, i) => (
                <div key={p.id} className="rank-row" style={{ borderLeftColor: p.color }}>
                  <span className="rank-pos">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span>{p.emoji} {p.name}</span>
                  <span className="rank-square">
                    {p.finished ? 'Finished!' : `Square ${p.position}`}
                  </span>
                </div>
              ))}
          </div>

          <div className="win-actions">
            <button className="btn-primary" onClick={() => {
              playButtonClick();
              startGame();
            }}>Play Again</button>
            <button className="btn-secondary" onClick={() => {
              playButtonClick();
              navigate('/');
            }}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
