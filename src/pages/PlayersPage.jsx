import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import FilterBar from '../components/FilterBar';
import PlayerCard from '../components/PlayerCard';

const PlayersPage = () => {
  const [activeAuction, setActiveAuction] = useState(null);
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 20;

  const [filters, setFilters] = useState({
    player_role: '',
    batting_style: '',
    bowling_style: ''
  });

  // const [filterOptions, setFilterOptions] = useState({
  //   player_role: [],
  //   batting_style: [],
  //   bowling_style: []
  // });

  const filterOptions = {
    player_role: ['Batter', 'Bowler', 'All Rounder', 'Wicket Keeper'],
    batting_style: ['Right Hand', 'Left Hand'],
    bowling_style: ['Right Arm Fast', 'Right Arm Medium', 'Right Arm Spin', 'Left Arm Fast', 'Left Arm Spin', 'None']
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: auctionData, error: auctionError } = await supabase
          .from('auctions')
          .select('id, auction_name')
          .in('status', ['registration_open', 'running'])
          .limit(1)
          .single();

        if (auctionError && auctionError.code !== 'PGRST116') throw auctionError;
        setActiveAuction(auctionData);

        if (auctionData) {
          // 1. Fetch approved auction_players mapping
          const { data: apData, error: apError } = await supabase
            .from('auction_players')
            .select('player_id')
            .eq('auction_id', auctionData.id)
            .eq('approval_status', 'approved');

          if (apError) throw apError;

          let extractedPlayers = [];

          if (apData && apData.length > 0) {
            const playerIds = apData.map(ap => ap.player_id);

            // 2. Fetch actual player details
            const { data: pData, error: pError } = await supabase
              .from('players')
              .select('*')
              .in('id', playerIds);

            if (pError) throw pError;
            extractedPlayers = pData || [];
          }
          setPlayers(extractedPlayers);
          setFilteredPlayers(extractedPlayers);

          // setFilterOptions({
          //   player_role: [...new Set(extractedPlayers.map(p => p.player_role).filter(Boolean))],
          //   batting_style: [...new Set(extractedPlayers.map(p => p.batting_style).filter(Boolean))],
          //   bowling_style: [...new Set(extractedPlayers.map(p => p.bowling_style).filter(Boolean))]
          // });

        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    let result = [...players];
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) {
        result = result.filter(p => p[k] === newFilters[k]);
      }
    });
    setFilteredPlayers(result);
    setCurrentPage(1);
  };

  if (loading) return <Loader message="LOADING PLAYERS..." />;

  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + playersPerPage);

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader
        title="Auction Players"
        subtitle={activeAuction ? `Registered Players for ${activeAuction.auction_name}` : ''}
        showLogos={false}
      />

      <main className="container" style={{ flex: 1, padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
        {!activeAuction ? (
          <EmptyState
            title="No Active Auction"
            description="There is no active auction at the moment. Please check back later."
          />
        ) : (
          <>
            <FilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              options={filterOptions}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                  background: viewMode === 'grid' ? 'var(--accent-green)' : 'transparent',
                  color: viewMode === 'grid' ? '#000' : 'var(--text-main)',
                  border: '1px solid var(--accent-green)'
                }}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                  background: viewMode === 'list' ? 'var(--accent-green)' : 'transparent',
                  color: viewMode === 'list' ? '#000' : 'var(--text-main)',
                  border: '1px solid var(--accent-green)'
                }}
              >
                List
              </button>
            </FilterBar>

            {players.length === 0 ? (
              <EmptyState
                title="No Approved Players Yet"
                description="Players will appear here once they are registered and approved by the admin."
              />
            ) : filteredPlayers.length === 0 ? (
              <EmptyState
                title="No Players Found"
                description="No players match the selected filters. Try adjusting your criteria."
              />
            ) : (
              <>
                <div style={{
                  display: viewMode === 'grid' ? 'grid' : 'flex',
                  flexDirection: viewMode === 'grid' ? 'unset' : 'column',
                  gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'unset',
                  gap: viewMode === 'grid' ? '2rem' : '1rem'
                }}>
                  {paginatedPlayers.map(player => (
                    <PlayerCard key={player.id} player={player} viewMode={viewMode} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', gap: '1rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Previous
                    </button>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      className="btn btn-outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PlayersPage;
