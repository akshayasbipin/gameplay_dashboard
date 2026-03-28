import Wavify from 'react-wavify';
import { ThemeToggle } from '../components/ThemeToggle';
import './landing_page.css';
import { useState, useRef, useEffect } from 'react';

export default function LandingPage() {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((error) => {
          console.log('Audio autoplay failed:', error);
        });
      }
    }
  }, [isMuted]);

  const toggleSound = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="landing-page">
      {/* Background Music */}
      <audio
        ref={audioRef}
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
            <a href="/snakes-and-ladders" className="game-link">Snakes and Ladders</a>
            <a href="/words-are-hard" className="game-link">Words are hard</a>
            <a href="/scribble" className="game-link">Scribble</a>
            <a href="/murdoku" className="game-link">Murdoku</a>
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
          <div className="sound-icon" onClick={toggleSound} style={{ cursor: 'pointer' }}>
            <img 
              src={isMuted ? '/bgm_1.jpg' : '/bgm_2.jpg'} 
              alt={isMuted ? 'Muted' : 'Playing'} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
