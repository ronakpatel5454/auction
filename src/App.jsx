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
const AuctionPage = React.lazy(() => import('./pages/AuctionPage'));
const AuctionTeamsPage = React.lazy(() => import('./pages/AuctionTeamsPage'));
const LiveAuctionPage = React.lazy(() => import('./pages/LiveAuctionPage'));
const TeamDetailsPage = React.lazy(() => import('./pages/TeamDetailsPage'));
const LiveAuctionProjectorPage = React.lazy(() => import('./pages/LiveAuctionProjectorPage'));
const PublicPlayersPage = React.lazy(() => import('./pages/PublicPlayersPage'));

function App() {
  return (
    <div className="app-container">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/live-auction-projector" element={<LiveAuctionProjectorPage />} />
          <Route path="/all-players" element={<PublicPlayersPage />} />
          <Route path="/players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
          <Route path="/player/:id" element={<PlayerProfilePage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/auction" element={<ProtectedRoute><AuctionPage /></ProtectedRoute>} />
          <Route path="/auction-teams" element={<ProtectedRoute><AuctionTeamsPage /></ProtectedRoute>} />
          <Route path="/live-auction" element={<ProtectedRoute><LiveAuctionPage /></ProtectedRoute>} />
          <Route path="/team-details" element={<ProtectedRoute><TeamDetailsPage /></ProtectedRoute>} />
          <Route path="/admin-players" element={<ProtectedRoute><AdminPlayersPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
