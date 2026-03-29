import { useState, useEffect } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { AudioToggle } from '../components/AudioToggle';
import { useAudio } from '../context/AudioContext';
import './scribble.css';

type ScribblePhase = 'selection' | 'redirecting';

export default function ScribblePage() {
  const { playButtonClick } = useAudio();
  const [phase, setPhase] = useState<ScribblePhase>('selection');
  const [redirectUrl, setRedirectUrl] = useState<string>('');

  useEffect(() => {
    if (phase === 'redirecting' && redirectUrl) {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, redirectUrl]);

  const handleSinglePlayer = () => {
    playButtonClick();
    setRedirectUrl('https://quickdraw.withgoogle.com/');
    setPhase('redirecting');
  };

  const handleMultiplePlayers = () => {
    playButtonClick();
    setRedirectUrl('https://skribbl.io/');
    setPhase('redirecting');
  };

  const handleBack = () => {
    playButtonClick();
    window.history.back();
  };

  if (phase === 'redirecting') {
    return (
      <div className="scribble-page">
        <div className="scribble-container">
          <div className="scribble-content">
            <button className="back-button" onClick={handleBack}>← Back</button>
            
            <h1 className="scribble-title">scribble</h1>
            <p className="scribble-subtitle">redirecting...</p>
            
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p className="loading-text">taking you to the game</p>
            </div>
          </div>

          <div className="theme-toggle-scribble">
            <AudioToggle />
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="scribble-page">
      <div className="scribble-container">
        <div className="scribble-content">
          <button className="back-button" onClick={handleBack}>← Back</button>
          
          <h1 className="scribble-title">scribble</h1>
          <p className="scribble-subtitle">how many players?</p>

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
        </div>

        <div className="theme-toggle-scribble">
          <AudioToggle />
        </div>

      </div>
    </div>
  );
}
