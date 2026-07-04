import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './picture_round.css';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

const PLAYER_ACCENTS = ['#FF4757', '#2196F3', '#2ed573', '#ffa502'];
const TOTAL_PUZZLES = 7;
const TOTAL_ROUNDS = 7;

interface Player {
  name: string;
  score: number;
}

type Phase = 'setup' | 'playing' | 'finished';

export default function PictureRoundGame() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('setup');
  const [numPlayers, setNumPlayers] = useState(2);
  const [nameInputs, setNameInputs] = useState<string[]>(['', '']);
  const [players, setPlayers] = useState<Player[]>([]);

  const [puzzleIndex, setPuzzleIndex] = useState(1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  const getRandomPuzzleIndex = (exclude?: number) => {
    let next = Math.floor(Math.random() * TOTAL_PUZZLES) + 1;
    if (exclude === undefined) return next;
    while (next === exclude && TOTAL_PUZZLES > 1) {
      next = Math.floor(Math.random() * TOTAL_PUZZLES) + 1;
    }
    return next;
  };

  // ── Setup ────────────────────────────────────────────────────────────
  const handleNumPlayersChange = (n: number) => {
    setNumPlayers(n);
    setNameInputs((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push('');
      return next;
    });
  };

  const handleNameChange = (idx: number, value: string) => {
    setNameInputs((prev) => {
      const next = prev.slice();
      next[idx] = value;
      return next;
    });
  };

  const allNamesFilled = nameInputs.slice(0, numPlayers).every((n) => n.trim().length > 0);

  const handleStart = () => {
    if (!allNamesFilled) return;
    setPlayers(nameInputs.slice(0, numPlayers).map((name) => ({ name: name.trim(), score: 0 })));
    setPuzzleIndex(getRandomPuzzleIndex());
    setShowAnswer(false);
    setRoundsPlayed(0);
    setPhase('playing');
  };

  // ── Gameplay ─────────────────────────────────────────────────────────
  const handleScorePoint = (idx: number) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, score: p.score + 1 } : p)));
  };

  const handleReveal = () => setShowAnswer(true);

  const handleNext = () => {
    const nextRound = roundsPlayed + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      setRoundsPlayed(nextRound);
      setPhase('finished');
      return;
    }
    setRoundsPlayed(nextRound);
    setPuzzleIndex(getRandomPuzzleIndex(puzzleIndex));
    setShowAnswer(false);
  };

  // If pics/{index}.jpg doesn't exist, we've run out of puzzles — end the game.
  const handleImageMissing = () => setPhase('finished');

  const handlePlayAgain = () => {
    setPhase('setup');
    setPlayers([]);
    setPuzzleIndex(1);
    setShowAnswer(false);
    setRoundsPlayed(0);
  };

  const maxScore = players.length ? Math.max(...players.map((p) => p.score)) : 0;
  const winners = players.filter((p) => p.score === maxScore);

  // ════════════════════════════════════════════════════════════════════
  // SETUP
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'setup') {
    return (
      <div className="pr-page">
        <div className="pr-card">
          <div className="pr-icon">🖼️</div>
          <h1 className="pr-title">Picture Round</h1>
          <p className="pr-subtitle">Guess what the picture puzzle means. First to shout it out gets the point.</p>

          <div className="pr-field">
            <label className="pr-label">Number of Players</label>
            <div className="pr-num-players">
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
                <button
                  key={n}
                  className={`pr-num-btn ${numPlayers === n ? 'pr-num-btn--active' : ''}`}
                  onClick={() => handleNumPlayersChange(n)}
                  type="button"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="pr-field pr-name-fields">
            {Array.from({ length: numPlayers }, (_, idx) => (
              <input
                key={idx}
                type="text"
                className="pr-name-input"
                style={{ borderColor: PLAYER_ACCENTS[idx] }}
                placeholder={`Player ${idx + 1} name`}
                value={nameInputs[idx] || ''}
                onChange={(e) => handleNameChange(idx, e.target.value)}
                maxLength={20}
              />
            ))}
          </div>

          <button className="pr-btn pr-btn--primary" onClick={handleStart} disabled={!allNamesFilled}>
            🚀 Start Game
          </button>
          <button className="pr-btn pr-btn--ghost" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // FINISHED
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'finished') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="pr-page">
        <div className="pr-card">
          <div className="pr-icon">🏁</div>
          <h1 className="pr-title pr-title--sm">Game Over</h1>
          <p className="pr-subtitle">
            {winners.length === 1
              ? `${winners[0].name} wins with ${maxScore} point${maxScore === 1 ? '' : 's'}!`
              : winners.length > 1
              ? `It's a tie between ${winners.map((w) => w.name).join(' & ')}!`
              : 'No points scored this round.'}
          </p>

          <div className="pr-scoreboard">
            {sorted.map((p, idx) => (
              <div key={p.name} className={`pr-score-row ${idx === 0 && maxScore > 0 ? 'pr-score-row--leader' : ''}`}>
                <span className="pr-score-name">{idx === 0 && maxScore > 0 ? '👑 ' : ''}{p.name}</span>
                <span className="pr-score-value">{p.score}</span>
              </div>
            ))}
          </div>

          <button className="pr-btn pr-btn--primary" onClick={handlePlayAgain}>
            🔁 Play Again
          </button>
          <button className="pr-btn pr-btn--ghost" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // PLAYING
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="pr-page">
      <div className="pr-card pr-card--wide">
        <div className="pr-round-header">
          <h1 className="pr-title pr-title--sm">🖼️ Picture Round</h1>
          <span className="pr-round-badge">
            Puzzle #{puzzleIndex} · Round {Math.min(roundsPlayed + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
          </span>
        </div>
        <div className="pr-image-frame">
          {!showAnswer ? (
            <img
              key={`q-${puzzleIndex}`}
              src={`/pics/${puzzleIndex}.jpg`}
              alt={`Puzzle ${puzzleIndex}`}
              className="pr-puzzle-image"
              onError={handleImageMissing}
            />
          ) : (
            <img
              key={`a-${puzzleIndex}`}
              src={`/pics_ans/${puzzleIndex}_ans.jpg`}
              alt={`Answer ${puzzleIndex}`}
              className="pr-puzzle-image"
            />
          )}
        </div>

        <div className="pr-players-grid" style={{ ['--pr-cols' as any]: players.length }}>
          {players.map((p, idx) => (
            <button
              key={p.name}
              className="pr-player-btn"
              style={{ borderColor: PLAYER_ACCENTS[idx % PLAYER_ACCENTS.length] }}
              onClick={() => handleScorePoint(idx)}
            >
              <span className="pr-player-name">{p.name}</span>
              <span className="pr-player-score" style={{ color: PLAYER_ACCENTS[idx % PLAYER_ACCENTS.length] }}>
                {p.score}
              </span>
            </button>
          ))}
        </div>

        <div className="pr-controls">
          {!showAnswer ? (
            <button className="pr-btn pr-btn--secondary" onClick={handleReveal}>
              👁️ Reveal Answer
            </button>
          ) : (
            <div className="pr-answer-note">Answer revealed — tap a player above if they got it, then hit Next.</div>
          )}
          <button className="pr-btn pr-btn--primary" onClick={handleNext}>
            ⏭️ Next Puzzle
          </button>
          <button className="pr-btn pr-btn--ghost" onClick={handlePlayAgain}>
            🔄 Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}
