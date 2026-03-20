import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <div className="footer-logo">
            <span className="footer-logo-icon">🎮</span>
            <span className="footer-logo-text">GamePlan</span>
          </div>
          <p className="footer-description">Making game planning fun and simple!</p>
        </div>
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#blog">Blog</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Stay Connected</h4>
          <ul className="social-links">
            <li><a href="#twitter">🐦 Twitter</a></li>
            <li><a href="#discord">💜 Discord</a></li>
            <li><a href="#instagram">📸 Instagram</a></li>
            <li><a href="#youtube">📺 YouTube</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 GamePlan. Crafted with ❤️ for gamers.</p>
      </div>
    </footer>
  );
}
