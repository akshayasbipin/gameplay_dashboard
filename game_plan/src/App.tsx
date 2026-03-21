import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/landing_page'
import SnakesAndLaddersGame from './pages/snakes_and_ladders'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/snakes-and-ladders" element={<SnakesAndLaddersGame />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

