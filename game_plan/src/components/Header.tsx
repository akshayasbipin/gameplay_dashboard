import './Header.css';

export default function Header() {
  return (
    <nav className="header">
      <div className="header-container">
        <div className="header-logo">
          <span className="logo-icon">🎮</span>
          <span className="logo-text">GamePlan</span>
        </div>
        <ul className="header-menu">
          <li><a href="#home" className="header-link">Home</a></li>
          <li><a href="#features" className="header-link">Features</a></li>
          <li><a href="#about" className="header-link">About</a></li>
          <li><a href="#contact" className="header-link">Contact</a></li>
        </ul>
        <button className="header-button">Get Started</button>
      </div>
    </nav>
  );
}
