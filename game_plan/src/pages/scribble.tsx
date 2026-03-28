import { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import './scribble.css';

export default function ScribblePage() {
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const handleSinglePlayer = () => {
    // Redirect to Quick Draw
    window.location.href = 'https://quickdraw.withgoogle.com/';
  };

  const handleMultiplePlayers = () => {
    // Redirect to Skribbl.io
    window.location.href = 'https://skribbl.io/';
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="scribble-page">
      <div className="scribble-container">
        <div className="scribble-content">
          <button className="back-button" onClick={handleBack}>← Back</button>
          
          <h1 className="scribble-title">scribble</h1>
          <p className="scribble-subtitle">how many players?</p>

          {!playerCount ? (
            <div className="player-options">
              <button className="player-button" onClick={handleSinglePlayer}>
                <span className="button-label">1 Player</span>
                <span className="button-desc">Quick Draw</span>
              </button>
              <button className="player-button" onClick={handleMultiplePlayers}>
                <span className="button-label">2+ Players</span>
                <span className="button-desc">Skribbl.io</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className="theme-toggle-scribble">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
