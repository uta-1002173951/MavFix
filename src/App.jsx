import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import MainPage from './components/MainPage'
import ReportIssue from './components/ReportIssue'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/report" element={<ReportIssue />} />
      </Routes>
    </Router>
  )
}

export default App
