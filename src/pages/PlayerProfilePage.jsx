import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';

const PlayerProfilePage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fromPath = location.state?.from || '/players';

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*, auction_players(is_icon)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPlayer(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [id]);

  if (loading) return <Loader message="LOADING PLAYER PROFILE..." />;
  if (!player) return (
    <div className="flex-col min-h-screen">
      <PageHeader title="Player Not Found" showLogos={false} />
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <button onClick={() => navigate(fromPath)} className="btn btn-outline">Go Back</button>
      </div>
    </div>
  );

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  return (
    <div className="flex-col min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="spotlight"></div>

      <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 10 }}>
        <button onClick={() => navigate(fromPath)} className="btn btn-outline" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>←</span> Back
        </button>
      </div>

      <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', zIndex: 1, position: 'relative' }}>

        <div className="glass-panel" style={{
          display: 'flex',
          flexDirection: 'row',
          // flexWrap: 'wrap',
          flexWrap: 'nowrap',
          width: '100%',
          maxWidth: '1200px',
          overflow: 'hidden',
          padding: 0,
          minHeight: '500px',
          animation: 'fadeInUp 0.6s ease-out'
        }}>

          {/* Left Side: Giant Image */}
          <div style={{
            flex: '0 0 500px',
            width: '500px',
            position: 'relative',
            minHeight: '500px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            overflow: 'hidden'
          }}>
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.first_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
              />
            ) : (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(57,255,20,0.05))',
                color: 'rgba(255,215,0,0.3)', fontSize: '9rem', fontWeight: 900, letterSpacing: '8px'
              }}>
                {(player.first_name?.charAt(0) || '') + (player.last_name?.charAt(0) || '')}
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', zIndex: 2, display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.5rem 1rem', fontSize: '1.2rem', fontWeight: 800, borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                {player.player_role || 'PLAYER'}
              </span>
              {player.auction_players?.some(ap => ap.is_icon) && (
                <span style={{ backgroundColor: '#f59e0b', color: '#000', padding: '0.5rem 1rem', fontSize: '1.2rem', fontWeight: 800, borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  ICON
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Details */}
          <div style={{ flex: '1 1 0', minWidth: '0', padding: '5rem 4rem', display: 'flex', flexDirection: 'column', justifyItems: 'center' }}>

            <h1 style={{ fontSize: '4.5rem', color: '#fff', textTransform: 'uppercase', lineHeight: 1.1, margin: '0 0 0.5rem 0', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
              {player.first_name} <br />
              <span style={{ color: 'var(--accent-green)' }}>{player.last_name}</span>
            </h1>

            <div style={{ width: '80px', height: '5px', background: 'var(--accent-gold)', margin: '2rem 0 3rem' }}></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>

              <div>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Batting Style</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-main)' }}>{player.batting_style || 'N/A'}</div>
              </div>

              <div>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Bowling Style</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-main)' }}>{player.bowling_style || 'N/A'}</div>
              </div>

              <div>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Age</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-main)' }}>{calculateAge(player.dob)} YRS</div>
              </div>

              <div>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Area / Village / City</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-main)' }}>{player.area || 'N/A'}</div>
              </div>
            </div>

            {/* <div style={{ marginTop: 'auto', paddingTop: '3rem' }}>
              <div style={{ padding: '1.5rem', background: 'rgba(57, 255, 20, 0.05)', borderLeft: '4px solid var(--accent-green)', display: 'inline-block' }}>
                 <div style={{ fontSize: '1.1rem', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem', fontWeight: 600 }}>Base Price</div>
                 <div style={{ fontSize: '4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>₹1,000</div>
              </div>
            </div> */}

          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PlayerProfilePage;
