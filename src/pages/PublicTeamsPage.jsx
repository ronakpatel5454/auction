import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { Link, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl } from '../services/cloudinary';
import { generateAllTeamsPDF } from '../services/pdfGenerator';
import { Download } from 'lucide-react';

const PublicTeamsPage = () => {
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code');
    const [allAuctions, setAllAuctions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [squads, setSquads] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchData = async (auctionId = null) => {
        try {
            let currentAuctionId = auctionId;
            if (!currentAuctionId) {
                if (auctionCode) {
                    const { data: auctionData } = await supabase
                        .from('auctions')
                        .select('*')
                        .eq('auction_code', auctionCode)
                        .maybeSingle();
                    
                    if (!auctionData) return;
                    setActiveAuction(auctionData);
                    currentAuctionId = auctionData.id;
                } else {
                    setActiveAuction(null);
                    const { data, error } = await supabase
                        .from('auctions')
                        .select('*')
                        .neq('status', 'draft')
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    setAllAuctions(data || []);
                    return;
                }
            }

            const { data: tData } = await supabase
                .from('auction_teams')
                .select('*')
                .eq('auction_id', currentAuctionId)
                .order('team_name', { ascending: true });

            setTeams(tData || []);
            
            if (tData && tData.length > 0) {
                setSelectedTeamId(prev => prev || tData[0].id);
            }

            const { data: apData } = await supabase
                .from('auction_players')
                .select('*, players(*)')
                .eq('auction_id', currentAuctionId)
                .not('team_id', 'is', null);

            const grouped = {};
            (tData || []).forEach(team => {
                grouped[team.id] = (apData || []).filter(p => p.team_id === team.id);
            });
            setSquads(grouped);
        } catch (err) {
            console.error("Error fetching teams:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [auctionCode]);

    useEffect(() => {
        if (!activeAuction?.id) return;
        
        const subscription = supabase
            .channel('projector_team_updates_v2')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, payload => {
                const { new: updatedPlayer, old: oldPlayer } = payload;
                if (!updatedPlayer || !oldPlayer) {
                    fetchData(activeAuction?.id);
                    return;
                }
                const statusChanged = updatedPlayer.auction_status !== oldPlayer.auction_status;
                const teamChanged = updatedPlayer.team_id !== oldPlayer.team_id;
                if (statusChanged || teamChanged) {
                    fetchData(activeAuction?.id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [activeAuction?.id]);

    if (loading) return <Loader message="OPTIMIZING PROJECTOR VIEW..." />;

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const squad = selectedTeamId ? (squads[selectedTeamId] || []) : [];
    const icons = squad.filter(p => p.is_icon);
    const auctioned = squad.filter(p => !p.is_icon);
    const spent = squad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
    const maxBudget = activeAuction?.max_budget || 0;
    const remaining = maxBudget - spent;
    const percentSpent = (spent / maxBudget) * 100;

    return (
        <div className="flex-col min-h-screen" style={{ overflowX: 'hidden' }}>
            <div className="spotlight"></div>
            <PageHeader 
                title="AUCTION SQUADS" 
                subtitle={activeAuction ? `Projector View - ${activeAuction.auction_name}` : ''}
                showLogos={true} 
            />

            {activeAuction && teams.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', zIndex: 10, position: 'relative' }}>
                    <button 
                        onClick={() => generateAllTeamsPDF(activeAuction, teams, squads)}
                        className="btn"
                        style={{ 
                            padding: '0.6rem 1.5rem', 
                            background: 'var(--accent-green)', 
                            color: '#000', 
                            fontWeight: 'bold',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)',
                            border: 'none',
                            fontFamily: 'var(--font-heading)',
                            letterSpacing: '1px',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.2)';
                        }}
                    >
                        <Download size={16} /> DOWNLOAD TEAMS PDF
                    </button>
                </div>
            )}

            <main className="container" style={{ 
                flex: 1, 
                padding: isMobile ? '1rem' : '1rem 2rem 4rem', 
                zIndex: 1, 
                position: 'relative',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '1.5rem',
                minHeight: 'calc(100vh - 200px)',
                width: '100%',
                maxWidth: '100%'
            }}>
                
                {!activeAuction ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Select Tournament to View Squads</h3>
                            <p className="text-muted" style={{ marginBottom: 0 }}>Please select a tournament from the list below to view its teams and budgets.</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' }}>
                            {allAuctions.length === 0 ? (
                                <div className="glass-panel" style={{ padding: '3rem', gridColumn: '1 / -1', textAlign: 'center' }}>
                                    <p className="text-muted" style={{ margin: 0 }}>No tournaments found.</p>
                                </div>
                            ) : (
                                allAuctions.map(a => (
                                    <Link key={a.id} to={`/teams?code=${a.auction_code}`} className="glass-panel render-card" style={{ padding: '2rem 1.5rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ 
                                                padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase',
                                                background: a.status === 'running' ? 'rgba(239, 68, 68, 0.15)' : a.status === 'registration_open' ? 'rgba(57, 255, 20, 0.15)' : 'rgba(255,255,255,0.06)',
                                                color: a.status === 'running' ? '#f87171' : a.status === 'registration_open' ? 'var(--accent-green)' : 'var(--text-muted)'
                                            }}>
                                                {a.status === 'running' ? '🔴 Live' : a.status === 'registration_open' ? '🟢 Open' : '⚪ Ended'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{a.auction_code}</span>
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{a.auction_name}</h3>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {a.venue ? `📍 ${a.venue}` : ''}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.85rem', alignItems: 'center', gap: '0.25rem' }}>
                                            View Squads →
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Sidebar */}
                        <div className="glass-panel" style={{ 
                            flex: isMobile ? 'none' : '0 0 300px',
                            display: 'flex',
                            flexDirection: isMobile ? 'row' : 'column',
                            gap: '0.6rem',
                            padding: '1.2rem',
                            overflowX: isMobile ? 'auto' : 'hidden',
                            overflowY: isMobile ? 'hidden' : 'auto',
                            maxHeight: isMobile ? '110px' : 'calc(100vh - 220px)',
                            borderRight: isMobile ? 'none' : '1px solid var(--glass-border)',
                            scrollbarWidth: 'none'
                        }}>
                            {teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => setSelectedTeamId(team.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.8rem',
                                        padding: '0.8rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid transparent',
                                        background: selectedTeamId === team.id ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.03)',
                                        borderColor: selectedTeamId === team.id ? 'var(--accent-gold)' : 'transparent',
                                        color: selectedTeamId === team.id ? 'var(--accent-gold)' : 'var(--text-main)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease',
                                        minWidth: isMobile ? '180px' : '100%',
                                        boxShadow: selectedTeamId === team.id ? '0 0 15px rgba(255,215,0,0.1)' : 'none'
                                    }}
                                >
                                    <img src={team.logo_url || 'https://via.placeholder.com/35'} alt="Logo" style={{ width: 35, height: 35, borderRadius: '4px', background: '#fff', padding: '2px', objectFit: 'contain' }} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: selectedTeamId === team.id ? 'bold' : '600', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {team.team_name}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Detail Content Area */}
                        <div className="glass-panel" style={{ 
                            flex: 1, 
                            padding: isMobile ? '1.5rem' : '2.5rem', 
                            overflowY: 'auto',
                            maxHeight: isMobile ? 'none' : 'calc(100vh - 220px)',
                            animation: 'fadeInSlide 0.4s ease-out',
                            position: 'relative',
                            minWidth: 0 // Prevents grid overflow
                        }}>
                            {selectedTeam ? (
                                <div>
                                    {/* Responsive Header */}
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: isMobile ? 'column' : 'row',
                                        justifyContent: 'space-between', 
                                        alignItems: isMobile ? 'center' : 'flex-start', 
                                        marginBottom: '2.5rem', 
                                        borderBottom: '1px solid var(--glass-border)', 
                                        paddingBottom: '2.5rem',
                                        gap: '2rem'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '2rem', textAlign: isMobile ? 'center' : 'left', flex: 1 }}>
                                            <img 
                                                src={selectedTeam.logo_url || 'https://via.placeholder.com/150'} 
                                                alt="Team" 
                                                style={{ 
                                                    width: isMobile ? 120 : 150, 
                                                    height: isMobile ? 120 : 150, 
                                                    objectFit: 'contain', 
                                                    borderRadius: '15px', 
                                                    background: '#fff', 
                                                    padding: '10px', 
                                                    border: '3px solid var(--accent-gold)', 
                                                    boxShadow: '0 0 20px rgba(255,215,0,0.15)' 
                                                }} 
                                            />
                                            <div style={{ overflow: 'hidden' }}>
                                                <h2 style={{ 
                                                    fontSize: isMobile ? '2.2rem' : '3.2rem', 
                                                    color: 'var(--accent-gold)', 
                                                    margin: '0 0 0.8rem 0', 
                                                    lineHeight: 1, 
                                                    textTransform: 'uppercase',
                                                    wordBreak: 'break-word'
                                                }}>
                                                    {selectedTeam.team_name}
                                                </h2>
                                                <div style={{ display: 'flex', gap: '2rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Players</span>
                                                        <span style={{ fontSize: '1.6rem', fontWeight: '900' }}>{squad.length} / {activeAuction.max_players || 15}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Used</span>
                                                        <span style={{ fontSize: '1.6rem', fontWeight: '900' }}>₹{spent.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Purse Stats Box - Fix Overflow */}
                                        <div style={{ 
                                            width: isMobile ? '100%' : '320px', 
                                            background: 'rgba(0,0,0,0.3)', 
                                            padding: '1.5rem', 
                                            borderRadius: '15px', 
                                            border: '1px solid rgba(255,215,0,0.3)',
                                            flexShrink: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem'
                                        }}>
                                            <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '2px' }}>
                                                PURSE REMAINING
                                            </div>
                                            <div style={{ 
                                                fontSize: '2.5rem', 
                                                fontWeight: '900', 
                                                color: remaining < 0 ? '#ff4444' : 'var(--accent-green)', 
                                                lineHeight: 1,
                                                marginBottom: '0.5rem'
                                            }}>
                                                ₹{remaining.toLocaleString()}
                                            </div>
                                            <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                <div style={{ 
                                                    height: '100%', 
                                                    width: `${Math.min(percentSpent, 100)}%`, 
                                                    background: remaining < 0 ? '#ff4444' : 'linear-gradient(90deg, var(--accent-gold), var(--accent-green))',
                                                    transition: 'width 0.8s ease-out'
                                                }}></div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                                {percentSpent.toFixed(1)}% BUDGET CONSUMED
                                            </div>
                                        </div>
                                    </div>

                                    {/* Squad Content - Single Column on Smaller Screens, 2 columns on Wide */}
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: window.innerWidth < 1400 ? '1fr' : '1fr 1fr', 
                                        gap: '2.5rem' 
                                    }}>
                                        
                                        {/* Icons */}
                                        <div>
                                            <h4 style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'baseline', 
                                                color: 'var(--accent-gold)', 
                                                fontSize: '1.1rem', 
                                                textTransform: 'uppercase', 
                                                letterSpacing: '2px',
                                                marginBottom: '1.5rem', 
                                                borderBottom: '2px solid rgba(255,215,0,0.2)', 
                                                paddingBottom: '0.6rem' 
                                            }}>
                                                ICON PLAYERS <span style={{fontSize: '0.9rem'}}>({icons.length})</span>
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                                                {icons.length === 0 ? <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No icon players assigned.</p> : icons.map(p => (
                                                    <Link key={p.id} to={`/player/${p.players.id}`} state={{ from: '/teams' }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,215,0,0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,215,0,0.15)', textDecoration: 'none' }}>
                                                        <img src={getOptimizedImageUrl(p.players.photo_url, 150) || 'https://via.placeholder.com/60'} alt="X" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }} />
                                                        <div>
                                                            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#fff', textTransform: 'uppercase' }}>{p.players.first_name} {p.players.last_name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{p.players.player_role.toUpperCase()}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Auctioned */}
                                        <div>
                                            <h4 style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'baseline', 
                                                color: 'var(--text-main)', 
                                                fontSize: '1.1rem', 
                                                textTransform: 'uppercase', 
                                                letterSpacing: '2px',
                                                marginBottom: '1.5rem', 
                                                borderBottom: '2px solid var(--glass-border)', 
                                                paddingBottom: '0.6rem' 
                                            }}>
                                                PURCHASED SQUAD <span style={{fontSize: '0.9rem'}}>({auctioned.length})</span>
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                {auctioned.length === 0 ? <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No players bought yet.</p> : auctioned.map(p => (
                                                    <Link 
                                                        key={p.id} 
                                                        to={`/player/${p.players.id}`} 
                                                        state={{ from: '/teams' }} 
                                                        style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center', 
                                                            background: 'rgba(255,255,255,0.03)', 
                                                            padding: '1rem 1.2rem', 
                                                            borderRadius: '12px', 
                                                            textDecoration: 'none',
                                                            border: '1px solid transparent'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <img src={getOptimizedImageUrl(p.players.photo_url, 150) || 'https://via.placeholder.com/45'} alt="P" style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'cover' }} />
                                                            <div>
                                                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>{p.players.first_name} {p.players.last_name}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.players.player_role}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: 'var(--accent-gold)', fontSize: '1.1rem', fontWeight: '900' }}>₹{p.sold_price?.toLocaleString()}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    SELECT A TEAM TO VIEW ROSTER
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            <style>{`
                @keyframes fadeInSlide {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                * {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255,215,0,0.2) transparent;
                }
                ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(255,215,0,0.2);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default PublicTeamsPage;
