import { Routes, Route } from 'react-router-dom';
import React, { Suspense } from 'react';
import ProtectedRoute from './components/ProtectedRoute';

// Using simple skeleton loader for suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
    <div style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '2px' }}>
      LOADING STADIUM...
    </div>
  </div>
);

// Lazy load pages
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const RegistrationPage = React.lazy(() => import('./pages/RegistrationPage'));
const PlayersPage = React.lazy(() => import('./pages/PlayersPage'));
const PlayerProfilePage = React.lazy(() => import('./pages/PlayerProfilePage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const AdminPlayersPage = React.lazy(() => import('./pages/AdminPlayersPage'));

function App() {
  return (
    <div className="app-container">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
          <Route path="/player/:id" element={<ProtectedRoute><PlayerProfilePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/admin-players" element={<ProtectedRoute><AdminPlayersPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
