import Footer from '../components/Footer';
import Wavify from 'react-wavify';
import { ThemeToggle } from '../components/ThemeToggle';
import './Landing_page.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-left">
          <h1 className="hero-title">hello</h1>
          <p className="hero-subtitle">choose ur adventure</p>
          <div className="hero-nav">
            <a href="#" className="game-link">Snacks and Ladders</a>
            <a href="#" className="game-link">Uno</a>
            <a href="#" className="game-link">Ludo</a>
            <a href="#" className="game-link">Scribble</a>
          </div>
        </div>

        <div className="hero-right">
          <div className="avatar-container">
            <video autoPlay muted loop playsInline className="avatar-video">
              <source src="/avatar.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="sound-icon">🔊</div>
          <div className="theme-toggle-position">
            <ThemeToggle />
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

      <Footer />
    </div>
  );
}
