import Wavify from 'react-wavify';
import { ThemeToggle } from '../components/ThemeToggle';
import './landing_page.css';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isGuest, currentPlayer, loginAsGuest, logoutGuest, signOut } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const isAuthenticated = !!user || isGuest;

  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause();
      } else {
        // Try to play, but don't fail silently - browser autoplay policies may block it
        audioRef.current.play().catch(() => {
          // Autoplay blocked by browser - user can toggle sound manually
        });
      }
    }
  }, [isMuted]);

  const toggleSound = () => {
    setIsMuted(!isMuted);
  };

  const handleGuestLogin = async () => {
    if (!guestName.trim()) {
      alert('Please enter a name');
      return;
    }
    try {
      await loginAsGuest(guestName);
      setShowGuestModal(false);
      setGuestName('');
    } catch (error) {
      alert('Failed to login as guest: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleLogout = async () => {
    try {
      if (isGuest) {
        logoutGuest();
      } else {
        await signOut();
      }
      // Navigate back to home after logout
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleGameSelect = (gamePath: string) => {
    navigate(gamePath);
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
          
          {!isAuthenticated ? (
            <div className="hero-auth-buttons">
              <button onClick={() => navigate('/signup')} className="game-link auth-btn">Sign Up</button>
              <button onClick={() => navigate('/login')} className="game-link auth-btn">Login</button>
              <button onClick={() => setShowGuestModal(true)} className="game-link auth-btn guest-btn">Play as Guest</button>
            </div>
          ) : (
            <>
              <div className="player-info">
                <p className="welcome-text">
                  {isGuest ? `Welcome, Guest: ${currentPlayer?.name}!` : `Welcome, ${currentPlayer?.name}!`}
                </p>
              </div>
              <div className="hero-nav">
                <a onClick={() => handleGameSelect('/snakes-and-ladders')} className="game-link">Snakes and Ladders</a>
                <a onClick={() => handleGameSelect('/words-are-hard')} className="game-link">Words are hard</a>
                <a onClick={() => handleGameSelect('/scribble')} className="game-link">Scribble</a>
                <a onClick={() => handleGameSelect('/murdoku')} className="game-link">Murdoku</a>
                <a href="#" className="game-link">Uno</a>
                <a href="#" className="game-link">Ludo</a>
              </div>
              <button 
                type="button"
                onClick={handleLogout} 
                className="logout-game-link"
              >
                Logout
              </button>
            </>
          )}

          {/* Guest Modal */}
          {showGuestModal && (
            <div className="modal-overlay" onClick={() => setShowGuestModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Enter Your Name</h2>
                <input
                  type="text"
                  placeholder="What's your name?"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
                  className="guest-name-input"
                  autoFocus
                />
                <div className="modal-buttons">
                  <button onClick={handleGuestLogin} className="modal-btn primary">
                    Start Playing
                  </button>
                  <button onClick={() => setShowGuestModal(false)} className="modal-btn secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
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
