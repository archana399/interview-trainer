/**
 * App.tsx — Router setup with all pages and navigation guards.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import InterviewPage from './pages/InterviewPage'
import FeedbackPage from './pages/FeedbackPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
