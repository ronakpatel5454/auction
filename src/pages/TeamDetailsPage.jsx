import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate } from 'react-router-dom';

const TeamDetailsPage = () => {
    const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
    const [loading, setLoading] = useState(true);
    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [squads, setSquads] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        fetchData();
        
        const subscription = supabase
            .channel('team_updates_vertical')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, payload => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [isAuthenticated]);

    const fetchData = async () => {
        try {
            const { data: auctionData } = await supabase
                .from('auctions')
                .select('*')
                .in('status', ['registration_open', 'running'])
                .limit(1)
                .single();

            setActiveAuction(auctionData);

            if (auctionData) {
                const { data: tData } = await supabase.from('auction_teams').select('*').eq('auction_id', auctionData.id).order('team_name', { ascending: true });
                setTeams(tData || []);
                
                if (tData && tData.length > 0 && !selectedTeamId) {
                    setSelectedTeamId(tData[0].id);
                }

                const { data: apData } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id)
                    .not('team_id', 'is', null);

                const grouped = {};
                (tData || []).forEach(team => {
                    grouped[team.id] = (apData || []).filter(p => p.team_id === team.id);
                });
                setSquads(grouped);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) return <Navigate to="/admin" replace />;
    if (loading) return <Loader message="ORGANIZING TEAM ROSTERS..." />;

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const squad = selectedTeamId ? (squads[selectedTeamId] || []) : [];
    const icons = squad.filter(p => p.is_icon);
    const auctioned = squad.filter(p => !p.is_icon);
    const spent = squad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
    const maxBudget = activeAuction?.max_budget || 0;
    const remaining = maxBudget - spent;
    const percentSpent = (spent / maxBudget) * 100;

    return (
        <div className="flex-col min-h-screen">
            <div className="spotlight"></div>
            <PageHeader title="Team Roster & Purse" showLogos={false} />

            <main className="container" style={{ padding: '2rem 1rem', zIndex: 1, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <Link to="/admin" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>← Dashboard</Link>
                         <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.2rem' }}>{activeAuction?.auction_name || 'Auction Details'}</h2>
                    </div>
                    <Link to="/live-auction" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', background: 'var(--accent-gold)', fontSize: '0.9rem' }}>Live Bidding</Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', height: 'calc(100vh - 250px)', minHeight: '600px' }}>
                    
                    {/* Vertical Sidebar */}
                    <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', borderRight: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>SELECT TEAM</h3>
                        {teams.map(team => (
                            <button
                                key={team.id}
                                onClick={() => setSelectedTeamId(team.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.8rem',
                                    borderRadius: '8px',
                                    border: '1px solid transparent',
                                    background: selectedTeamId === team.id ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                                    borderColor: selectedTeamId === team.id ? 'var(--accent-gold)' : 'transparent',
                                    color: selectedTeamId === team.id ? 'var(--accent-gold)' : 'var(--text-main)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <img src={team.logo_url || 'https://via.placeholder.com/30'} alt="L" style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff' }} />
                                <span style={{ fontSize: '0.9rem', fontWeight: selectedTeamId === team.id ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.team_name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Right Side Content */}
                    <div className="glass-panel" style={{ padding: '2.5rem', overflowY: 'auto' }}>
                        {selectedTeam ? (
                            <div>
                                {/* Header with Stats */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                        <img src={selectedTeam.logo_url || 'https://via.placeholder.com/100'} alt="Team" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: '15px', background: '#fff', padding: '10px', border: '3px solid var(--accent-gold)', boxShadow: '0 0 20px rgba(255,215,0,0.2)' }} />
                                        <div>
                                            <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', margin: '0 0 0.5rem 0' }}>{selectedTeam.team_name}</h2>
                                            <div style={{ display: 'flex', gap: '2rem' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>SQUAD SIZE</span>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{squad.length} Players</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>PURSE SPENT</span>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>₹{spent.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Purse Progress Box */}
                                    <div style={{ width: '300px', background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Purse Remaining</span>
                                            <span style={{ fontWeight: 'bold', color: remaining < 0 ? '#ef4444' : 'var(--accent-green)' }}>₹{remaining.toLocaleString()}</span>
                                        </div>
                                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                            <div style={{ 
                                                height: '100%', 
                                                width: `${Math.min(percentSpent, 100)}%`, 
                                                background: remaining < 0 ? '#ef4444' : 'var(--accent-gold)',
                                                transition: 'width 0.5s ease-out'
                                            }}></div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                            {percentSpent.toFixed(1)}% of ₹{maxBudget.toLocaleString()} used
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Squad Lists */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                                    
                                    {/* Icon Players Listing */}
                                    <div>
                                        <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.5rem' }}>
                                            ICON PLAYERS <span>({icons.length})</span>
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {icons.length === 0 ? <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No icon players assigned.</p> : icons.map(p => (
                                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,215,0,0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,215,0,0.1)' }}>
                                                    <img src={p.players.photo_url || 'https://via.placeholder.com/50'} alt="Player" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{p.players.first_name} {p.players.last_name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>{p.players.player_role.toUpperCase()}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Auctioned Players Listing */}
                                    <div>
                                        <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                            AUCTIONED PLAYERS <span>({auctioned.length})</span>
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {auctioned.length === 0 ? <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No auction players bought yet.</p> : auctioned.map(p => (
                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1.2rem', borderRadius: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <img src={p.players.photo_url || 'https://via.placeholder.com/40'} alt="Player" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.players.first_name} {p.players.last_name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.players.player_role}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₹{p.sold_price?.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                Select a team from the left to view their squad and purse details.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeamDetailsPage;
