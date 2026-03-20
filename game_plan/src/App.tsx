import './App.css'
import LandingPage from './pages/Landing_page'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <LandingPage />
    </ThemeProvider>
  )
}

export default App

