import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import InstrumentListPage from './pages/InstrumentListPage'
import InstrumentCardPage from './pages/InstrumentCardPage'
import BackupPage from './pages/BackupPage'
import SettingsPage from './pages/SettingsPage'
import WriteoffPage from './pages/WriteoffPage'
import TemplateEditorPage from './pages/TemplateEditorPage'

// Защищённый маршрут
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<InstrumentListPage />} />
          <Route path="instruments/:id" element={<InstrumentCardPage />} />
          <Route path="backups" element={<BackupPage />} />
          <Route path="writeoff" element={<WriteoffPage />} />
          <Route path="templates" element={<TemplateEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
