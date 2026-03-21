import { useState, useEffect, useRef, useCallback } from 'react';
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

type Phase = 'lobby' | 'playing' | 'finished';

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
    phase: 'lobby',
    players: [],
    currentPlayerIndex: 0,
    diceValue: null,
    isRolling: false,
    matchId: generateMatchId(),
    winner: null,
    lastEvent: '',
    botThinking: false,
  });

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Check win
    if (newPos === BOARD_SIZE) {
      return {
        ...state,
        players: updatedPlayers,
        diceValue: dice,
        phase: 'finished',
        winner: { ...player, position: newPos, finished: true },
        lastEvent: `🎉 ${player.name} reached 100 and WINS!`,
        isRolling: false,
        botThinking: false,
      };
    }

    // Advance to next player (skip finished players)
    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    let tries = 0;
    while (updatedPlayers[nextIndex].finished && tries < state.players.length) {
      nextIndex = (nextIndex + 1) % state.players.length;
      tries++;
    }

    return {
      ...state,
      players: updatedPlayers,
      diceValue: dice,
      currentPlayerIndex: nextIndex,
      lastEvent: event,
      isRolling: false,
      botThinking: false,
    };
  }, []);

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

      setGameState(prev => {
        const next = computeRoll(currentState);
        setAnimDice(next.diceValue ?? 1);

        // Schedule bot turn if needed
        if (
          next.phase === 'playing' &&
          next.players[next.currentPlayerIndex]?.isBot
        ) {
          next.botThinking = true;
        }
        return next;
      });
    }, 700);
  }, [computeRoll]);

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

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      if (rollAnimRef.current) clearInterval(rollAnimRef.current);
    };
  }, []);

  // ── Start game ──
  function startGame() {
    const humanCount = Math.max(1, playerCount - botCount);
    const bots = Math.min(botCount, playerCount - 1);
    const total = humanCount + bots;

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
    });
  }

  function resetGame() {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (rollAnimRef.current) clearInterval(rollAnimRef.current);
    setRollingAnim(false);
    setGameState({
      phase: 'lobby',
      players: [],
      currentPlayerIndex: 0,
      diceValue: null,
      isRolling: false,
      matchId: generateMatchId(),
      winner: null,
      lastEvent: '',
      botThinking: false,
    });
  }

  function copyLink() {
    const link = `${window.location.origin}${window.location.pathname}?match=${gameState.matchId}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const canRoll =
    gameState.phase === 'playing' &&
    !rollingAnim &&
    !gameState.botThinking &&
    currentPlayer &&
    !currentPlayer.isBot &&
    !currentPlayer.finished;

  // ════════════════════════════════════════════════════════════════════
  // LOBBY
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
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  className={`count-btn ${playerCount === n ? 'active' : ''}`}
                  onClick={() => {
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
                  onClick={() => setBotCount(n)}
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
            <button className="btn-secondary" onClick={() => setShowNames(v => !v)}>
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
              <button className="btn-copy" onClick={copyLink}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <button className="btn-primary" onClick={startGame}>
            🎲 Start Game
          </button>
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
              onClick={() => doRoll(gameState)}
              disabled={!canRoll}
            >
              {rollingAnim
                ? '⏳ Rolling…'
                : gameState.botThinking
                ? '🤖 CPU thinking…'
                : '🎲 Roll Dice'}
            </button>
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
                backgroundImage: "url('./snakes_ladders_board.jpg')",
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

          <button className="btn-secondary btn-reset" onClick={resetGame}>
            ↩ Back to Lobby
          </button>
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
            <button className="btn-primary" onClick={startGame}>🔄 Play Again</button>
            <button className="btn-secondary" onClick={resetGame}>🏠 Lobby</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
