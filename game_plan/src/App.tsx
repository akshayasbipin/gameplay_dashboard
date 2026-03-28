import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/landing_page'
import SnakesAndLaddersGame from './pages/snakes_and_ladders'
import WordsAreHardGame from './pages/words_are_hard'
import ScribblePage from './pages/scribble'
import MurdokuPage from './pages/murdoku'
import { ThemeProvider } from './context/ThemeContext'
import { AudioProvider } from './context/AudioContext'

function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/snakes-and-ladders" element={<SnakesAndLaddersGame />} />
            <Route path="/words-are-hard" element={<WordsAreHardGame />} />
            <Route path="/scribble" element={<ScribblePage />} />
            <Route path="/murdoku" element={<MurdokuPage />} />
          </Routes>
        </BrowserRouter>
      </AudioProvider>
    </ThemeProvider>
  )
}

export default App

