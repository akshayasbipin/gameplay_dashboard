import React from 'react';
import './landing_page.css';

export default function LandingPage() {
  return (
    
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">GamePlan</div>
          <ul className="nav-menu">
            <li className="nav-item"><a href="#home" className="nav-link">Home</a></li>
            <li className="nav-item"><a href="#features" className="nav-link">Features</a></li>
            <li className="nav-item"><a href="#about" className="nav-link">About</a></li>
            <li className="nav-item"><a href="#contact" className="nav-link">Contact</a></li>
          </ul>
          <button className="nav-button">Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to GamePlan</h1>
          <p className="hero-subtitle">Your Ultimate Platform for Strategic Planning</p>
          <button className="hero-button">Start Now</button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="features-container">
          <h2>Our Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics</h3>
              <p>Track your progress with powerful analytics and insights.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Performance</h3>
              <p>Lightning-fast performance optimized for your workflow.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Security</h3>
              <p>Bank-level security to keep your data safe and protected.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>Collaboration</h3>
              <p>Work together seamlessly with your team in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of users already using GamePlan</p>
          <button className="cta-button">Sign Up Free</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>GamePlan</h4>
            <p>Making planning simple and effective.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#about">About</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Follow Us</h4>
            <ul>
              <li><a href="#twitter">Twitter</a></li>
              <li><a href="#facebook">Facebook</a></li>
              <li><a href="#linkedin">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 GamePlan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
