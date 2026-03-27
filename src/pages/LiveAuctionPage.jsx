import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate } from 'react-router-dom';

const LiveAuctionPage = () => {
    const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('bidding'); // 'bidding' or 'sold'

    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [activePlayer, setActivePlayer] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        fetchData();
        
        // Real-time subscription for bidding updates
        const subscription = supabase
            .channel('auction_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, payload => {
                fetchData(); // Simplest way to keep everything in sync
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [isAuthenticated]);

    const fetchData = async () => {
        try {
            // Fetch Active Auction
            const { data: auctionData, error: auctionError } = await supabase
                .from('auctions')
                .select('*')
                .in('status', ['registration_open', 'running'])
                .limit(1)
                .single();

            if (auctionError && auctionError.code !== 'PGRST116') throw auctionError;
            setActiveAuction(auctionData);

            if (auctionData) {
                // Fetch Teams
                const { data: tData } = await supabase.from('auction_teams').select('*').eq('auction_id', auctionData.id);
                setTeams(tData || []);

                // Fetch All Auction Players (to find active and sold)
                const { data: apData } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id)
                    .eq('approval_status', 'approved');
                
                setPlayers(apData || []);
                
                // Find currently active player
                const currentActive = apData?.find(p => p.auction_status === 'active');
                setActivePlayer(currentActive || null);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const startAuctionForPlayer = async (auctionPlayerId) => {
        try {
            setActionLoading(true);
            
            // Check if any other player is active
            if (activePlayer) {
                alert("Another player is already active. Please finish that auction first.");
                return;
            }

            const { error } = await supabase
                .from('auction_players')
                .update({ 
                    auction_status: 'active',
                    current_bid_price: activeAuction.base_price,
                    current_bid_team_id: null
                })
                .eq('id', auctionPlayerId);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            alert("Failed to start auction");
        } finally {
            setActionLoading(false);
        }
    };

    const placeBid = async (teamId) => {
        if (!activePlayer || actionLoading) return;
        
        try {
            setActionLoading(true);
            
            // Calculate next bid
            const currentBid = activePlayer.current_bid_price || 0;
            let nextBid = 0;
            
            if (!activePlayer.current_bid_team_id) {
                nextBid = activeAuction.base_price;
            } else {
                if (currentBid < 30000) {
                    nextBid = currentBid + 2000;
                } else {
                    nextBid = currentBid + 5000;
                }
            }

            // Check team budget
            const targetTeam = teams.find(t => t.id === teamId);
            const teamPlayers = players.filter(p => p.team_id === teamId);
            const spent = teamPlayers.reduce((acc, p) => acc + (p.sold_price || 0), 0);
            
            if (spent + nextBid > activeAuction.max_budget) {
                alert(`Insufficient budget! ${targetTeam.team_name} has only ${activeAuction.max_budget - spent} remaining.`);
                return;
            }

            const { error } = await supabase
                .from('auction_players')
                .update({ 
                    current_bid_price: nextBid,
                    current_bid_team_id: teamId,
                    previous_bid_price: activePlayer.current_bid_price || 0,
                    previous_bid_team_id: activePlayer.current_bid_team_id || null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            alert("Failed to place bid");
        } finally {
            setActionLoading(false);
        }
    };

    const undoLastBid = async () => {
        if (!activePlayer || actionLoading || !activePlayer.current_bid_team_id) return;
        if (!window.confirm("Undo the last bid?")) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({ 
                    current_bid_price: activePlayer.previous_bid_price || 0,
                    current_bid_team_id: activePlayer.previous_bid_team_id || null,
                    previous_bid_price: 0,
                    previous_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to undo bid.");
        } finally {
            setActionLoading(false);
        }
    };

    const cancelActiveAuction = async () => {
        if (!activePlayer || actionLoading) return;
        if (!window.confirm(`Stop auction for ${activePlayer.players.first_name} and return them to pending list?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({ 
                    auction_status: 'pending',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null,
                    previous_bid_price: 0,
                    previous_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to cancel auction.");
        } finally {
            setActionLoading(false);
        }
    };

    const finalizeSold = async () => {
        if (!activePlayer || !activePlayer.current_bid_team_id) return;
        if (!window.confirm(`Mark ${activePlayer.players.first_name} as SOLD for ${activePlayer.current_bid_price}?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({ 
                    auction_status: 'sold',
                    team_id: activePlayer.current_bid_team_id,
                    sold_price: activePlayer.current_bid_price
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            alert("Failed to finalize auction");
        } finally {
            setActionLoading(false);
        }
    };

    const markUnsold = async () => {
        if (!activePlayer) return;
        if (!window.confirm(`Mark ${activePlayer.players.first_name} as UNSOLD?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({ 
                    auction_status: 'unsold',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            alert("Failed to mark as unsold");
        } finally {
            setActionLoading(false);
        }
    };

    const revertPlayer = async (player) => {
        if (!window.confirm(`Are you sure you want to REVERT ${player.players.first_name} to pending status? This will unassign them from their team and refund the ₹${player.sold_price?.toLocaleString()}.`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({ 
                    auction_status: 'pending',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0, 
                    current_bid_team_id: null
                })
                .eq('id', player.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to revert player.");
        } finally {
            setActionLoading(false);
        }
    };

    if (!isAuthenticated) return <Navigate to="/admin" replace />;
    if (loading) return <Loader message="OPENING AUCTION STADIUM..." />;

    const pendingPlayers = players.filter(p => !['sold', 'unsold', 'active'].includes(p.auction_status) && !p.is_icon);
    const soldPlayers = players.filter(p => p.auction_status === 'sold');
    const winningTeam = activePlayer?.current_bid_team_id ? teams.find(t => t.id === activePlayer.current_bid_team_id) : null;

    return (
        <div className="flex-col min-h-screen">
            <div className="spotlight"></div>
            <PageHeader title="Live Auction Control" showLogos={false} />

            <main className="container" style={{ padding: '2rem 1rem', zIndex: 1, position: 'relative' }}>
                
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <button 
                        onClick={() => setActiveTab('bidding')}
                        className={`btn ${activeTab === 'bidding' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'bidding' ? 'var(--accent-gold)' : 'transparent' }}
                    >
                        LIVE BIDDING
                    </button>
                    <button 
                        onClick={() => setActiveTab('sold')}
                        className={`btn ${activeTab === 'sold' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'sold' ? 'var(--accent-gold)' : 'transparent' }}
                    >
                        SOLD PLAYERS ({soldPlayers.length})
                    </button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                        <Link to="/team-details" className="btn btn-outline" style={{ padding: '0.6rem 1rem' }}>Team Roster & Purse</Link>
                        <Link to="/admin" className="btn btn-outline" style={{ padding: '0.6rem 1rem' }}>Back to Admin</Link>
                    </div>
                </div>

                {activeTab === 'bidding' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                        
                        {/* Center Stage: Active Bidding */}
                        <div className="glass-panel" style={{ padding: '2.5rem', minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            {!activePlayer ? (
                                <div style={{ color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏏</div>
                                    <h3>No Active Auction</h3>
                                    <p>Select a player from the "Pending Players" list on the right to start bidding.</p>
                                </div>
                            ) : (
                                <div style={{ width: '100%' }}>
                                    <div className="badge badge-success" style={{ marginBottom: '2rem', fontSize: '1rem', padding: '0.5rem 1.5rem', borderRadius: '50px', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}>LIVE BIDDING</div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem', marginBottom: '3rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            <img 
                                                src={activePlayer.players.photo_url || 'https://via.placeholder.com/200'} 
                                                alt="Player" 
                                                style={{ width: 220, height: 220, objectFit: 'cover', borderRadius: '15px', border: '4px solid var(--accent-gold)', boxShadow: '0 0 30px rgba(255,215,0,0.3)' }} 
                                            />
                                            <div style={{ position: 'absolute', bottom: -15, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gold)', color: '#000', padding: '0.3rem 1rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                {activePlayer.players.player_role}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'left' }}>
                                            <h1 style={{ fontSize: '3rem', margin: 0, color: 'var(--text-main)' }}>{activePlayer.players.first_name} {activePlayer.players.last_name}</h1>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>State: {activePlayer.players.state} | Base Price: ₹{activeAuction.base_price}</p>
                                            
                                            <div style={{ marginTop: '2rem', background: 'rgba(255,215,0,0.1)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--accent-gold)' }}>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '2px' }}>Current Highest Bid</div>
                                                <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>₹ {activePlayer.current_bid_price?.toLocaleString() || activeAuction.base_price.toLocaleString()}</div>
                                                <div style={{ fontSize: '1.1rem', color: winningTeam ? 'var(--accent-green)' : '#ff4444' }}>
                                                    {winningTeam ? `By: ${winningTeam.team_name}` : 'No Bids Yet'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bidding Controls */}
                                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>PLACE BID FOR:</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                            {teams.map(team => (
                                                <button 
                                                    key={team.id}
                                                    onClick={() => placeBid(team.id)}
                                                    disabled={actionLoading || team.id === activePlayer.current_bid_team_id}
                                                    className="btn btn-outline"
                                                    style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        gap: '0.5rem', 
                                                        padding: '1rem',
                                                        borderColor: team.id === activePlayer.current_bid_team_id ? 'var(--accent-gold)' : 'var(--border-color)',
                                                        background: team.id === activePlayer.current_bid_team_id ? 'rgba(255,215,0,0.1)' : 'transparent'
                                                    }}
                                                >
                                                    <img src={team.logo_url || 'https://via.placeholder.com/40'} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                                                    <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{team.team_name}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem', justifyContent: 'center' }}>
                                            <button 
                                                onClick={undoLastBid} 
                                                disabled={actionLoading || !activePlayer.current_bid_team_id} 
                                                className="btn btn-outline" 
                                                style={{ padding: '1rem 2rem', color: '#f59e0b', borderColor: '#f59e0b', fontSize: '1.1rem' }}
                                            >
                                                ↩️ UNDO BID
                                            </button>
                                            <button 
                                                onClick={finalizeSold} 
                                                disabled={actionLoading || !activePlayer.current_bid_team_id} 
                                                className="btn btn-primary" 
                                                style={{ padding: '1rem 3rem', background: '#10b981', borderColor: '#10b981', fontSize: '1.1rem' }}
                                            >
                                                🔨 SOLD
                                            </button>
                                            <button 
                                                onClick={markUnsold} 
                                                disabled={actionLoading} 
                                                className="btn" 
                                                style={{ padding: '1rem 2rem', background: '#ef4444', color: '#fff', fontSize: '1.1rem' }}
                                            >
                                                ❌ UNSOLD
                                            </button>
                                            <button 
                                                onClick={cancelActiveAuction} 
                                                disabled={actionLoading} 
                                                className="btn btn-outline" 
                                                style={{ padding: '1rem 2rem', color: '#94a3b8', borderColor: '#94a3b8', fontSize: '1.1rem' }}
                                            >
                                                ⏹️ CANCEL
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar: Pending Players */}
                        <div className="glass-panel" style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
                            <h3 style={{ color: 'var(--accent-gold)', fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>PENDING PLAYERS ({pendingPlayers.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {pendingPlayers.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending players available.</p>
                                ) : (
                                    pendingPlayers.map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                                            <img src={p.players.photo_url || 'https://via.placeholder.com/40'} alt="P" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{p.players.first_name} {p.players.last_name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.players.player_role}</div>
                                            </div>
                                            <button 
                                                onClick={() => startAuctionForPlayer(p.id)} 
                                                disabled={actionLoading || activePlayer} 
                                                className="btn btn-outline" 
                                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                                            >
                                                Start
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Tab 2: Sold Players List */
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>SOLD PLAYERS REGISTRY</h3>
                        {soldPlayers.length === 0 ? (
                            <p className="text-muted text-center" style={{ padding: '3rem' }}>No players sold yet.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--accent-gold)' }}>
                                            <th style={{ padding: '1rem' }}>Player</th>
                                            <th style={{ padding: '1rem' }}>Role</th>
                                            <th style={{ padding: '1rem' }}>Sold To Team</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Sold Price</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {soldPlayers.map(p => {
                                            const team = teams.find(t => t.id === p.team_id);
                                            return (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <img src={p.players.photo_url || 'https://via.placeholder.com/40'} alt="P" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                                        <div>{p.players.first_name} {p.players.last_name}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>{p.players.player_role}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <img src={team?.logo_url || 'https://via.placeholder.com/25'} alt="L" style={{ width: 25, height: 25, objectFit: 'contain' }} />
                                                            {team?.team_name || 'Unknown Team'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-gold)' }}>₹ {p.sold_price?.toLocaleString()}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button 
                                                            onClick={() => revertPlayer(p)} 
                                                            disabled={actionLoading}
                                                            className="btn btn-outline" 
                                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#ff4444', borderColor: '#ff4444' }}
                                                        >
                                                            Revert
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default LiveAuctionPage;
