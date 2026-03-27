import React from 'react';
import PageHeader from '../components/PageHeader';
import { Link } from 'react-router-dom';

const AdminPage = () => {

  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    window.location.reload();
  };

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Admin Command Center" subtitle="Master Control Dashboard" showLogos={false} />
      
      <main className="container" style={{ padding: '4rem 1rem', zIndex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px', marginBottom: '4rem' }}>
          
          <Link to="/auction" className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🏆</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Manage Auctions</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Create and configure backend tournament properties.</p>
          </Link>

          <Link to="/auction-teams" className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🛡️</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Auction Teams</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Manage teams and assign Icon players.</p>
          </Link>

          <Link to="/admin-players" className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>👥</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Player Approvals</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Approve, reject, or delete submitted registration profiles.</p>
          </Link>

          <Link to="/players" className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>📋</div>
            <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.5rem' }}>Public Roster</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Preview the live public-facing grid of all approved players.</p>
          </Link>

          <Link to="/live-auction" className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🔥</div>
            <h3 style={{ color: '#ff4444', margin: 0, fontSize: '1.5rem' }}>Live Auction</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Run active bidding sessions and sell players to teams.</p>
          </Link>

          <Link to="/team-details" className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>💰</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Team & Purse</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Track team squads and remaining auction budget.</p>
          </Link>

        </div>

        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderColor: '#ef4444', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Secure Logout
        </button>
        
        <style>{`
          .render-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .render-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 10px 30px rgba(57, 255, 20, 0.15);
            border-color: rgba(57, 255, 20, 0.4);
          }
        `}</style>
      </main>
    </div>
  );
};

export default AdminPage;
