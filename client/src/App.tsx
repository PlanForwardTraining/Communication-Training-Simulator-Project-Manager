import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ScenarioSelectPage } from './pages/ScenarioSelectPage';
import { DiscSelectPage } from './pages/DiscSelectPage';
import { SimulationPage } from './pages/SimulationPage';
import { DebriefPage } from './pages/DebriefPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminSessionDetailPage } from './pages/admin/AdminSessionDetailPage';
import { AdminScenariosPage } from './pages/admin/AdminScenariosPage';
import { AdminCoachingSettingsPage } from './pages/admin/AdminCoachingSettingsPage';
import { AdminBrandingPage } from './pages/admin/AdminBrandingPage';
import { AdminSessionsPage } from './pages/admin/AdminSessionsPage';

function App() {
  const auth = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading}>
              <ScenarioSelectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/new/:scenarioSlug"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading}>
              <DiscSelectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:scenarioSlug/:discCode/simulate"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading}>
              <SimulationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:sessionId/debrief"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading}>
              <DebriefPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading}>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading} requireAdmin>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading} requireAdmin>
              <AdminUserDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading} requireAdmin>
              <AdminSessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions/:id"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading} requireAdmin>
              <AdminSessionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/scenarios"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading} requireAdmin>
              <AdminScenariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/coaching"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading} requireAdmin>
              <AdminCoachingSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/branding"
          element={
            <ProtectedRoute user={auth.user} loading={auth.loading} requireAdmin>
              <AdminBrandingPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
