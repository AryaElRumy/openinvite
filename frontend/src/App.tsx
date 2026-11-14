import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './auth'
import DashboardPage from './pages/DashboardPage'
import GuestsPage from './pages/GuestsPage'
import InvitationEditorPage from './pages/InvitationEditorPage'
import LoginPage from './pages/LoginPage'
import PreviewPage from './pages/PreviewPage'
import PublicInvitationPage from './pages/PublicInvitationPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/editor"
            element={
              <RequireAuth>
                <InvitationEditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/preview"
            element={
              <RequireAuth>
                <PreviewPage />
              </RequireAuth>
            }
          />
          <Route
            path="/guests"
            element={
              <RequireAuth>
                <GuestsPage />
              </RequireAuth>
            }
          />
          <Route path="/i/:slug" element={<PublicInvitationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
