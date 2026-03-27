import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Loader } from '../components/Loader';

const LiveAuctionProjectorPage = () => {
    const [loading, setLoading] = useState(true);
    const [activeAuction, setActiveAuction] = useState(null);
    const [activePlayer, setActivePlayer] = useState(null);
    const [teams, setTeams] = useState([]);
    const [showSoldOverlay, setShowSoldOverlay] = useState(false);
    const [lastSoldPlayer, setLastSoldPlayer] = useState(null);

    useEffect(() => {
        fetchData();
        
        // Subscription for real-time updates
        const subscription = supabase
            .channel('projector_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, payload => {
                const { new: updatedPlayer } = payload;
                
                // 1. Handle "SOLD" event
                if (updatedPlayer.auction_status === 'sold') {
                    handleSoldEvent(updatedPlayer);
                }
                
                // 2. Immediate state update for active player (Price/Team changes)
                setActivePlayer(prev => {
                    if (prev && prev.id === updatedPlayer.id) {
                        // If it became inactive/sold, clear it from active view
                        if (updatedPlayer.auction_status !== 'active') return null;
                        // Otherwise update the bid data
                        return { ...prev, ...updatedPlayer };
                    }
                    // If we didn't have an active player and this one became active, or it's a new active player
                    if (updatedPlayer.auction_status === 'active') {
                         fetchData(); // Fetch to get the joined 'players' data
                    }
                    return prev;
                });

                // 3. Always check for auction status changes or new active players
                if (updatedPlayer.auction_status === 'active') {
                    fetchData();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

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
                const { data: tData } = await supabase.from('auction_teams').select('*').eq('auction_id', auctionData.id);
                setTeams(tData || []);

                const { data: apData } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id)
                    .eq('auction_status', 'active')
                    .limit(1)
                    .single();
                
                setActivePlayer(apData || null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSoldEvent = async (apRecord) => {
        // Fetch full player join for the overlay
        const { data } = await supabase
            .from('auction_players')
            .select('*, players(*)')
            .eq('id', apRecord.id)
            .single();
        
        if (data) {
            setLastSoldPlayer(data);
            setShowSoldOverlay(true);
            // Hide overlay after 8 seconds
            setTimeout(() => {
                setShowSoldOverlay(false);
                setLastSoldPlayer(null);
            }, 8000);
        }
    };

    if (loading) return <Loader message="CALIBRATING PROJECTOR..." />;

    const winningTeam = activePlayer?.current_bid_team_id ? teams.find(t => t.id === activePlayer.current_bid_team_id) : null;
    const soldTeam = lastSoldPlayer?.team_id ? teams.find(t => t.id === lastSoldPlayer.team_id) : null;

    return (
        <div style={{ backgroundColor: '#050a10', minHeight: '100vh', color: '#fff', position: 'relative', overflow: 'hidden', padding: '2vw' }}>
            
            {/* Animated Background Glows */}
            <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(57,255,20,0.05) 0%, transparent 70%)', zIndex: 0 }}></div>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '90vh' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4vh', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '2vh' }}>
                    <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem' }}>
                        {activeAuction?.auction_name || 'LIVE AUCTION'}
                    </h2>
                    <div style={{ padding: '0.5rem 2rem', background: '#ff4444', color: '#fff', fontWeight: 'bold', borderRadius: '4px', letterSpacing: '4px', animation: 'pulse 1.5s infinite' }}>LIVE</div>
                </div>

                {!activePlayer && !showSoldOverlay ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                         <div style={{ fontSize: '10rem', opacity: 0.1, marginBottom: '2rem' }}>🏏</div>
                         <h1 style={{ fontSize: '4rem', color: 'rgba(255,255,255,0.2)' }}>WAITING FOR NEXT PLAYER...</h1>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5vw', flex: 1, alignItems: 'center' }}>
                        
                        {/* Player Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <img 
                                    src={activePlayer?.players?.photo_url || 'https://via.placeholder.com/600'} 
                                    alt="Player" 
                                    style={{ width: '28vw', height: '28vw', objectFit: 'cover', borderRadius: '30px', border: '8px solid var(--accent-gold, #ffd700)', boxShadow: '0 0 80px rgba(255,215,0,0.2)' }} 
                                />
                                <div style={{ 
                                    position: 'absolute', bottom: '-1.5vh', left: '50%', transform: 'translateX(-50%)', 
                                    background: '#ffd700', color: '#000', padding: '1vh 2.5vw', borderRadius: '12px', 
                                    fontSize: '1.8rem', fontWeight: '900', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' 
                                }}>
                                    {activePlayer?.players?.player_role?.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Bid Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <h1 style={{ fontSize: '5rem', margin: '0 0 1vh 0', lineHeight: 1, textShadow: '0 8px 20px rgba(0,0,0,0.5)' }}>
                                {activePlayer?.players?.first_name} <br/>
                                <span style={{ color: '#ffd700' }}>{activePlayer?.players?.last_name}</span>
                            </h1>
                            <p style={{ fontSize: '1.8rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 4vh 0' }}>State: {activePlayer?.players?.state} | Base: ₹{activeAuction?.base_price?.toLocaleString()}</p>

                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,215,0,0.2)', padding: '3vh', borderRadius: '25px', boxShadow: '0 15px 40px rgba(0,0,0,0.4)' }}>
                                <div style={{ fontSize: '1.4rem', color: '#ffd700', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '0.5vh', fontWeight: 'bold' }}>Current Bid</div>
                                <div style={{ fontSize: '6rem', fontWeight: '900', margin: '0 0 1.5vh 0', fontFamily: 'monospace', color: winningTeam ? '#39ff14' : '#fff' }}>
                                    ₹ {activePlayer?.current_bid_price?.toLocaleString() || activeAuction?.base_price?.toLocaleString()}
                                </div>
                                
                                {winningTeam ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw', padding: '1.5vh', background: 'rgba(57,255,20,0.1)', borderRadius: '15px', border: '1px solid #39ff14' }}>
                                        <img src={winningTeam.logo_url || 'https://via.placeholder.com/80'} alt="Team" style={{ width: 70, height: 70, objectFit: 'contain' }} />
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#39ff14' }}>{winningTeam.team_name}</div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff4444', animation: 'flash 1s infinite' }}>OPENING BID...</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SOLD Overlay */}
            {showSoldOverlay && lastSoldPlayer && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                    background: 'rgba(5, 10, 16, 0.98)', zIndex: 1000, 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.5s ease-out',
                    border: '20px solid #ffd700'
                }}>
                    <div style={{ fontSize: '3rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '10px', marginBottom: '1vh' }}>Congratulations!</div>
                    <div style={{ fontSize: '10rem', fontWeight: '900', color: '#ffd700', textShadow: '0 0 100px rgba(255,215,0,0.5)', transform: 'rotate(-3deg)', marginBottom: '4vh' }}>SOLD!</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4vw', background: 'rgba(255,255,255,0.03)', padding: '5vh', borderRadius: '40px', border: '2px solid rgba(255,215,0,0.3)' }}>
                        <img 
                            src={lastSoldPlayer.players.photo_url || 'https://via.placeholder.com/300'} 
                            alt="Sold" 
                            style={{ width: '22vw', height: '22vw', borderRadius: '50%', border: '15px solid #39ff14', objectFit: 'cover' }} 
                        />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '5rem', fontWeight: 'bold', color: '#fff' }}>{lastSoldPlayer.players.first_name} {lastSoldPlayer.players.last_name}</div>
                            <div style={{ fontSize: '4rem', color: '#ffd700', fontWeight: '900' }}>₹ {lastSoldPlayer.sold_price.toLocaleString()}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginTop: '2.5rem' }}>
                                <img src={soldTeam?.logo_url || 'https://via.placeholder.com/100'} alt="Team" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                                <div style={{ fontSize: '4.5rem', fontWeight: '900', color: '#39ff14' }}>{soldTeam?.team_name}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes flash {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(1.2); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default LiveAuctionProjectorPage;
