import Header from '../components/Header';
import Footer from '../components/Footer';
import Wavify from 'react-wavify';
import './Landing_page.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Header />

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content">
          <div className="hero-icon">🎯</div>
          <h1 className="hero-title">Welcome to GamePlan</h1>
          <p className="hero-subtitle">Your Ultimate Platform for Strategic Planning & Game Mastery</p>
          <div className="hero-button-group">
            <button className="hero-button primary">Start Your Adventure</button>
            <button className="hero-button secondary">Watch Demo</button>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="floating-shape shape1"></div>
          <div className="floating-shape shape2"></div>
          <div className="floating-shape shape3"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="features-container">
          <h2 className="section-title">Why You'll Love GamePlan</h2>
          <p className="section-subtitle">Everything you need to plan like a pro</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Smart Analytics</h3>
              <p>Track your progress with beautiful, easy-to-understand analytics and real-time insights.</p>
              <div className="feature-badge">Popular</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Super-fast performance that keeps up with your gameplay. Never miss a beat.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <h3>Fort Knox Security</h3>
              <p>Bank-level encryption to keep your strategies and data safe from prying eyes.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Team Power</h3>
              <p>Collaborate seamlessly with your squad in real-time. Victory together is sweeter!</p>
              <div className="feature-badge">New</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎮</div>
              <h3>Game Ready</h3>
              <p>Designed by gamers, for gamers. Every feature is built with your experience in mind.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Always Evolving</h3>
              <p>Regular updates and new features to keep GamePlan fresh and ahead of the game.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta">
        <div className="cta-content">
          <div className="cta-icon">🏆</div>
          <h2>Ready to Level Up Your Planning?</h2>
          <p>Join thousands of gamers already using GamePlan to dominate their strategy</p>
          <button className="cta-button">Get Started Free</button>
          <p className="cta-subtext">No credit card required • 30-day free trial</p>
        </div>
        <div className="cta-decoration">
          <div className="floating-circle circle1"></div>
          <div className="floating-circle circle2"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats-container">
          <div className="stat-card">
            <h3>50K+</h3>
            <p>Active Players</p>
          </div>
          <div className="stat-card">
            <h3>100%</h3>
            <p>Satisfaction Rate</p>
          </div>
          <div className="stat-card">
            <h3>24/7</h3>
            <p>Support Team</p>
          </div>
          <div className="stat-card">
            <h3>150+</h3>
            <p>Game Integrations</p>
          </div>
        </div>
      </section>

      {/* Wave Animation */}
      <Wavify
        fill='#0080C0'
        paused={false}
        options={{
          height: 6,
          amplitude: 100,
          speed: 0.18,
          points: 4,
        }}
        style={{
          display: 'flex',
          marginTop: -40,
        }}
      />

      <Footer />
    </div>
  );
}
