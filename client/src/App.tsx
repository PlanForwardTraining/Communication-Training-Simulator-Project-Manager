import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ScenarioSelectPage } from './pages/ScenarioSelectPage';
import { DiscSelectPage } from './pages/DiscSelectPage';

const SimulationPage = () => (
  <div className="page items-center justify-center">
    <p className="text-slate-muted font-body">Simulation coming soon</p>
  </div>
);
const HistoryPage = () => (
  <div className="page items-center justify-center">
    <p className="text-slate-muted font-body">History coming soon</p>
  </div>
);

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
