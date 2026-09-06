import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GameLobby from '../components/GameLobby';
import {
  getGameRoom,
  getRoomPlayers,
  updateRoomStatus,
  getGameStateForRoom,
  subscribeToGameMoves,
} from '../lib/multiplayerService';
import {
  createCodeGameRoom,
  submitSecretCode,
  submitGuess,
  configureTimer,
  giveUpGame,
  finalizeRoundOnTimeout,
  isValidCode,
  ROUND_DURATION_MS,
  GUESS_CODE_GAME_TYPE,
  type CodeGameData,
} from '../lib/guessCodeService';
import './guess_my_code.css';

type Phase = 'mode-select' | 'join-input' | 'game-lobby' | 'round';

interface RoomPlayerLite {
  id: string;
  player_id: string | null;
  player_name: string;
  emoji: string;
}

// ─── 4-digit entry widget ──────────────────────────────────────────────
function DigitEntry({
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);

  // If the parent resets the value externally (e.g. clears it after a guess), mirror that.
  useEffect(() => {
    if (value === '' && digits.some((d) => d !== '')) {
      setDigits(['', '', '', '']);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDigitAt = (idx: number, char: string) => {
    const clean = char.replace(/[^0-9]/g, '').slice(-1);
    const next = digits.slice();
    next[idx] = clean;
    setDigits(next);
    onChange(next.join(''));
    if (clean && idx < 3) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  return (
    <div className="digit-entry">
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={refs[idx]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={`digit-box ${idx === 0 ? 'digit-box--lead' : ''}`}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && idx === 0}
          onChange={(e) => setDigitAt(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
        />
      ))}
    </div>
  );
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Main component ─────────────────────────────────────────────────────
export default function GuessMyCodeGame() {
  const navigate = useNavigate();
  const { currentPlayer } = useAuth();

  const [phase, setPhase] = useState<Phase>('mode-select');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [busy, setBusy] = useState(false);

  const [players, setPlayers] = useState<RoomPlayerLite[]>([]);
  const [gameData, setGameData] = useState<CodeGameData | null>(null);

  const [myCodeInput, setMyCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);

  const [guessInput, setGuessInput] = useState('');
  const [guessError, setGuessError] = useState('');
  const [guessSubmitting, setGuessSubmitting] = useState(false);

  const [timerEnabled, setTimerEnabled] = useState<boolean | null>(null);
  const [timerDurationSeconds, setTimerDurationSeconds] = useState(90);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_DURATION_MS);
  const [givingUp, setGivingUp] = useState(false);

  const gameMovesSubRef = useRef<any>(null);
  const timeoutFiredRef = useRef(false);
  const lobbyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myId = currentPlayer?.id || '';
  const opponent = players.find((p) => p.player_id !== myId) || null;

  // ── Host: create a room ──────────────────────────────────────────────
  const handleHost = async () => {
    if (!currentPlayer) return;
    setBusy(true);
    setJoinError('');
    try {
      const room = await createCodeGameRoom(
        currentPlayer.id,
        currentPlayer.name,
        currentPlayer.isGuest
      );
      if (!room) throw new Error('Could not create room');
      setRoomId(room.id);
      setRoomCode(room.room_code);
      setIsHost(true);
      setPhase('game-lobby');
    } catch (err) {
      setJoinError('Error creating room: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  // ── Join: look up a room by code ─────────────────────────────────────
  const handleJoin = async () => {
    if (!joinCodeInput) return;
    setBusy(true);
    setJoinError('');
    try {
      const room = await getGameRoom(joinCodeInput.toUpperCase());
      if (!room) {
        setJoinError('Room not found. Check the code and try again.');
        return;
      }
      if (room.game_type !== GUESS_CODE_GAME_TYPE) {
        setJoinError('That code belongs to a different game.');
        return;
      }
      if (room.status !== 'waiting') {
        setJoinError('That game has already started or finished.');
        return;
      }
      setRoomId(room.id);
      setRoomCode(room.room_code);
      setIsHost(false);
      setPhase('game-lobby');
    } catch (err) {
      setJoinError('Error finding room: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  // ── Enter the round once both players are in the lobby ──────────────
  const enterRound = useCallback(async (rid: string) => {
    try {
      const roomPlayers = await getRoomPlayers(rid);
      setPlayers((roomPlayers || []) as RoomPlayerLite[]);
      const state = await getGameStateForRoom(rid);
      setGameData((state?.game_data as CodeGameData) || null);
    } catch (err) {
      console.error('Error entering round:', err);
    }
    setPhase('round');
  }, []);

  // Host: click "Start Game" inside GameLobby
  const handleStartGame = async () => {
    if (!roomId || timerEnabled === null) return;
    try {
      const configured = await configureTimer(
        roomId,
        timerEnabled,
        timerEnabled ? timerDurationSeconds * 1000 : null
      );
      setGameData(configured);
      await updateRoomStatus(roomId, 'playing');
      await enterRound(roomId);
    } catch (err) {
      console.error('Error starting game:', err);
    }
  };

  const handleGiveUp = async () => {
    if (!roomId || givingUp || !currentPlayer) return;
    if (!window.confirm('End the game for both players?')) return;

    setGivingUp(true);
    try {
      const updated = await giveUpGame(roomId, myId, currentPlayer.name);
      setGameData(updated);
    } catch (err) {
      setGuessError(err instanceof Error ? err.message : 'Could not end the game');
    } finally {
      setGivingUp(false);
    }
  };

  // Guest: poll for the host flipping room status to 'playing'
  useEffect(() => {
    if (phase !== 'game-lobby' || isHost || !roomCode) return;

    lobbyPollRef.current = setInterval(async () => {
      try {
        const room = await getGameRoom(roomCode);
        if (room?.status === 'playing' && room.id) {
          if (lobbyPollRef.current) clearInterval(lobbyPollRef.current);
          await enterRound(room.id);
        }
      } catch (err) {
        // ignore transient errors while polling
      }
    }, 1500);

    return () => {
      if (lobbyPollRef.current) clearInterval(lobbyPollRef.current);
    };
  }, [phase, isHost, roomCode, enterRound]);

  // Subscribe to game_data changes during the round
  useEffect(() => {
    if (phase !== 'round' || !roomId) return;

    const sub = subscribeToGameMoves(roomId, (row: any) => {
      if (row?.game_data) setGameData(row.game_data as CodeGameData);
    });
    gameMovesSubRef.current = sub;

    return () => {
      sub?.unsubscribe?.();
    };
  }, [phase, roomId]);

  // Countdown timer, synced off the shared timerStartedAt
  useEffect(() => {
    if (!gameData || !gameData.timerEnabled || gameData.phase !== 'guessing' || !gameData.timerStartedAt) return;

    timeoutFiredRef.current = false;
    const startedAt = new Date(gameData.timerStartedAt).getTime();
    const duration = gameData.durationMs || ROUND_DURATION_MS;

    const tick = () => {
      const remaining = startedAt + duration - Date.now();
      setTimeLeftMs(remaining);
      if (remaining <= 0 && !timeoutFiredRef.current && roomId) {
        timeoutFiredRef.current = true;
        finalizeRoundOnTimeout(roomId).catch(() => {});
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [gameData?.phase, gameData?.timerStartedAt, roomId]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleSubmitCode = async () => {
    setCodeError('');
    if (!isValidCode(myCodeInput)) {
      setCodeError('Enter exactly 4 digits — the first digit can\'t be 0.');
      return;
    }
    if (!roomId || !myId) return;
    setCodeSubmitting(true);
    try {
      const updated = await submitSecretCode(roomId, myId, myCodeInput);
      setGameData(updated);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Error submitting code');
    } finally {
      setCodeSubmitting(false);
    }
  };

  const handleSubmitGuess = async () => {
    setGuessError('');
    if (!isValidCode(guessInput)) {
      setGuessError('Enter exactly 4 digits — the first digit can\'t be 0.');
      return;
    }
    if (!roomId || !myId || !opponent?.player_id) return;
    setGuessSubmitting(true);
    try {
      const updated = await submitGuess(roomId, myId, opponent.player_id, currentPlayer?.name || 'Player', guessInput);
      setGameData(updated);
      setGuessInput('');
    } catch (err) {
      setGuessError(err instanceof Error ? err.message : 'Error submitting guess');
    } finally {
      setGuessSubmitting(false);
    }
  };

  const handleLeave = () => {
    if (lobbyPollRef.current) clearInterval(lobbyPollRef.current);
    gameMovesSubRef.current?.unsubscribe?.();
    setPhase('mode-select');
    setRoomId(null);
    setRoomCode(null);
    setIsHost(false);
    setPlayers([]);
    setGameData(null);
    setTimerEnabled(null);
    setTimerDurationSeconds(90);
    setMyCodeInput('');
    setGuessInput('');
    setJoinCodeInput('');
  };

  // ════════════════════════════════════════════════════════════════════
  // NOT LOGGED IN
  // ════════════════════════════════════════════════════════════════════
  if (!currentPlayer) {
    return (
      <div className="gmc-page">
        <div className="gmc-card">
          <div className="gmc-error">Please login or play as guest to play this game.</div>
          <button className="gmc-btn gmc-btn--ghost" onClick={() => navigate('/')}>Go Back Home</button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // MODE SELECT
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'mode-select') {
    return (
      <div className="gmc-page">
        <div className="gmc-card gmc-card--intro">
          <div className="gmc-vault-icon">🔐</div>
          <h1 className="gmc-title">Guess My Code</h1>
          <p className="gmc-subtitle">
            Set a secret 4-digit code. Crack your opponent's before the clock runs out.
          </p>

          {joinError && <div className="gmc-error">{joinError}</div>}

          <button className="gmc-btn gmc-btn--primary" onClick={handleHost} disabled={busy}>
            {busy ? 'Creating room…' : '🎲 Host a Game'}
          </button>
          <button className="gmc-btn gmc-btn--secondary" onClick={() => setPhase('join-input')} disabled={busy}>
            🔑 Join a Game
          </button>
          <button className="gmc-btn gmc-btn--ghost" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // JOIN INPUT
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'join-input') {
    return (
      <div className="gmc-page">
        <div className="gmc-card">
          <h1 className="gmc-title gmc-title--sm">Join a Game</h1>
          <p className="gmc-subtitle">Enter the room code your friend shared with you.</p>

          {joinError && <div className="gmc-error">{joinError}</div>}

          <input
            type="text"
            className="gmc-room-input"
            placeholder="e.g. ABC123"
            maxLength={6}
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            disabled={busy}
          />

          <button className="gmc-btn gmc-btn--primary" onClick={handleJoin} disabled={busy || !joinCodeInput}>
            {busy ? 'Searching…' : 'Find Room'}
          </button>
          <button className="gmc-btn gmc-btn--ghost" onClick={() => { setJoinError(''); setPhase('mode-select'); }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // GAME LOBBY (reused component)
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'game-lobby' && roomCode) {
    return (
      <GameLobby
        roomCode={roomCode}
        roomId={roomId || undefined}
        isHost={isHost}
        maxPlayers={2}
        gameType={GUESS_CODE_GAME_TYPE}
        onStartGame={handleStartGame}
        onBack={handleLeave}
        onRoomIdReady={(rid) => setRoomId(rid)}
        lobbyContent={
          <div className="gmc-lobby-settings">
            {isHost ? (
              <>
                <div className="gmc-lobby-settings-title">Round timer</div>
                <div className="gmc-timer-choice-row">
                  <label>
                    <input
                      type="radio"
                      name="gmc-timer"
                      checked={timerEnabled === false}
                      onChange={() => setTimerEnabled(false)}
                    />
                    No timer
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="gmc-timer"
                      checked={timerEnabled === true}
                      onChange={() => setTimerEnabled(true)}
                    />
                    Use timer
                  </label>
                </div>
                {timerEnabled && (
                  <select
                    className="gmc-duration-select"
                    value={timerDurationSeconds}
                    onChange={(e) => setTimerDurationSeconds(Number(e.target.value))}
                  >
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={90}>1 minute 30 seconds</option>
                    <option value={120}>2 minutes</option>
                    <option value={300}>5 minutes</option>
                  </select>
                )}
                {timerEnabled === null && <div className="gmc-settings-hint">Choose whether to use a timer before starting.</div>}
              </>
            ) : (
              <div className="gmc-settings-hint">The host will choose whether this round has a timer.</div>
            )}
          </div>
        }
      />
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // ROUND — enter code / guessing / finished
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'round') {
    const roundPhase = gameData?.phase || 'enter-code';
    const iSubmittedCode = !!(gameData && myId && gameData.codes[myId]);
    const opponentSubmittedCode = !!(gameData && opponent?.player_id && gameData.codes[opponent.player_id]);

    return (
      <div className="gmc-page">
        <div className="gmc-card gmc-card--wide">
          <div className="gmc-round-header">
            <h1 className="gmc-title gmc-title--sm">🔐 Guess My Code</h1>
            {roomCode && <span className="gmc-room-badge">Room {roomCode}</span>}
            {isHost && gameData?.phase !== 'finished' && (
              <button className="gmc-give-up-btn" onClick={handleGiveUp} disabled={givingUp}>
                {givingUp ? 'Ending…' : 'Give up'}
              </button>
            )}
          </div>

          {/* ── ENTER CODE ───────────────────────────────────────── */}
          {roundPhase === 'enter-code' && (
            <div className="gmc-stage">
              <p className="gmc-subtitle">
                Set your secret 4-digit code. It can't start with 0 (that wouldn't be a real 4-digit number).
              </p>

              {codeError && <div className="gmc-error">{codeError}</div>}

              <DigitEntry value={myCodeInput} onChange={setMyCodeInput} disabled={iSubmittedCode || codeSubmitting} autoFocus />

              {!iSubmittedCode ? (
                <button
                  className="gmc-btn gmc-btn--primary"
                  onClick={handleSubmitCode}
                  disabled={codeSubmitting || myCodeInput.length !== 4}
                >
                  {codeSubmitting ? 'Locking it in…' : '🔒 Lock In My Code'}
                </button>
              ) : (
                <div className="gmc-waiting">
                  <div className="gmc-waiting-spinner" />
                  {opponentSubmittedCode
                    ? 'Both codes locked — starting round…'
                    : `Code locked! Waiting for ${opponent?.player_name || 'your opponent'}…`}
                </div>
              )}
            </div>
          )}

          {/* ── GUESSING ─────────────────────────────────────────── */}
          {roundPhase === 'guessing' && gameData && (
            <div className="gmc-stage">
              {gameData.timerEnabled ? (
                <div className="gmc-timer-wrap">
                  <div className="gmc-timer">{formatTime(timeLeftMs)}</div>
                  <div className="gmc-timer-track">
                    <div
                      className="gmc-timer-fill"
                      style={{ width: `${Math.max(0, Math.min(100, (timeLeftMs / (gameData.durationMs || ROUND_DURATION_MS)) * 100))}%` }}
                    />
                  </div>
                </div>
              ) : <div className="gmc-no-timer">No timer — take your time.</div>}

              <div className="gmc-my-code-chip">
                Your code: <strong>{myId ? gameData.codes[myId] : '----'}</strong>
              </div>

              <p className="gmc-subtitle">
                Guess {opponent?.player_name || "your opponent"}'s code. 🔒 = right digit, right spot · 🔄 = right digit, wrong spot.
              </p>

              {guessError && <div className="gmc-error">{guessError}</div>}

              <DigitEntry value={guessInput} onChange={setGuessInput} disabled={guessSubmitting} />

              <button
                className="gmc-btn gmc-btn--primary"
                onClick={handleSubmitGuess}
                disabled={guessSubmitting || guessInput.length !== 4}
              >
                {guessSubmitting ? 'Checking…' : '🎯 Submit Guess'}
              </button>

              <div className="gmc-guess-log">
                <div className="gmc-guess-log-header">
                  <span>Your guesses</span>
                  {opponent && (
                    <span className="gmc-opponent-count">
                      {opponent.player_name} has guessed {(gameData.guesses[opponent.player_id || ''] || []).length}×
                    </span>
                  )}
                </div>
                {(gameData.guesses[myId] || []).length === 0 ? (
                  <div className="gmc-no-guesses">No guesses yet — take your shot!</div>
                ) : (
                  <div className="gmc-guess-list">
                    {[...(gameData.guesses[myId] || [])].reverse().map((g, i) => (
                      <div key={i} className="gmc-guess-row">
                        <span className="gmc-guess-digits">{g.guess}</span>
                        <span className="gmc-guess-feedback" aria-label={`${g.bulls} right spot, ${g.cows} wrong spot`}>
                          {(g.feedback || []).map((result, digitIndex) => (
                            <span key={digitIndex}>{result === 'bull' ? '🔒' : result === 'cow' ? '🔄' : '❌'}</span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FINISHED ─────────────────────────────────────────── */}
          {roundPhase === 'finished' && gameData && (
            <div className="gmc-stage gmc-stage--finished">
              {gameData.endedReason === 'give-up' ? (
                <h2 className="gmc-result-title">The host ended the game.</h2>
              ) : gameData.winnerId ? (
                <h2 className="gmc-result-title">
                  🎉 {gameData.winnerId === myId ? 'You cracked it!' : `${gameData.winnerName} cracked the code!`}
                </h2>
              ) : (
                <h2 className="gmc-result-title">⏱️ Time's up! Nobody cracked the code.</h2>
              )}

              <div className="gmc-reveal-grid">
                <div className="gmc-reveal-card">
                  <div className="gmc-reveal-name">You</div>
                  <div className="gmc-reveal-code">{gameData.codes[myId] || '----'}</div>
                </div>
                <div className="gmc-reveal-vs">vs</div>
                <div className="gmc-reveal-card">
                  <div className="gmc-reveal-name">{opponent?.player_name || 'Opponent'}</div>
                  <div className="gmc-reveal-code">{(opponent && gameData.codes[opponent.player_id || '']) || '----'}</div>
                </div>
              </div>

              <div className="gmc-finished-actions">
                <button className="gmc-btn gmc-btn--primary" onClick={handleLeave}>
                  🔁 Play Again
                </button>
                <button className="gmc-btn gmc-btn--ghost" onClick={() => navigate('/')}>
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
