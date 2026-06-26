import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader } from '../components/Loader';
import { getOptimizedImageUrl } from '../services/cloudinary';

const LiveAuctionProjectorPage = () => {
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code');
    const [allAuctions, setAllAuctions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [activeAuction, setActiveAuction] = useState(null);
    const [activePlayer, setActivePlayer] = useState(null);
    const [teams, setTeams] = useState([]);
    const [showSoldOverlay, setShowSoldOverlay] = useState(false);
    const [lastSoldPlayer, setLastSoldPlayer] = useState(null);
    const [showUnsoldOverlay, setShowUnsoldOverlay] = useState(false);
    const [lastUnsoldPlayer, setLastUnsoldPlayer] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
    const [isSmall, setIsSmall] = useState(window.innerWidth <= 600);
    const [imageError, setImageError] = useState(false);
    const [soldImageError, setSoldImageError] = useState(false);
    const [unsoldImageError, setUnsoldImageError] = useState(false);
    const processedEvents = useRef(new Set());

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 700);
            setIsSmall(window.innerWidth <= 600);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchData = async () => {
        try {
            console.log("Fetching fresh projector data...");
            let auctionData = null;
            if (auctionCode) {
                const { data } = await supabase
                    .from('auctions')
                    .select('*')
                    .eq('auction_code', auctionCode)
                    .maybeSingle();
                auctionData = data;
            } else {
                const { data, error } = await supabase
                    .from('auctions')
                    .select('*')
                    .neq('status', 'draft')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setAllAuctions(data || []);
                setActiveAuction(null);
                setTeams([]);
                setActivePlayer(null);
                return;
            }

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
                    .maybeSingle();

                setActivePlayer(apData || null);
            } else {
                setTeams([]);
                setActivePlayer(null);
            }
        } catch (err) {
            console.error("Projector fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSoldEvent = async (apRecord) => {
        const eventKey = `${apRecord.id}-sold`;
        if (processedEvents.current.has(eventKey)) {
            console.log("Duplicate sold event ignored for player:", apRecord.id);
            return;
        }
        processedEvents.current.add(eventKey);

        const { data } = await supabase
            .from('auction_players')
            .select('*, players(*)')
            .eq('id', apRecord.id)
            .single();

        if (data) {
            setLastSoldPlayer(data);
            setShowSoldOverlay(true);
            setTimeout(() => {
                setShowSoldOverlay(false);
                setLastSoldPlayer(null);
                fetchData(); // Sync setup for next player
            }, 8000);
        }
    };

    const handleUnsoldEvent = async (apRecord) => {
        const eventKey = `${apRecord.id}-unsold`;
        if (processedEvents.current.has(eventKey)) {
            console.log("Duplicate unsold event ignored for player:", apRecord.id);
            return;
        }
        processedEvents.current.add(eventKey);

        const { data } = await supabase
            .from('auction_players')
            .select('*, players(*)')
            .eq('id', apRecord.id)
            .single();

        if (data) {
            setLastUnsoldPlayer(data);
            setShowUnsoldOverlay(true);
            setTimeout(() => {
                setShowUnsoldOverlay(false);
                setLastUnsoldPlayer(null);
                fetchData(); // Sync setup for next player
            }, 8000);
        }
    };

    useEffect(() => {
        fetchData();

        // 1. Robust Realtime Subscription
        const channel = supabase
            .channel('projector_sync_channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_players'
            }, payload => {
                console.log('Realtime Player Event:', payload.eventType, payload.new?.auction_status);
                const { new: updatedPlayer, old: oldPlayer, eventType } = payload;

                if (updatedPlayer.auction_status === 'sold') {
                    handleSoldEvent(updatedPlayer);
                } else if (updatedPlayer.auction_status === 'unsold') {
                    handleUnsoldEvent(updatedPlayer);
                } else {
                    if (updatedPlayer.auction_status === 'active') {
                        // Clear event history for this player if they are put back to active
                        processedEvents.current.delete(`${updatedPlayer.id}-sold`);
                        processedEvents.current.delete(`${updatedPlayer.id}-unsold`);
                    }

                    if (
                        eventType === 'UPDATE' &&
                        updatedPlayer.auction_status === 'active' &&
                        oldPlayer && oldPlayer.auction_status === 'active'
                    ) {
                        // Update active player's bid details locally without fetching everything
                        setActivePlayer(prev => {
                            if (prev && prev.id === updatedPlayer.id) {
                                return {
                                    ...prev,
                                    current_bid_price: updatedPlayer.current_bid_price,
                                    current_bid_team_id: updatedPlayer.current_bid_team_id,
                                    previous_bid_price: updatedPlayer.previous_bid_price,
                                    previous_bid_team_id: updatedPlayer.previous_bid_team_id
                                };
                            }
                            fetchData(); // If ID doesn't match, reload to fetch joined player profile
                            return prev;
                        });
                    } else {
                        // For other updates (e.g. pending -> active), fetch fresh data
                        fetchData();
                    }
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auctions'
            }, () => {
                console.log('Realtime Auction Event triggered refresh');
                fetchData();
            })
            .subscribe((status, err) => {
                console.log('Realtime Status:', status);
                if (status === 'SUBSCRIPTION_ERROR') {
                    console.error('Realtime Subscription Error:', err);
                }
                if (status === 'SUBSCRIBED') {
                    // Refresh on successful subscription to catch any missed events during connect
                    fetchData();
                }
            });

        // 2. Visibility Change Listener (Auto-sync when tab focused)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab focused, syncing projector...');
                fetchData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 3. Heartbeat Sync (Backup in case events missed)
        const heartbeat = setInterval(() => {
            console.log('Heartbeat sync...');
            fetchData();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(heartbeat);
        };
    }, [auctionCode]);

    useEffect(() => {
        setImageError(false);
    }, [activePlayer?.id]);

    useEffect(() => {
        setSoldImageError(false);
    }, [lastSoldPlayer?.id]);

    useEffect(() => {
        setUnsoldImageError(false);
    }, [lastUnsoldPlayer?.id]);

    // Keyboard controls for testing SOLD / UNSOLD overlay animations manually
    // useEffect(() => {
    //     const handleKeyDown = (e) => {
    //         if (e.key === 's' || e.key === 'S') {
    //             console.log("Triggering mock SOLD overlay");
    //             setLastSoldPlayer({
    //                 player_number: 99,
    //                 sold_price: 1500000,
    //                 players: {
    //                     first_name: "Virat",
    //                     last_name: "Kohli",
    //                     photo_url: "",
    //                     batting_style: "Right-hand bat",
    //                     bowling_style: "Right-arm medium",
    //                     player_role: "Batsman"
    //                 },
    //                 team_id: teams[0]?.id || null
    //             });
    //             setShowSoldOverlay(true);
    //             setTimeout(() => {
    //                 setShowSoldOverlay(false);
    //             }, 8000);
    //         }
    //         if (e.key === 'u' || e.key === 'U') {
    //             console.log("Triggering mock UNSOLD overlay");
    //             setLastUnsoldPlayer({
    //                 player_number: 45,
    //                 players: {
    //                     first_name: "Rohit",
    //                     last_name: "Sharma",
    //                     photo_url: "",
    //                     batting_style: "Right-hand bat",
    //                     bowling_style: "Right-arm offbreak",
    //                     player_role: "Batsman"
    //                 }
    //             });
    //             setShowUnsoldOverlay(true);
    //             setTimeout(() => {
    //                 setShowUnsoldOverlay(false);
    //             }, 8000);
    //         }
    //     };
    //     window.addEventListener('keydown', handleKeyDown);
    //     return () => window.removeEventListener('keydown', handleKeyDown);
    // }, [teams]);

    if (loading) return <Loader message="CALIBRATING PROJECTOR..." />;

    const winningTeam = activePlayer?.current_bid_team_id
        ? teams.find(t => t.id === activePlayer.current_bid_team_id)
        : null;
    const soldTeam = lastSoldPlayer?.team_id
        ? teams.find(t => t.id === lastSoldPlayer.team_id)
        : null;

    return (
        <div style={{
            backgroundColor: '#050a10',
            minHeight: '100vh',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            padding: 'clamp(12px, 2vw, 32px)',
            boxSizing: 'border-box',
        }}>

            {/* Background Glows */}
            <div style={{
                position: 'absolute', top: '-20%', left: '-10%', borderRadius: '50%',
                zIndex: 0, pointerEvents: 'none',
                width: 'clamp(300px, 50vw, 600px)', height: 'clamp(300px, 50vw, 600px)',
                background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)',
            }} />
            <div style={{
                position: 'absolute', bottom: '-20%', right: '-10%', borderRadius: '50%',
                zIndex: 0, pointerEvents: 'none',
                width: 'clamp(400px, 60vw, 800px)', height: 'clamp(400px, 60vw, 800px)',
                background: 'radial-gradient(circle, rgba(57,255,20,0.05) 0%, transparent 70%)',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column',
                minHeight: 'calc(100vh - clamp(24px, 4vw, 64px))',
            }}>

                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '8px',
                    marginBottom: 'clamp(16px, 4vh, 40px)',
                    borderBottom: '2px solid rgba(255,255,255,0.1)',
                    paddingBottom: 'clamp(12px, 2vh, 24px)',
                }}>
                    <h2 style={{
                        margin: 0, textTransform: 'uppercase',
                        letterSpacing: 'clamp(2px, 0.8vw, 8px)',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 'clamp(0.75rem, 2vw, 1.5rem)',
                    }}>
                        {activeAuction?.auction_name || 'LIVE AUCTION'}
                    </h2>
                    <div
                        onClick={() => fetchData()}
                        style={{
                            padding: '0.4rem 1.2rem', background: '#ff4444', color: '#fff',
                            fontWeight: 'bold', borderRadius: '4px', letterSpacing: '4px',
                            fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
                            animation: 'pulse 1.5s infinite', whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}
                        title="Click to force sync"
                    >
                        LIVE
                    </div>
                </div>

                {/* Main Content */}
                {!activeAuction ? (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        maxWidth: '800px', margin: '0 auto', width: '100%',
                        padding: '2rem 1rem'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 215, 0, 0.2)',
                            borderRadius: '16px',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            width: '100%',
                            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)',
                            marginBottom: '2rem'
                        }}>
                            <h1 style={{
                                color: '#ffd700',
                                fontFamily: 'var(--font-heading)',
                                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                                margin: '0 0 1rem 0',
                                letterSpacing: '2px',
                                textTransform: 'uppercase'
                            }}>
                                Select Live Projector
                            </h1>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)' }}>
                                Choose an ongoing tournament to launch the real-time live auction projector screen.
                            </p>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '1.5rem',
                            width: '100%'
                        }}>
                            {allAuctions.length === 0 ? (
                                <div style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '12px',
                                    padding: '3rem',
                                    gridColumn: '1 / -1',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>No active tournaments found.</p>
                                </div>
                            ) : (
                                allAuctions.map(a => (
                                    <Link
                                        key={a.id}
                                        to={`/live-auction-projector?code=${a.auction_code}`}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '12px',
                                            padding: '1.5rem',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                            transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        className="projector-card-hover"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-5px)';
                                            e.currentTarget.style.borderColor = '#ffd700';
                                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(255, 215, 0, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                background: a.status === 'running' ? 'rgba(239, 68, 68, 0.15)' : a.status === 'registration_open' ? 'rgba(57, 255, 20, 0.15)' : 'rgba(255,255,255,0.06)',
                                                color: a.status === 'running' ? '#f87171' : a.status === 'registration_open' ? '#39ff14' : 'rgba(255,255,255,0.4)'
                                            }}>
                                                {a.status === 'running' ? '🔴 Live' : a.status === 'registration_open' ? '🟢 Open' : '⚪ Ended'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#ffd700', fontWeight: 'bold' }}>{a.auction_code}</span>
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{a.auction_name}</h3>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                            {a.venue ? `📍 ${a.venue}` : ''}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            marginTop: 'auto',
                                            color: '#39ff14',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            Launch Projector →
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                ) : !activePlayer && !showSoldOverlay && !showUnsoldOverlay ? (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', padding: '2rem',
                    }}>
                        <div style={{ fontSize: 'clamp(4rem, 15vw, 10rem)', opacity: 0.1, marginBottom: '2rem' }}>🏏</div>
                        <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 4rem)', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                            WAITING FOR NEXT TURN...
                        </h1>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                        gap: isMobile ? '20px' : 'clamp(20px, 5vw, 60px)',
                        flex: 1,
                        alignItems: isMobile ? 'start' : 'center',
                    }}>

                        {/* Player Photo Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                {/* Player Number Badge */}
                                {activePlayer?.player_number != null && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        background: 'var(--accent-gold)',
                                        color: '#000',
                                        padding: 'clamp(4px, 0.8vh, 8px) clamp(8px, 1.5vw, 16px)',
                                        borderRadius: 'clamp(4px, 0.8vw, 8px)',
                                        fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)',
                                        fontWeight: 900,
                                        zIndex: 10,
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                        border: '2px solid rgba(0,0,0,0.2)',
                                    }}>
                                        #{activePlayer.player_number}
                                    </div>
                                )}
                                {(activePlayer?.players?.photo_url && !imageError) ? (
                                    <img
                                        src={getOptimizedImageUrl(activePlayer.players.photo_url, 600)}
                                        alt="Player"
                                        onError={() => setImageError(true)}
                                        style={{
                                            width: 'auto',
                                            height: isMobile ? 'clamp(200px, 60vw, 350px)' : 'clamp(300px, 40vw, 600px)',
                                            maxWidth: '100%',
                                            objectFit: 'cover',
                                            borderRadius: 'clamp(12px, 2vw, 30px)',
                                            border: 'clamp(4px, 0.8vw, 8px) solid #ffd700',
                                            boxShadow: '0 0 80px rgba(255,215,0,0.2)',
                                            display: 'block',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: isMobile ? 'clamp(200px, 60vw, 350px)' : 'clamp(300px, 35vw, 500px)',
                                        height: isMobile ? 'clamp(200px, 60vw, 350px)' : 'clamp(300px, 35vw, 500px)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(57,255,20,0.05))',
                                        color: 'rgba(255,215,0,0.3)',
                                        fontSize: isMobile ? 'clamp(4rem, 15vw, 8rem)' : 'clamp(6rem, 15vw, 15rem)',
                                        fontWeight: 900,
                                        borderRadius: 'clamp(12px, 2vw, 30px)',
                                        border: 'clamp(4px, 0.8vw, 8px) solid #ffd700',
                                        boxShadow: '0 0 80px rgba(255,215,0,0.2)',
                                    }}>
                                        {(activePlayer?.players?.first_name?.charAt(0) || '') + (activePlayer?.players?.last_name?.charAt(0) || '')}
                                    </div>
                                )}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 'clamp(-10px, -1.5vh, -18px)',
                                    left: '50%', transform: 'translateX(-50%)',
                                    background: '#ffd700', color: '#000',
                                    padding: 'clamp(4px, 1vh, 10px) clamp(12px, 2.5vw, 28px)',
                                    borderRadius: 'clamp(6px, 1vw, 12px)',
                                    fontSize: isMobile ? 'clamp(0.65rem, 3vw, 1rem)' : 'clamp(0.7rem, 1.5vw, 1.8rem)',
                                    fontWeight: 900,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {activePlayer?.players?.player_role?.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Bid Info Column */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            color: '#ffd700',
                            paddingTop: 'clamp(20px, 3vh, 40px)',
                        }}>
                            <h1 style={{
                                fontSize: isMobile ? 'clamp(1.4rem, 6vw, 2.5rem)' : 'clamp(1.6rem, 4.5vw, 5rem)',
                                margin: '0 0 clamp(4px, 1vh, 12px) 0',
                                lineHeight: 1.2,
                                textShadow: '0 8px 20px rgba(0,0,0,0.5)',
                                wordBreak: 'break-word',
                            }}>
                                {activePlayer?.players?.first_name}{' '}
                                <span>{activePlayer?.players?.last_name}</span>
                            </h1>
                            <div style={{
                                fontSize: isMobile ? 'clamp(0.7rem, 3vw, 1rem)' : 'clamp(0.75rem, 1.5vw, 1.8rem)',
                                color: 'rgba(255,255,255,0.7)',
                                margin: '0 0 clamp(12px, 4vh, 40px) 0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'clamp(4px, 1vh, 8px)'
                            }}>
                                <div style={{ display: 'flex', gap: 'clamp(8px, 1.5vw, 20px)', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9em' }}>Batting Style:</span>
                                    <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{activePlayer?.players?.batting_style || 'N/A'}</span>
                                    <span style={{ opacity: 0.3 }}>|</span>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9em' }}>Bowling Style:</span>
                                    <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{activePlayer?.players?.bowling_style || 'N/A'}</span>
                                </div>
                                <div style={{ opacity: 0.5 }}>
                                    State: {activePlayer?.players?.state} | Base: ₹{activeAuction?.base_price?.toLocaleString()}
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '2px solid rgba(255,215,0,0.2)',
                                padding: 'clamp(12px, 3vh, 32px)',
                                borderRadius: 'clamp(12px, 2vw, 25px)',
                                boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                            }}>
                                <div style={{
                                    fontSize: isMobile ? 'clamp(0.6rem, 2.5vw, 0.9rem)' : 'clamp(0.7rem, 1.2vw, 1.4rem)',
                                    color: '#ffd700', textTransform: 'uppercase',
                                    letterSpacing: '4px',
                                    marginBottom: 'clamp(4px, 0.5vh, 10px)',
                                    fontWeight: 'bold',
                                }}>
                                    Current Bid
                                </div>
                                <div style={{
                                    fontSize: isMobile ? 'clamp(1.8rem, 8vw, 3rem)' : 'clamp(2rem, 7vw, 6rem)',
                                    fontWeight: 900,
                                    margin: '0 0 clamp(8px, 1.5vh, 20px) 0',
                                    fontFamily: 'monospace',
                                    color: winningTeam ? '#39ff14' : '#fff',
                                    wordBreak: 'break-all',
                                }}>
                                    ₹ {activePlayer?.current_bid_price?.toLocaleString() || activeAuction?.base_price?.toLocaleString()}
                                </div>

                                {winningTeam ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: 'clamp(8px, 1.5vw, 20px)',
                                        padding: 'clamp(8px, 1.5vh, 16px)',
                                        background: 'rgba(57,255,20,0.1)',
                                        borderRadius: 'clamp(8px, 1vw, 15px)',
                                        border: '1px solid #39ff14',
                                        flexWrap: 'wrap',
                                    }}>
                                        {winningTeam.logo_url && (
                                            <img src={winningTeam.logo_url} alt="Team" style={{
                                                width: 'clamp(28px, 5vw, 70px)',
                                                height: 'clamp(28px, 5vw, 70px)',
                                                objectFit: 'contain', flexShrink: 0,
                                            }} />
                                        )}
                                        <div style={{
                                            fontSize: isMobile ? 'clamp(0.9rem, 4vw, 1.4rem)' : 'clamp(1rem, 2.5vw, 2rem)',
                                            fontWeight: 'bold', color: '#39ff14',
                                        }}>
                                            {winningTeam.team_name}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        fontSize: isMobile ? 'clamp(0.9rem, 4vw, 1.4rem)' : 'clamp(1rem, 2.5vw, 2rem)',
                                        fontWeight: 'bold', color: '#ff4444',
                                        animation: 'flash 1s infinite',
                                    }}>
                                        OPENING BID...
                                    </div>
                                )}
                            </div>

                            {activePlayer?.current_bid_price >= 20000 && (
                                <div style={{
                                    marginTop: 'clamp(12px, 2vh, 24px)',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '2px solid rgba(255, 215, 0, 0.4)',
                                    padding: 'clamp(10px, 2vh, 20px)',
                                    borderRadius: 'clamp(12px, 2vw, 20px)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 'clamp(10px, 2vw, 20px)',
                                    animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both, goldGlowPulse 2s infinite ease-in-out',
                                    backdropFilter: 'blur(10px)',
                                }}>
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                    }}>
                                        <div style={{
                                            fontSize: isMobile ? 'clamp(0.9rem, 3.5vw, 1.3rem)' : 'clamp(1.1rem, 2vw, 1.8rem)',
                                            fontWeight: 900,
                                            color: '#ffd700',
                                            textShadow: '0 0 12px rgba(255,215,0,0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            marginBottom: '4px',
                                        }}>
                                            Sab Changa Si!
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? 'clamp(0.7rem, 2.5vw, 0.95rem)' : 'clamp(0.8rem, 1.2vw, 1.1rem)',
                                            color: 'rgba(255, 255, 255, 0.85)',
                                            lineHeight: 1.4,
                                        }}>
                                            The current bid is <span style={{ color: '#ffd700', fontWeight: 'bold' }}>₹{activePlayer.current_bid_price.toLocaleString()}</span>! 🔥
                                        </div>
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        <img
                                            src="https://media1.tenor.com/m/rcUlT6pAH9MAAAAd/jethalal-sab-changa-c.gif"
                                            alt="Jethalal Sab Changa C"
                                            style={{
                                                width: isMobile ? 'clamp(80px, 15vw, 120px)' : 'clamp(120px, 16vh, 160px)',
                                                height: isMobile ? 'clamp(80px, 15vw, 120px)' : 'clamp(120px, 16vh, 160px)',
                                                borderRadius: '12px',
                                                border: '2px solid #ffd700',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* SOLD Overlay */}
            {showSoldOverlay && lastSoldPlayer && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'radial-gradient(circle at center, rgba(16,24,39,0.98) 0%, #050a10 100%)',
                    zIndex: 1000,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)',
                    border: 'clamp(6px, 1.5vw, 15px) solid #ffd700',
                    overflowY: 'hidden',
                    padding: 'clamp(10px, 2vh, 24px)',
                    boxSizing: 'border-box',
                }}>
                    {/* Fireworks */}
                    <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className={`fw-${i}`} style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', opacity: 0 }} />
                        ))}
                    </div>

                    <div className="sold-details-container">
                        <div style={{
                            fontSize: 'clamp(1rem, 2.8vh, 2.2rem)', color: '#fff',
                            textTransform: 'uppercase', letterSpacing: 'clamp(2px, 1vw, 12px)',
                            marginBottom: 'clamp(2px, 0.5vh, 8px)',
                            position: 'relative', zIndex: 2,
                            animation: 'slideUp 1s ease-out', textAlign: 'center',
                        }}>
                            Congratulations!
                        </div>

                        <div style={{
                            fontSize: 'clamp(2.5rem, 9vh, 6.5rem)', fontWeight: 900,
                            color: '#ffd700', textShadow: '0 0 30px rgba(255,215,0,0.5)',
                            transform: 'rotate(-3deg)',
                            marginBottom: 'clamp(8px, 1.5vh, 20px)',
                            position: 'relative', zIndex: 2,
                            animation: 'bounceIn 1.2s cubic-bezier(0.36,0,0.66,-0.56) both',
                            textAlign: 'center', width: '100%',
                        }}>
                            SOLD!
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: isSmall ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(16px, 3vw, 40px)',
                            width: '100%',
                            maxWidth: '1200px',
                            zIndex: 2,
                            animation: 'scaleUp 1s 0.3s both',
                        }}>
                            {/* Rotating bat & dancing player animation & Tenor GIF */}
                            <div style={{ display: 'flex', flexDirection: isSmall ? 'column' : 'row', alignItems: 'center', gap: 'clamp(15px, 2.5vw, 30px)', flexShrink: 0 }}>
                                <div className="cricket-anim-sold-static-container" style={{
                                    width: 'clamp(180px, 25vh, 300px)',
                                    height: 'clamp(180px, 25vh, 300px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <svg width="100%" height="100%" viewBox="0 0 400 400" style={{ pointerEvents: 'none' }}>
                                        <defs>
                                            <linearGradient id="batWood" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#d97706" />
                                                <stop offset="50%" stopColor="#b45309" />
                                                <stop offset="100%" stopColor="#78350f" />
                                            </linearGradient>
                                            <linearGradient id="batGrip" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#ffd700" />
                                                <stop offset="100%" stopColor="#b45309" />
                                            </linearGradient>
                                            <radialGradient id="ballShade" cx="30%" cy="30%" r="70%">
                                                <stop offset="0%" stopColor="#ff6b6b" />
                                                <stop offset="70%" stopColor="#b91c1c" />
                                                <stop offset="100%" stopColor="#450a0a" />
                                            </radialGradient>
                                        </defs>
                                        <circle className="anim-shockwave" cx="200" cy="200" r="1" fill="none" stroke="#ffd700" strokeWidth="4" />
                                        <g className="anim-sparks" style={{ transformOrigin: '200px 200px' }}>
                                            <path d="M200,160 L200,130 M200,240 L200,270 M160,200 L130,200 M240,200 L270,200 M170,170 L150,150 M230,230 L250,250 M170,230 L150,250 M230,170 L250,150" stroke="#ffd700" strokeWidth="6" strokeLinecap="round" />
                                        </g>
                                        <g className="dancing-player-body" style={{ transformOrigin: '200px 220px' }}>
                                            <path d="M 188,220 Q 175,250 170,270" fill="none" stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round" className="dancing-leg-left" style={{ transformOrigin: '188px 220px' }} />
                                            <ellipse cx="166" cy="272" rx="8" ry="5" fill="#fff" />
                                            <path d="M 212,220 Q 225,250 230,270" fill="none" stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round" className="dancing-leg-right" style={{ transformOrigin: '212px 220px' }} />
                                            <ellipse cx="234" cy="272" rx="8" ry="5" fill="#fff" />
                                            <path d="M 180,165 L 220,165 L 215,225 L 185,225 Z" fill="#ffd700" stroke="#ffd700" strokeWidth="2" />
                                            <path d="M 180,175 L 217,200 L 215,210 L 182,185 Z" fill="#1e3a8a" />
                                            <text x="200" y="205" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">7</text>
                                            <path d="M 180,175 Q 150,160 140,185" fill="none" stroke="#ffd700" strokeWidth="8" strokeLinecap="round" />
                                            <circle cx="138" cy="188" r="6" fill="#fff" />
                                            <path d="M 220,175 Q 250,175 260,195" fill="none" stroke="#ffd700" strokeWidth="8" strokeLinecap="round" />
                                            <circle cx="262" cy="198" r="6" fill="#fff" />
                                            <g className="celebrating-bat" style={{ transformOrigin: '262px 198px' }}>
                                                <rect x="259" y="168" width="6" height="30" rx="2" fill="url(#batGrip)" />
                                                <path d="M 254,88 L 270,88 L 274,168 C 274,172 270,175 262,175 C 254,175 250,172 250,168 Z" fill="url(#batWood)" />
                                                <rect x="252" y="110" width="20" height="35" fill="#ffd700" opacity="0.8" />
                                            </g>
                                            <rect x="195" y="158" width="10" height="10" fill="#ffedd5" />
                                            <circle cx="200" cy="146" r="16" fill="#ffedd5" />
                                            <circle cx="194" cy="144" r="2" fill="#000" />
                                            <circle cx="206" cy="144" r="2" fill="#000" />
                                            <path d="M 193,151 Q 200,158 207,151" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />
                                            <path d="M 182,142 A 18,18 0 0,1 218,142 Z" fill="#1e3a8a" />
                                            <path d="M 215,142 L 230,145 L 230,149 L 215,148 Z" fill="#ffd700" />
                                        </g>
                                        <g className="confetti-group" style={{ transformOrigin: '200px 200px' }}>
                                            <circle cx="120" cy="150" r="4" fill="#ff0" />
                                            <circle cx="280" cy="150" r="4" fill="#0ff" />
                                            <circle cx="150" cy="100" r="3" fill="#f0f" />
                                            <circle cx="250" cy="100" r="3" fill="#ff0" />
                                            <circle cx="100" cy="220" r="5" fill="#39ff14" />
                                            <circle cx="300" cy="220" r="5" fill="#ff4444" />
                                        </g>
                                    </svg>
                                </div>
                                <img
                                    src="https://media1.tenor.com/m/Q9woRkqECoQAAAAd/strong.gif"
                                    alt="Strong Celebration"
                                    style={{
                                        width: 'clamp(220px, 30vh, 380px)',
                                        height: 'auto',
                                        aspectRatio: '1.40351',
                                        borderRadius: '16px',
                                        border: '4px solid var(--accent-gold)',
                                        boxShadow: '0 0 30px rgba(255,215,0,0.4)',
                                        objectFit: 'cover',
                                        flexShrink: 0
                                    }}
                                />
                            </div>

                            {/* Details Card */}
                            <div style={{
                                display: 'flex',
                                flexDirection: isSmall ? 'column' : 'row',
                                alignItems: 'center',
                                gap: isSmall ? '16px' : 'clamp(16px, 3vw, 40px)',
                                textAlign: isSmall ? 'center' : 'left',
                                background: 'rgba(255,255,255,0.05)',
                                padding: isSmall ? '16px 12px' : 'clamp(12px, 2vh, 32px)',
                                borderRadius: 'clamp(12px, 2vw, 30px)',
                                border: '2px solid rgba(255,215,0,0.4)',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                                maxWidth: '100%',
                                flex: 1,
                            }}>
                                <div style={{ position: 'relative' }}>
                                    {lastSoldPlayer?.player_number != null && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            left: '-8px',
                                            background: 'var(--accent-gold)',
                                            color: '#000',
                                            padding: 'clamp(3px, 0.6vh, 6px) clamp(8px, 1.2vw, 14px)',
                                            borderRadius: '50px',
                                            fontSize: 'clamp(0.7rem, 1vw, 1.1rem)',
                                            fontWeight: 900,
                                            zIndex: 10,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                            border: '2px solid #fff',
                                        }}>
                                            #{lastSoldPlayer.player_number}
                                        </div>
                                    )}
                                    {(lastSoldPlayer.players.photo_url && !soldImageError) ? (
                                        <img
                                            src={getOptimizedImageUrl(lastSoldPlayer.players.photo_url, 400)}
                                            alt="Sold"
                                            onError={() => setSoldImageError(true)}
                                            style={{
                                                width: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                                height: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                                borderRadius: '50%',
                                                border: 'clamp(3px, 0.6vw, 8px) solid #39ff14',
                                                objectFit: 'cover',
                                                boxShadow: '0 0 40px rgba(57,255,20,0.3)',
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                            height: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                            borderRadius: '50%',
                                            border: 'clamp(3px, 0.6vw, 8px) solid #39ff14',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'linear-gradient(135deg, rgba(57,255,20,0.1), rgba(255,255,255,0.05))',
                                            color: 'rgba(57,255,20,0.3)',
                                            fontSize: isSmall ? 'clamp(1.5rem, 5vh, 2.5rem)' : 'clamp(2.5rem, 7vh, 4.5rem)',
                                            fontWeight: 900,
                                            boxShadow: '0 0 40px rgba(57,255,20,0.3)',
                                            flexShrink: 0,
                                        }}>
                                            {(lastSoldPlayer.players.first_name?.charAt(0) || '') + (lastSoldPlayer.players.last_name?.charAt(0) || '')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.8vh, 12px)', minWidth: 0 }}>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(1.1rem, 3.8vh, 1.6rem)' : 'clamp(1.3rem, 4.5vh, 2.8rem)',
                                        fontWeight: 'bold', color: '#fff', wordBreak: 'break-word',
                                    }}>
                                        {lastSoldPlayer.players.first_name} {lastSoldPlayer.players.last_name}
                                    </div>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(1.1rem, 3.8vh, 1.6rem)' : 'clamp(1.4rem, 4.8vh, 3.2rem)',
                                        color: '#ffd700', fontWeight: 900,
                                    }}>
                                        ₹ {lastSoldPlayer.sold_price.toLocaleString()}
                                    </div>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(0.7rem, 2.2vh, 0.9rem)' : 'clamp(0.8rem, 2.5vh, 1.4rem)',
                                        color: 'rgba(255,255,255,0.6)',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        gap: 'clamp(8px, 1.5vw, 20px)',
                                        marginBottom: 'clamp(4px, 1vh, 12px)'
                                    }}>
                                        <span style={{ opacity: 0.5 }}>Batting:</span>
                                        <span>{lastSoldPlayer.players.batting_style}</span>
                                        <span style={{ opacity: 0.3 }}>|</span>
                                        <span style={{ opacity: 0.5 }}>Bowling:</span>
                                        <span>{lastSoldPlayer.players.bowling_style}</span>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: isSmall ? 'center' : 'flex-start',
                                        gap: 'clamp(8px, 1vw, 16px)',
                                        flexWrap: 'wrap',
                                    }}>
                                        {soldTeam?.logo_url && (
                                            <img src={soldTeam.logo_url} alt="Team" style={{
                                                width: isSmall ? 'clamp(20px, 4vh, 32px)' : 'clamp(30px, 6vh, 50px)',
                                                height: isSmall ? 'clamp(20px, 4vh, 32px)' : 'clamp(30px, 6vh, 50px)',
                                                objectFit: 'contain',
                                            }} />
                                        )}
                                        <div style={{
                                            fontSize: isSmall ? 'clamp(1rem, 3.5vh, 1.5rem)' : 'clamp(1.2rem, 4vh, 2.4rem)',
                                            fontWeight: 900, color: '#39ff14', wordBreak: 'break-word',
                                        }}>
                                            {soldTeam?.team_name}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UNSOLD Overlay */}
            {showUnsoldOverlay && lastUnsoldPlayer && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'radial-gradient(circle at center, rgba(31,41,55,0.98) 0%, #050a10 100%)',
                    zIndex: 1000,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)',
                    border: 'clamp(6px, 1.5vw, 15px) solid #ff4444',
                    overflowY: 'hidden',
                    padding: 'clamp(10px, 2vh, 24px)',
                    boxSizing: 'border-box',
                }}>
                    <div className="unsold-details-container">
                        <div style={{
                            fontSize: 'clamp(1rem, 2.8vh, 2.2rem)', color: '#fff',
                            textTransform: 'uppercase', letterSpacing: 'clamp(2px, 1vw, 12px)',
                            marginBottom: 'clamp(2px, 0.5vh, 8px)',
                            position: 'relative', zIndex: 2,
                            animation: 'slideUp 1s ease-out', textAlign: 'center',
                        }}>
                            Better Luck Next Time!
                        </div>

                        <div style={{
                            fontSize: 'clamp(2.5rem, 9vh, 6.5rem)', fontWeight: 900,
                            color: '#ff4444', textShadow: '0 0 30px rgba(255,68,68,0.5)',
                            transform: 'rotate(-3deg)',
                            marginBottom: 'clamp(8px, 1.5vh, 20px)',
                            position: 'relative', zIndex: 2,
                            animation: 'bounceIn 1.2s cubic-bezier(0.36,0,0.66,-0.56) both',
                            textAlign: 'center', width: '100%',
                        }}>
                            UNSOLD
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: isSmall ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(16px, 3vw, 40px)',
                            width: '100%',
                            maxWidth: '1200px',
                            zIndex: 2,
                            animation: 'scaleUp 1s 0.3s both',
                        }}>
                            {/* Wickets & sad walking cricketer SVG & Jethalal GIF */}
                            <div style={{ display: 'flex', flexDirection: isSmall ? 'column' : 'row', alignItems: 'center', gap: 'clamp(15px, 2.5vw, 30px)', flexShrink: 0 }}>
                                <div className="cricket-anim-unsold-static-container" style={{
                                    width: 'clamp(180px, 25vh, 300px)',
                                    height: 'clamp(180px, 25vh, 300px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <svg width="100%" height="100%" viewBox="0 0 400 400" style={{ pointerEvents: 'none' }}>
                                        <defs>
                                            <linearGradient id="stumpWood" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#cd853f" />
                                                <stop offset="50%" stopColor="#8b5a2b" />
                                                <stop offset="100%" stopColor="#5c3a21" />
                                            </linearGradient>
                                            <radialGradient id="redBallShade" cx="30%" cy="30%" r="70%">
                                                <stop offset="0%" stopColor="#ff4d4d" />
                                                <stop offset="70%" stopColor="#990000" />
                                                <stop offset="100%" stopColor="#3d0000" />
                                            </radialGradient>
                                        </defs>
                                        <circle className="anim-unsold-shockwave" cx="200" cy="180" r="1" fill="none" stroke="#ff4444" strokeWidth="4" />
                                        <g className="anim-stump-left" style={{ transformOrigin: '175px 260px' }}>
                                            <rect x="171" y="160" width="8" height="100" rx="3" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-stump-mid" style={{ transformOrigin: '200px 260px' }}>
                                            <rect x="196" y="160" width="8" height="100" rx="3" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-stump-right" style={{ transformOrigin: '225px 260px' }}>
                                            <rect x="221" y="160" width="8" height="100" rx="3" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-bail-left" style={{ transformOrigin: '185px 156px' }}>
                                            <rect x="170" y="154" width="28" height="6" rx="2" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-bail-right" style={{ transformOrigin: '215px 156px' }}>
                                            <rect x="202" y="154" width="28" height="6" rx="2" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-unsold-ball">
                                            <circle cx="0" cy="0" r="14" fill="url(#redBallShade)" />
                                            <path d="M -14,0 A 14,14 0 0,0 14,0" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2,2" />
                                        </g>
                                        <g className="sad-cricketer-walk" style={{ transformOrigin: '200px 220px' }}>
                                            <path d="M 188,220 Q 175,250 170,270" fill="none" stroke="#475569" strokeWidth="10" strokeLinecap="round" className="sad-leg-left" style={{ transformOrigin: '188px 220px' }} />
                                            <ellipse cx="166" cy="272" rx="8" ry="5" fill="#fff" />
                                            <path d="M 212,220 Q 225,250 230,270" fill="none" stroke="#475569" strokeWidth="10" strokeLinecap="round" className="sad-leg-right" style={{ transformOrigin: '212px 220px' }} />
                                            <ellipse cx="234" cy="272" rx="8" ry="5" fill="#fff" />
                                            <path d="M 180,165 L 220,165 L 215,225 L 185,225 Z" fill="#64748b" stroke="#64748b" strokeWidth="2" />
                                            <path d="M 180,175 L 217,200 L 215,210 L 182,185 Z" fill="#334155" />
                                            <text x="200" y="205" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">0</text>
                                            <path d="M 180,175 Q 165,155 180,148" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                                            <circle cx="180" cy="148" r="6" fill="#fff" />
                                            <path d="M 220,175 Q 235,210 240,220" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                                            <circle cx="240" cy="220" r="6" fill="#fff" />
                                            <g style={{ transformOrigin: '240px 220px', transform: 'rotate(25deg)' }}>
                                                <rect x="237" y="190" width="6" height="30" rx="2" fill="url(#batGrip)" />
                                                <path d="M 232,220 L 248,220 L 252,295 C 252,299 248,302 240,302 C 232,302 228,299 228,295 Z" fill="url(#batWood)" />
                                            </g>
                                            <rect x="195" y="158" width="10" height="10" fill="#ffedd5" />
                                            <circle cx="200" cy="146" r="16" fill="#ffedd5" />
                                            <path d="M 192,143 Q 195,145 198,143" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M 202,143 Q 205,145 208,143" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M 193,154 Q 200,148 207,154" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
                                            <path d="M 194,146 L 194,158" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3,3" strokeDashoffset="0" className="sad-tears" />
                                            <path d="M 206,146 L 206,158" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3,3" strokeDashoffset="0" className="sad-tears" />
                                            <path d="M 182,142 A 18,18 0 0,1 218,142 Z" fill="#334155" />
                                            <path d="M 215,142 L 230,145 L 230,149 L 215,148 Z" fill="#94a3b8" />
                                        </g>
                                    </svg>
                                </div>
                                <img
                                    src="https://media1.tenor.com/m/FqCZEtnZp10AAAAd/jethalal-jethalal-face-expression.gif"
                                    alt="Jethalal Sad Expression"
                                    style={{
                                        width: 'clamp(180px, 25vh, 300px)',
                                        height: 'auto',
                                        aspectRatio: '1',
                                        borderRadius: '16px',
                                        border: '4px solid #ff4444',
                                        boxShadow: '0 0 30px rgba(255,68,68,0.4)',
                                        objectFit: 'cover',
                                        flexShrink: 0
                                    }}
                                />
                            </div>

                            {/* Details Card */}
                            <div style={{
                                display: 'flex',
                                flexDirection: isSmall ? 'column' : 'row',
                                alignItems: 'center',
                                gap: isSmall ? '16px' : 'clamp(16px, 3vw, 40px)',
                                textAlign: isSmall ? 'center' : 'left',
                                background: 'rgba(255,255,255,0.05)',
                                padding: isSmall ? '16px 12px' : 'clamp(12px, 2vh, 32px)',
                                borderRadius: 'clamp(12px, 2vw, 30px)',
                                border: '2px solid rgba(255,68,68,0.4)',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                                maxWidth: '100%',
                                flex: 1,
                            }}>
                                <div style={{ position: 'relative' }}>
                                    {lastUnsoldPlayer?.player_number != null && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            left: '-8px',
                                            background: '#ff4444',
                                            color: '#fff',
                                            padding: 'clamp(3px, 0.6vh, 6px) clamp(8px, 1.2vw, 14px)',
                                            borderRadius: '50px',
                                            fontSize: 'clamp(0.7rem, 1vw, 1.1rem)',
                                            fontWeight: 900,
                                            zIndex: 10,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                            border: '2px solid #fff',
                                        }}>
                                            #{lastUnsoldPlayer.player_number}
                                        </div>
                                    )}
                                    {(lastUnsoldPlayer.players.photo_url && !unsoldImageError) ? (
                                        <img
                                            src={getOptimizedImageUrl(lastUnsoldPlayer.players.photo_url, 400)}
                                            alt="Unsold"
                                            onError={() => setUnsoldImageError(true)}
                                            style={{
                                                width: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                                height: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                                borderRadius: '50%',
                                                border: 'clamp(3px, 0.6vw, 8px) solid #94a3b8',
                                                objectFit: 'cover',
                                                boxShadow: '0 0 40px rgba(148,163,184,0.2)',
                                                flexShrink: 0,
                                                filter: 'grayscale(0.5)'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                            height: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                            borderRadius: '50%',
                                            border: 'clamp(3px, 0.6vw, 8px) solid #94a3b8',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'linear-gradient(135deg, rgba(255,68,68,0.1), rgba(255,255,255,0.05))',
                                            color: 'rgba(255,68,68,0.3)',
                                            fontSize: isSmall ? 'clamp(1.5rem, 5vh, 2.5rem)' : 'clamp(2.5rem, 7vh, 4.5rem)',
                                            fontWeight: 900,
                                            boxShadow: '0 0 40px rgba(255,68,68,0.1)',
                                            flexShrink: 0,
                                        }}>
                                            {(lastUnsoldPlayer.players.first_name?.charAt(0) || '') + (lastUnsoldPlayer.players.last_name?.charAt(0) || '')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.8vh, 12px)', minWidth: 0 }}>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(1.2rem, 4vh, 1.8rem)' : 'clamp(1.4rem, 4.5vh, 2.8rem)',
                                        fontWeight: 'bold', color: '#fff', wordBreak: 'break-word',
                                    }}>
                                        {lastUnsoldPlayer.players.first_name} {lastUnsoldPlayer.players.last_name}
                                    </div>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(0.8rem, 2.5vh, 1rem)' : 'clamp(0.9rem, 2.8vh, 1.5rem)',
                                        color: 'rgba(255,255,255,0.7)',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        gap: 'clamp(10px, 2vw, 30px)',
                                    }}>
                                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '4px' }}>{lastUnsoldPlayer.players.player_role}</span>
                                        <span style={{ opacity: 0.5 }}>|</span>
                                        <span style={{ color: '#ff4444' }}>BASE: ₹ {activeAuction?.base_price?.toLocaleString()}</span>
                                    </div>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(0.7rem, 2.2vh, 0.9rem)' : 'clamp(0.8rem, 2.5vh, 1.2rem)',
                                        color: 'rgba(255,255,255,0.5)',
                                        fontStyle: 'italic',
                                        marginTop: '10px'
                                    }}>
                                        This player may come back for accelerated auction.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyframe animations + firework positions (cannot be done inline) */}
            <style>{`
                @keyframes pulse {
                    0%   { transform: scale(1); opacity: 1; }
                    50%  { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes flash {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.3; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(1.05); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes explode {
                    0%   { transform: scale(1); opacity: 1; }
                    100% { transform: scale(30); opacity: 0; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
                @keyframes goldGlowPulse {
                    0%, 100% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); }
                    50%      { box-shadow: 0 0 45px rgba(255, 215, 0, 0.45); border-color: rgba(255, 215, 0, 0.9); }
                }
                @keyframes bounceIn {
                    0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                    50%  { transform: scale(1.1) rotate(20deg); opacity: 1; }
                    70%  { transform: scale(0.9) rotate(-5deg); }
                    100% { transform: scale(1) rotate(-3deg); }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.8); opacity: 0; }
                    to   { transform: scale(1); opacity: 1; }
                }
                .fw-0  { top: 20%; left: 20%; background: #ff0;    animation: explode 2.0s infinite; }
                .fw-1  { top: 70%; left: 10%; background: #f0f;    animation: explode 2.5s infinite 0.5s; }
                .fw-2  { top: 10%; left: 80%; background: #0ff;    animation: explode 2.2s infinite 1.0s; }
                .fw-3  { top: 80%; left: 85%; background: #39ff14; animation: explode 2.8s infinite 0.2s; }
                .fw-4  { top: 40%; left: 50%; background: #ff4444; animation: explode 2.4s infinite 0.7s; }
                .fw-5  { top: 15%; left: 45%; background: #fff;    animation: explode 2.1s infinite 1.2s; }
                .fw-6  { top: 85%; left: 30%; background: #ffd700; animation: explode 2.6s infinite 0.8s; }
                .fw-7  { top: 50%; left: 15%; background: #007bff; animation: explode 2.3s infinite 0.4s; }
                .fw-8  { top: 30%; left: 75%; background: #ff8c00; animation: explode 2.7s infinite 0.9s; }
                .fw-9  { top: 60%; left: 90%; background: #9400d3; animation: explode 2.5s infinite 0.1s; }
                .fw-10 { top:  5%; left:  5%; background: #adff2f; animation: explode 2.9s infinite 1.1s; }
                .fw-11 { top: 90%; left: 60%; background: #00ffff; animation: explode 2.4s infinite 0.6s; }

                /* Cricket SOLD cinematic animations */
                .cricket-anim-sold-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: 1005;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIntroCinematic 2.0s ease-out both;
                }

                @keyframes fadeIntroCinematic {
                    0% { opacity: 1; visibility: visible; }
                    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); visibility: hidden; }
                }

                /* Dancing player animations */
                .dancing-player-body {
                    animation: playerDance 0.8s ease-in-out infinite alternate;
                }

                @keyframes playerDance {
                    0% { transform: translateY(10px) scale(0.98) rotate(-3deg); }
                    100% { transform: translateY(-15px) scale(1.02) rotate(3deg); }
                }

                .celebrating-bat {
                    animation: spinBat 0.6s linear infinite;
                }

                @keyframes spinBat {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .dancing-leg-left {
                    animation: legDanceLeft 0.8s ease-in-out infinite alternate;
                }

                @keyframes legDanceLeft {
                    0% { transform: rotate(-10deg); }
                    100% { transform: rotate(15deg); }
                }

                .dancing-leg-right {
                    animation: legDanceRight 0.8s ease-in-out infinite alternate;
                }

                @keyframes legDanceRight {
                    0% { transform: rotate(10deg); }
                    100% { transform: rotate(-15deg); }
                }

                .confetti-group {
                    animation: confettiExplode 2.0s ease-out infinite;
                }

                @keyframes confettiExplode {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1.6); opacity: 0; }
                }

                .anim-bat-group {
                    animation: batSwing 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes batSwing {
                    0% { transform: rotate(-85deg); }
                    /* Contact point around 27% of 1.8s (approx 0.5s) */
                    27% { transform: rotate(5deg); }
                    40% { transform: rotate(15deg); }
                    70% { transform: rotate(45deg); opacity: 1; }
                    100% { transform: rotate(60deg); opacity: 0; }
                }

                .anim-ball-group {
                    animation: ballFlightSold 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes ballFlightSold {
                    0% { transform: translate(-150px, 320px) scale(1.4); }
                    /* Contact point at 0.5s */
                    27% { transform: translate(200px, 200px) scale(1); }
                    /* Flies high and away to top right */
                    60% { transform: translate(450px, -150px) scale(0.5); }
                    100% { transform: translate(600px, -300px) scale(0.2); opacity: 0; }
                }

                .anim-shockwave {
                    animation: glowShockwave 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes glowShockwave {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0); opacity: 1; stroke-width: 8px; }
                    70% { transform: scale(6); opacity: 0; stroke-width: 1px; }
                    100% { transform: scale(6); opacity: 0; }
                }

                .anim-sparks {
                    animation: sparkBurst 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes sparkBurst {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0.5); opacity: 1; }
                    60% { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1.8); opacity: 0; }
                }

                /* Cricket UNSOLD cinematic animations */
                .cricket-anim-unsold-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: 1005;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIntroCinematic 2.0s ease-out both;
                }

                .anim-unsold-ball {
                    animation: ballFlightUnsold 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes ballFlightUnsold {
                    0% { transform: translate(50px, -150px) scale(1.6); }
                    /* Contact point at 0.5s */
                    27% { transform: translate(200px, 175px) scale(1); }
                    /* Deflects down and right */
                    60% { transform: translate(260px, 280px) scale(0.8); }
                    100% { transform: translate(300px, 350px) scale(0.6); opacity: 0; }
                }

                .anim-unsold-shockwave {
                    animation: glowShockwaveUnsold 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes glowShockwaveUnsold {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0); opacity: 1; stroke-width: 8px; }
                    70% { transform: scale(5); opacity: 0; stroke-width: 1px; }
                    100% { transform: scale(5); opacity: 0; }
                }

                .anim-stump-left {
                    animation: stumpShatterLeft 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterLeft {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(-55deg) translate(-100px, 20px); opacity: 0.8; }
                }

                .anim-stump-mid {
                    animation: stumpShatterMid 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterMid {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(15deg) translate(20px, 80px); opacity: 0.8; }
                }

                .anim-stump-right {
                    animation: stumpShatterRight 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterRight {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(65deg) translate(120px, 10px); opacity: 0.8; }
                }

                .anim-bail-left {
                    animation: bailShatterLeft 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes bailShatterLeft {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(-280deg) translate(-120px, -180px); opacity: 0.5; }
                }

                .anim-bail-right {
                    animation: bailShatterRight 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                /* Sad cricketer crying animations in place next to stumps */
                .sad-cricketer-walk {
                    animation: sadBob 0.6s ease-in-out infinite alternate;
                    opacity: 1;
                }

                @keyframes sadBob {
                    0% { transform: translate(90px, 10px) scale(0.85) translateY(0); }
                    100% { transform: translate(90px, 10px) scale(0.85) translateY(8px); }
                }

                .sad-leg-left {
                    /* Stand still */
                }

                .sad-leg-right {
                    /* Stand still */
                }

                .sad-tears {
                    animation: dripTears 0.4s linear infinite;
                }

                @keyframes dripTears {
                    0% { stroke-dashoffset: 0; opacity: 0.3; }
                    50% { opacity: 1; }
                    100% { stroke-dashoffset: 8; opacity: 0.2; }
                }

                @keyframes bailShatterRight {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(320deg) translate(140px, -200px); opacity: 0.5; }
                }

                /* Fading in details container instantly with the overlay */
                .sold-details-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    animation: cardFadeInFromBelow 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
                }

                .unsold-details-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    animation: cardFadeInFromBelow 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
                }

                @keyframes cardFadeInFromBelow {
                    from {
                        opacity: 0;
                        transform: translateY(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default LiveAuctionProjectorPage;
