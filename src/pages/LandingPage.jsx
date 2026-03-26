import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';

const LandingPage = () => {
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const { data, error } = await supabase
          .from('auctions')
          .select('*')
          .in('status', ['registration_open', 'running'])
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setAuction(data || null);
      } catch (err) {
        console.error("Error fetching auction:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuction();
  }, []);

  if (loading) return <Loader message="LOADING AUCTION DETAILS..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <div className="spotlight"></div>
      <PageHeader title={auction ? auction.auction_name : "CRICKET AUCTION PANEL"} subtitle="Welcome to the ultimate auction platform" showLogos={false} />

      <main className="container" style={{ flex: 1, padding: '4rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative' }}>
        {!auction ? (
          <EmptyState
            title="No Active Auctions"
            description="There are currently no open or running auctions. Please check back later."
          />
        ) : (
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
            {auction.auction_logo ? (
              <img src={auction.auction_logo} alt={auction.auction_name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-gold)', padding: '2px', background: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '2rem', border: '3px solid var(--accent-gold)' }}>
                CAP
              </div>
            )}

            <h2 style={{ fontSize: '2.5rem', color: 'var(--text-main)', margin: '1rem 0 0 0', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {auction.auction_name}
            </h2>

            <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {auction.auction_date && <span>📅 {new Date(auction.auction_date).toLocaleDateString()}</span>}
              {auction.venue && <span>📍 {auction.venue}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '1rem' }}>
              <Link to="/register" className="btn btn-primary" style={{ width: '100%' }}>Register</Link>
              {/* <Link to="/players" className="btn btn-outline" style={{ width: '100%' }}>View Player List</Link> */}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LandingPage;
