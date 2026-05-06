import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Page placeholders — will be replaced task by task
const LoginPage = () => (
  <div className="page items-center justify-center">
    <p className="text-slate-muted font-body">Login coming soon</p>
  </div>
);
const ScenarioSelectPage = () => (
  <div className="page items-center justify-center">
    <p className="text-slate-muted font-body">Scenarios coming soon</p>
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
