import Wavify from 'react-wavify';
import { ThemeToggle } from '../components/ThemeToggle';
import { AudioToggle } from '../components/AudioToggle';
import { useAudio } from '../context/AudioContext';
import './landing_page.css';

export default function LandingPage() {
  const { bgmRef, playButtonClick } = useAudio();

  const handleGameLinkClick = () => {
    playButtonClick();
  };

  return (
    <div className="landing-page">
      {/* Background Music */}
      <audio
        ref={bgmRef}
        loop
        preload="auto"
        style={{ display: 'none' }}
      >
        <source src="/bgm.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-left">
          <h1 className="hero-title">hello!</h1>
          <p className="hero-subtitle">choose ur adventure</p>
          <div className="hero-nav">
            <a href="/snakes-and-ladders" className="game-link" onClick={handleGameLinkClick}>Snakes and Ladders</a>
            <a href="/words-are-hard" className="game-link" onClick={handleGameLinkClick}>Words are hard</a>
            <a href="/scribble" className="game-link" onClick={handleGameLinkClick}>Scribble</a>
            <a href="/murdoku" className="game-link" onClick={handleGameLinkClick}>Murdoku</a>
            <a href="#" className="game-link">Uno</a>
            <a href="#" className="game-link">Ludo</a>
          </div>
        </div>

        <div className="hero-right">
          <div className="avatar-container">
            <video autoPlay muted loop playsInline className="avatar-video">
              <source src="/avatar.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="hero-button-group">
          <div className="theme-toggle-position">
            <ThemeToggle />
          </div>
          <div>
            <AudioToggle />
          </div>
        </div>
      </section>

      {/* Wave Animation */}
      <div style={{ height: '70px', overflow: 'hidden', background: '#ffffff' }}>
        <Wavify
          fill='#0080C0'
          paused={false}
          options={{
            height: 70,
            amplitude: 20,
            speed: 0.30,
            points: 4,
          }}
          style={{
            display: 'flex',
            marginTop: -40,
          }}
        />
      </div>
    </div>
  );
}
