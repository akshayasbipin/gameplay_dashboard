import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { AudioToggle } from '../components/AudioToggle';
import './words_are_hard.css';
import {
  initializePlayers,
  getRandomEmoji,
  GAME_DURATION,
  getWinner,
  formatTime,
  type Player,
} from '../utils/wordsAreHardUtils';

type GamePhase = 'setup' | 'customizing' | 'countdown' | 'playing' | 'finished';

export default function WordsAreHardGame() {
  const navigate = useNavigate();
  const { bgmRef, playButtonClick, playVictory } = useAudio();
  
  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentEmoji, setCurrentEmoji] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION);
  const [isGameRunning, setIsGameRunning] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [countdownValue, setCountdownValue] = useState<number>(3);

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdownValue <= 0) {
      setPhase('playing');
      setCurrentEmoji('');
      setTimeLeft(GAME_DURATION);
      setIsGameRunning(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdownValue(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdownValue]);

  // Initialize emoji when game starts
  useEffect(() => {
    if (phase === 'playing' && !currentEmoji) {
      setCurrentEmoji(getRandomEmoji());
    }
  }, [phase, currentEmoji]);

  // Timer logic
  useEffect(() => {
    if (!isGameRunning || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setIsGameRunning(false);
          const gameWinner = getWinner(players);
          setWinner(gameWinner);
          setPhase('finished');
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isGameRunning, timeLeft, players]);

  // Play victory sound when game finishes
  useEffect(() => {
    if (phase === 'finished' && winner) {
      playVictory();
    }
  }, [phase, winner, playVictory]);

  // Handle player count selection
  const handlePlayerCountSelect = (count: number) => {
    setNumPlayers(count);
  };

  // Start game - move to customizing phase
  const handleStartGame = () => {
    const newPlayers = initializePlayers(numPlayers);
    setPlayers(newPlayers);
    setPhase('customizing');
  };

  // Start countdown
  const handleStartCountdown = () => {
    setCountdownValue(3);
    setPhase('countdown');
  };

  // Handle player name change
  const handlePlayerNameChange = (playerId: string, newName: string) => {
    setPlayers(prev =>
      prev.map(player =>
        player.id === playerId
          ? { ...player, name: newName }
          : player
      )
    );
  };

  // Handle emoji refresh
  const handleNewEmoji = () => {
    setCurrentEmoji(getRandomEmoji(currentEmoji));
  };

  // Handle score increment
  const handleScoreIncrement = (playerId: string) => {
    if (!isGameRunning) return;
    
    setPlayers(prev =>
      prev.map(player =>
        player.id === playerId
          ? { ...player, score: player.score + 1 }
          : player
      )
    );
    handleNewEmoji();
  };

  // Handle draw (no one guessed correctly)
  const handleDraw = () => {
    if (!isGameRunning) return;
    handleNewEmoji();
  };

  // Reset game
  const handleReset = () => {
    setPhase('setup');
    setNumPlayers(2);
    setPlayers([]);
    setCurrentEmoji('');
    setTimeLeft(GAME_DURATION);
    setIsGameRunning(false);
    setWinner(null);
  };

  // Play again (keep player count, reset scores)
  const handlePlayAgain = () => {
    const newPlayers = initializePlayers(numPlayers);
    setPlayers(newPlayers);
    setCurrentEmoji('');
    setTimeLeft(GAME_DURATION);
    setIsGameRunning(false);
    setWinner(null);
    setCountdownValue(3);
    setPhase('customizing');
  };

  // Setup Phase
  if (phase === 'setup') {
    return (
      <div className="words-are-hard-game">
        <div className="setup-screen">
          <h1>Words Are Hard 📝</h1>
          <p>
            Select the number of players (max 4) and start playing! Think of a word that matches the emoji letter and click your button to score.
          </p>

          <div className="player-count-selector">
            {[2, 3, 4].map(count => (
              <button
                key={count}
                className={`player-count-btn ${numPlayers === count ? 'selected' : ''}`}
                onClick={() => {
                  playButtonClick();
                  handlePlayerCountSelect(count);
                }}
              >
                {count}
              </button>
            ))}
          </div>

          <button className="start-game-btn" onClick={() => {
            playButtonClick();
            handleStartGame();
          }}>
            Start Game
          </button>
        </div>

        {/* Audio Toggle */}
        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem' }}>
          <AudioToggle />
        </div>
      </div>
    );
  }

  // Customizing Phase - Player Names
  if (phase === 'customizing') {
    return (
      <div className="words-are-hard-game">
        <div className="setup-screen">
          <h1>Enter Names</h1>
          <p>Customize player names before starting:</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
            {players.map((player) => (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>{player.emoji}</span>
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => handlePlayerNameChange(player.id, e.target.value)}
                  style={{
                    padding: '0.6rem 1rem',
                    fontSize: '0.8rem',
                    border: '2px solid #333',
                    borderRadius: '0px',
                    fontFamily: "'Pixelify Sans', sans-serif",
                    maxWidth: '200px',
                  }}
                  placeholder="Enter name"
                />
              </div>
            ))}
          </div>

          <button className="start-game-btn" onClick={() => {
            playButtonClick();
            handleStartCountdown();
          }} style={{ marginTop: '3rem' }}>
            Ready? Lets Go!
          </button>
        </div>

        {/* Audio Toggle */}
        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem' }}>
          <AudioToggle />
        </div>
      </div>
    );
  }

  // Countdown Phase
  if (phase === 'countdown') {
    return (
      <div className="words-are-hard-game">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '2rem',
        }}>
          <div style={{
            fontSize: '6rem',
            fontFamily: "'Press Start 2P', cursive",
            color: '#333',
            width: '120px',
            height: '120px',
            border: '3px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFD700',
            boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.3)',
          }}>
            {countdownValue > 0 ? countdownValue : 'GO!'}
          </div>
        </div>

        {/* Audio Toggle */}
        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem' }}>
          <AudioToggle />
        </div>
      </div>
    );
  }

  // Game Phase
  if (phase === 'playing') {
    return (
      <div className="words-are-hard-game">
        <div className="game-screen">
          {/* Header with Timer and Reset */}
          <div className="game-header">
            <div className={`timer ${timeLeft <= 5 ? 'warning' : ''}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
            <button
              className="reset-btn"
              onClick={() => {
                playButtonClick();
                handleReset();
              }}
              disabled={!isGameRunning}
            >
              Reset Game
            </button>
          </div>

          {/* Game Content: Emoji and Players */}
          <div className="game-content">
            {/* Emoji Display */}
            <div className="emoji-display">
              <div className="emoji-circle">
                {currentEmoji}
              </div>
              <div className="emoji-label">
                Think of a word starting with this letter...
              </div>
              <button
                className="draw-btn"
                onClick={() => {
                  playButtonClick();
                  handleDraw();
                }}
                disabled={!isGameRunning}
              >
                Skip
              </button>
            </div>

            {/* Players */}
            <div className="players-container">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="player-card"
                  style={{ borderTopColor: player.color }}
                >
                  <div className="player-emoji">{player.emoji}</div>
                  <div className="player-name">{player.name}</div>
                  <div>
                    <div className="player-score">{player.score}</div>
                    <div className="score-label">Points</div>
                  </div>
                  <button
                    className="player-button"
                    style={{ backgroundColor: player.color }}
                    onClick={() => {
                      playButtonClick();
                      handleScoreIncrement(player.id);
                    }}
                    disabled={!isGameRunning}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audio Toggle */}
        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem' }}>
          <AudioToggle />
        </div>
      </div>
    );
  }

  // Finished Phase
  if (phase === 'finished' && winner) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    // Check if it's a draw (all players have the same score)
    const allScoresSame = players.every(p => p.score === players[0].score);
    const isNobodyWins = allScoresSame && players[0].score === 0;

    return (
      <div className="words-are-hard-game">
        <div className="finish-screen">
          <h1>🎉 Game Over! 🎉</h1>

          {isNobodyWins ? (
            <div className="no-winner-card">
              <div className="no-winner-title">❌ No One Wins ❌</div>
              <div className="no-winner-subtitle">Everyone scored 0 points!</div>
            </div>
          ) : allScoresSame ? (
            <div className="draw-card">
              <div className="draw-title">🤝 It's a Draw! 🤝</div>
              <div className="draw-subtitle">Everyone has {players[0].score} points!</div>
            </div>
          ) : (
            <div className="winner-card">
              <div className="winner-emoji">{winner.emoji}</div>
              <div className="winner-name">{winner.name} Wins!</div>
              <div className="winner-score">{winner.score} Points</div>
            </div>
          )}

          <div className="final-scores">
            <h3>Final Scores</h3>
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className="score-item">
                <span className="score-item-name">
                  {index + 1}. {player.name}
                </span>
                <span className="score-item-value">{player.score}pts</span>
              </div>
            ))}
          </div>

          <button className="play-again-btn" onClick={() => {
            playButtonClick();
            handlePlayAgain();
          }}>
            Play Again
          </button>
          <button className="back-home-btn" onClick={() => {
            playButtonClick();
            navigate('/');
          }}>
            Back to Home
          </button>
        </div>

        {/* Audio Toggle */}
        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem' }}>
          <AudioToggle />
        </div>
      </div>
    );
  }

  return null;
}
