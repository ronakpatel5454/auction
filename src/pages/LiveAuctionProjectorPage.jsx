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
    const [showUnsoldOverlay, setShowUnsoldOverlay] = useState(false);
    const [lastUnsoldPlayer, setLastUnsoldPlayer] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
    const [isSmall, setIsSmall] = useState(window.innerWidth <= 600);
    const [imageError, setImageError] = useState(false);
    const [soldImageError, setSoldImageError] = useState(false);
    const [unsoldImageError, setUnsoldImageError] = useState(false);

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
            const { data: auctionData } = await supabase
                .from('auctions')
                .select('*')
                .in('status', ['registration_open', 'running'])
                .order('created_at', { ascending: false })
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
                const { new: updatedPlayer, eventType } = payload;

                if (updatedPlayer.auction_status === 'sold') {
                    handleSoldEvent(updatedPlayer);
                } else if (updatedPlayer.auction_status === 'unsold') {
                    handleUnsoldEvent(updatedPlayer);
                } else {
                    // For bidding updates or new active player, refresh everything to ensure joined data is correct
                    fetchData();
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
    }, []);

    useEffect(() => {
        setImageError(false);
    }, [activePlayer?.id]);

    useEffect(() => {
        setSoldImageError(false);
    }, [lastSoldPlayer?.id]);

    useEffect(() => {
        setUnsoldImageError(false);
    }, [lastUnsoldPlayer?.id]);

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
                {!activePlayer && !showSoldOverlay && !showUnsoldOverlay ? (
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
                                        src={activePlayer.players.photo_url}
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
                        </div>
                    </div>
                )}
            </div>

            {/* SOLD Overlay */}
            {showSoldOverlay && lastSoldPlayer && (
                // ...existing sold overlay code (omitted for brevity in replacement but I will include it full)
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'radial-gradient(circle at center, rgba(16,24,39,0.98) 0%, #050a10 100%)',
                    zIndex: 1000,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)',
                    border: 'clamp(6px, 1.5vw, 15px) solid #ffd700',
                    overflowY: 'auto',
                    padding: 'clamp(16px, 3vw, 40px)',
                    boxSizing: 'border-box',
                }}>
                    {/* Fireworks */}
                    <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className={`fw-${i}`} style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', opacity: 0 }} />
                        ))}
                    </div>

                    <div style={{
                        fontSize: 'clamp(1rem, 3.5vw, 3rem)', color: '#fff',
                        textTransform: 'uppercase', letterSpacing: 'clamp(2px, 1vw, 12px)',
                        marginBottom: 'clamp(4px, 1vh, 12px)',
                        position: 'relative', zIndex: 2,
                        animation: 'slideUp 1s ease-out', textAlign: 'center',
                    }}>
                        Congratulations!
                    </div>

                    <div style={{
                        fontSize: 'clamp(3.5rem, 14vw, 12rem)', fontWeight: 900,
                        color: '#ffd700', textShadow: '0 0 30px rgba(255,215,0,0.5)',
                        transform: 'rotate(-3deg)',
                        marginBottom: 'clamp(12px, 2vh, 32px)',
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
                        gap: isSmall ? '16px' : 'clamp(16px, 4vw, 60px)',
                        textAlign: isSmall ? 'center' : 'left',
                        background: 'rgba(255,255,255,0.05)',
                        padding: isSmall ? '24px 16px' : 'clamp(16px, 4vh, 60px)',
                        borderRadius: 'clamp(12px, 2vw, 30px)',
                        border: '2px solid rgba(255,215,0,0.4)',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                        position: 'relative', zIndex: 2,
                        animation: 'scaleUp 1s 0.3s both',
                        maxWidth: '90%', width: '100%',
                    }}>
                        <div style={{ position: 'relative' }}>
                            {/* Player Number Badge for SOLD Overlay */}
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
                                src={lastSoldPlayer.players.photo_url}
                                alt="Sold"
                                onError={() => setSoldImageError(true)}
                                style={{
                                    width: isSmall ? 'clamp(100px, 40vw, 180px)' : 'clamp(100px, 20vw, 400px)',
                                    height: isSmall ? 'clamp(100px, 40vw, 180px)' : 'clamp(100px, 20vw, 400px)',
                                    borderRadius: '50%',
                                    border: 'clamp(4px, 1vw, 12px) solid #39ff14',
                                    objectFit: 'cover',
                                    boxShadow: '0 0 40px rgba(57,255,20,0.3)',
                                    flexShrink: 0,
                                }}
                            />
                        ) : (
                            <div style={{
                                width: isSmall ? 'clamp(100px, 40vw, 180px)' : 'clamp(100px, 20vw, 400px)',
                                height: isSmall ? 'clamp(100px, 40vw, 180px)' : 'clamp(100px, 20vw, 400px)',
                                borderRadius: '50%',
                                border: 'clamp(4px, 1vw, 12px) solid #39ff14',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, rgba(57,255,20,0.1), rgba(255,255,255,0.05))',
                                color: 'rgba(57,255,20,0.3)',
                                fontSize: isSmall ? 'clamp(2rem, 8vw, 4rem)' : 'clamp(4rem, 10vw, 10rem)',
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
                                fontSize: isSmall ? 'clamp(1.2rem, 5vw, 2rem)' : 'clamp(1.3rem, 4.5vw, 5rem)',
                                fontWeight: 'bold', color: '#fff', wordBreak: 'break-word',
                            }}>
                                {lastSoldPlayer.players.first_name} {lastSoldPlayer.players.last_name}
                            </div>
                            <div style={{
                                fontSize: isSmall ? 'clamp(1.2rem, 5vw, 2rem)' : 'clamp(1.4rem, 4vw, 4.5rem)',
                                color: '#ffd700', fontWeight: 900,
                            }}>
                                ₹ {lastSoldPlayer.sold_price.toLocaleString()}
                            </div>
                            <div style={{
                                fontSize: isSmall ? 'clamp(0.8rem, 3vw, 1.2rem)' : 'clamp(0.9rem, 2vw, 2.2rem)',
                                color: 'rgba(255,255,255,0.6)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 'clamp(8px, 1.5vw, 20px)',
                                marginBottom: 'clamp(8px, 1.5vh, 20px)'
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
                                gap: 'clamp(8px, 1.5vw, 24px)',
                                flexWrap: 'wrap',
                            }}>
                                {soldTeam?.logo_url && (
                                    <img src={soldTeam.logo_url} alt="Team" style={{
                                        width: isSmall ? 'clamp(28px, 8vw, 50px)' : 'clamp(32px, 8vw, 100px)',
                                        height: isSmall ? 'clamp(28px, 8vw, 50px)' : 'clamp(32px, 8vw, 100px)',
                                        objectFit: 'contain',
                                    }} />
                                )}
                                <div style={{
                                    fontSize: isSmall ? 'clamp(1.2rem, 5vw, 2rem)' : 'clamp(1.3rem, 4vw, 4.5rem)',
                                    fontWeight: 900, color: '#39ff14', wordBreak: 'break-word',
                                }}>
                                    {soldTeam?.team_name}
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
                    overflowY: 'auto',
                    padding: 'clamp(16px, 3vw, 40px)',
                    boxSizing: 'border-box',
                }}>
                    <div style={{
                        fontSize: 'clamp(1rem, 3.5vw, 3rem)', color: '#fff',
                        textTransform: 'uppercase', letterSpacing: 'clamp(2px, 1vw, 12px)',
                        marginBottom: 'clamp(4px, 1vh, 12px)',
                        position: 'relative', zIndex: 2,
                        animation: 'slideUp 1s ease-out', textAlign: 'center',
                    }}>
                        Better Luck Next Time!
                    </div>

                    <div style={{
                        fontSize: 'clamp(3.5rem, 14vw, 12rem)', fontWeight: 900,
                        color: '#ff4444', textShadow: '0 0 30px rgba(255,68,68,0.5)',
                        transform: 'rotate(-3deg)',
                        marginBottom: 'clamp(12px, 2vh, 32px)',
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
                        gap: isSmall ? '16px' : 'clamp(16px, 4vw, 60px)',
                        textAlign: isSmall ? 'center' : 'left',
                        background: 'rgba(255,255,255,0.05)',
                        padding: isSmall ? '30px 20px' : 'clamp(20px, 4vh, 70px)',
                        borderRadius: 'clamp(12px, 2vw, 30px)',
                        border: '2px solid rgba(255,68,68,0.4)',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                        position: 'relative', zIndex: 2,
                        animation: 'scaleUp 1s 0.3s both',
                        maxWidth: '85%', width: '100%',
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
                                src={lastUnsoldPlayer.players.photo_url}
                                alt="Unsold"
                                onError={() => setUnsoldImageError(true)}
                                style={{
                                    width: isSmall ? 'clamp(100px, 40vw, 180px)' : 'clamp(100px, 20vw, 400px)',
                                    height: isSmall ? 'clamp(100px, 40vw, 180px)' : 'clamp(100px, 20vw, 400px)',
                                    borderRadius: '50%',
                                    border: 'clamp(4px, 1vw, 12px) solid #94a3b8',
                                    objectFit: 'cover',
                                    boxShadow: '0 0 40px rgba(148,163,184,0.2)',
                                    flexShrink: 0,
                                    filter: 'grayscale(0.5)'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: isSmall ? 'clamp(100px, 40vw, 180px)' : 'clamp(100px, 20vw, 400px)',
                                height: isSmall ? 'clamp(100px, 40vw, 180px)' : 'clamp(100px, 20vw, 400px)',
                                borderRadius: '50%',
                                border: 'clamp(4px, 1vw, 12px) solid #94a3b8',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, rgba(255,68,68,0.1), rgba(255,255,255,0.05))',
                                color: 'rgba(255,68,68,0.3)',
                                fontSize: isSmall ? 'clamp(2rem, 8vw, 4rem)' : 'clamp(4rem, 10vw, 10rem)',
                                fontWeight: 900,
                                boxShadow: '0 0 40px rgba(255,68,68,0.1)',
                                flexShrink: 0,
                            }}>
                                {(lastUnsoldPlayer.players.first_name?.charAt(0) || '') + (lastUnsoldPlayer.players.last_name?.charAt(0) || '')}
                            </div>
                        )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vh, 20px)', minWidth: 0 }}>
                            <div style={{
                                fontSize: isSmall ? 'clamp(1.5rem, 6vw, 2.5rem)' : 'clamp(1.5rem, 5vw, 6rem)',
                                fontWeight: 'bold', color: '#fff', wordBreak: 'break-word',
                            }}>
                                {lastUnsoldPlayer.players.first_name} {lastUnsoldPlayer.players.last_name}
                            </div>
                            <div style={{
                                fontSize: isSmall ? 'clamp(0.9rem, 3.5vw, 1.3rem)' : 'clamp(1rem, 2.5vw, 3rem)',
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
                                fontSize: isSmall ? 'clamp(0.8rem, 3vw, 1rem)' : 'clamp(0.9rem, 1.5vw, 2rem)',
                                color: 'rgba(255,255,255,0.5)',
                                fontStyle: 'italic',
                                marginTop: '10px'
                            }}>
                                This player may come back for accelerated auction.
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
            `}</style>
        </div>
    );
};

export default LiveAuctionProjectorPage;
