import { useEffect } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { AudioToggle } from '../components/AudioToggle';
import { useAudio } from '../context/AudioContext';
import './murdoku.css';

export default function MurdokuPage() {
  const { playButtonClick } = useAudio();
  useEffect(() => {
    // Redirect immediately with a small delay for UX
    const timer = setTimeout(() => {
      window.location.href = 'https://murdoku.com/print?lang=en';
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = () => {
    playButtonClick();
    window.history.back();
  };

  return (
    <div className="murdoku-page">
      <div className="murdoku-container">
        <div className="murdoku-content">
          <button className="back-button" onClick={handleBack}>← Back</button>
          
          <h1 className="murdoku-title">murdoku</h1>
          <p className="murdoku-subtitle">redirecting...</p>
          
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p className="loading-text">taking you to murdoku.com</p>
          </div>
        </div>

        {/* <div className="theme-toggle-murdoku">
          <ThemeToggle />
        </div> */}

        <div className="theme-toggle-murdoku">
          <AudioToggle />
        </div>

      </div>
    </div>
  );
}
