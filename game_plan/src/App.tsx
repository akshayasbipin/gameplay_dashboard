import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/landing_page'
import SnakesAndLaddersGame from './pages/snakes_and_ladders'
import WordsAreHardGame from './pages/words_are_hard'
import ScribblePage from './pages/scribble'
import MurdokuPage from './pages/murdoku'
import LoginPage from './pages/login'
import SignupPage from './pages/signup'
import JoinGamePage from './pages/join_game'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AudioProvider } from './context/AudioContext'

function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/join-game/:roomCode" element={<ProtectedRoute><JoinGamePage /></ProtectedRoute>} />
            <Route path="/join-game" element={<ProtectedRoute><JoinGamePage /></ProtectedRoute>} />
            <Route path="/snakes-and-ladders" element={<ProtectedRoute><SnakesAndLaddersGame /></ProtectedRoute>} />
            <Route path="/words-are-hard" element={<ProtectedRoute><WordsAreHardGame /></ProtectedRoute>} />
            <Route path="/scribble" element={<ProtectedRoute><ScribblePage /></ProtectedRoute>} />
            <Route path="/murdoku" element={<ProtectedRoute><MurdokuPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </AudioProvider>
    </ThemeProvider>
  )
}

export default App

