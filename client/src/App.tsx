import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ScenarioSelectPage } from './pages/ScenarioSelectPage';
import { DiscSelectPage } from './pages/DiscSelectPage';
import { SimulationPage } from './pages/SimulationPage';
import { DebriefPage } from './pages/DebriefPage';
import { HistoryPage } from './pages/HistoryPage';

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
