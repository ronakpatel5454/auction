import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import FilterBar from '../components/FilterBar';
import PlayerCard from '../components/PlayerCard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      var canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      var dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = error => reject(error);
    img.src = url;
  });
};

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

  const [pdfGroup, setPdfGroup] = useState('none');
  const [downloadingAll, setDownloadingAll] = useState(false);

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
          .select('id, auction_name, auction_logo, auction_date, venue')
          .in('status', ['registration_open', 'running'])
          .limit(1)
          .single();

        if (auctionError && auctionError.code !== 'PGRST116') throw auctionError;
        setActiveAuction(auctionData);

        if (auctionData) {
          // 1. Fetch approved auction_players mapping (with player_number)
          const { data: apData, error: apError } = await supabase
            .from('auction_players')
            .select('player_id, player_number')
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

            // 3. Merge player_number into each player, then sort by it
            const numberMap = {};
            apData.forEach(ap => { numberMap[ap.player_id] = ap.player_number; });
            extractedPlayers = (pData || []).map(p => ({
              ...p,
              player_number: numberMap[p.id] ?? null
            })).sort((a, b) => (a.player_number ?? 9999) - (b.player_number ?? 9999));
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

  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    window.location.reload();
  };

  const generatePDF = async (dataToExport, filename) => {
    const doc = new jsPDF();
    let startY = 15;

    if (activeAuction) {
      if (activeAuction.auction_logo) {
        try {
          const logoBase64 = await getBase64ImageFromURL(activeAuction.auction_logo);
          // Add image: addImage(imageData, format, x, y, width, height)
          doc.addImage(logoBase64, 'PNG', 14, 10, 25, 25);

          doc.setFontSize(18);
          doc.setFont(undefined, 'bold');
          doc.text(activeAuction.auction_name || 'Auction Details', 45, 18);

          doc.setFontSize(11);
          doc.setFont(undefined, 'normal');
          const dateStr = activeAuction.auction_date ? `Date: ${activeAuction.auction_date}` : '';
          const venueStr = activeAuction.venue ? `Venue: ${activeAuction.venue}` : '';
          doc.text(`${dateStr} ${venueStr ? ' | ' + venueStr : ''}`, 45, 25);

          doc.text("Players List", 45, 32);
          startY = 40;
        } catch (e) {
          console.error("Error loading logo for PDF", e);
          doc.setFontSize(18);
          doc.setFont(undefined, 'bold');
          doc.text(activeAuction.auction_name || 'Auction Details', 14, 20);
          doc.setFontSize(12);
          doc.setFont(undefined, 'normal');
          doc.text("Players List", 14, 28);
          startY = 35;
        }
      } else {
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(activeAuction.auction_name || 'Auction Details', 14, 20);
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        const dateStr = activeAuction.auction_date ? `Date: ${activeAuction.auction_date}` : '';
        const venueStr = activeAuction.venue ? `Venue: ${activeAuction.venue}` : '';
        if (dateStr || venueStr) {
          doc.text(`${dateStr} ${venueStr ? ' | ' + venueStr : ''}`, 14, 28);
          doc.text("Players List", 14, 36);
          startY = 44;
        } else {
          doc.text("Players List", 14, 28);
          startY = 36;
        }
      }
    } else {
      doc.setFontSize(16);
      doc.text('Players', 14, 15);
      startY = 25;
    }

    // Sort by player_number before generating PDF
    const sorted = [...dataToExport].sort((a, b) => (a.player_number ?? 9999) - (b.player_number ?? 9999));

    const tableColumn = ["Player No.", "Name", "Role", "Batting", "Bowling", "Area"];

    if (pdfGroup === 'none') {
      const tableRows = sorted.map((player) => [
        player.player_number != null ? `#${player.player_number}` : '-',
        `${player.first_name || ''} ${player.last_name || ''}`,
        player.player_role || '-',
        player.batting_style || '-',
        player.bowling_style || '-',
        player.area || '-'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        columnStyles: { 0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' } }
      });
    } else {
      const fieldMapping = {
        'area': 'area',
        'role': 'player_role'
      };
      const field = fieldMapping[pdfGroup] || pdfGroup;

      const grouped = sorted.reduce((acc, player) => {
        const key = player[field] || 'Unspecified';
        if (!acc[key]) acc[key] = [];
        acc[key].push(player);
        return acc;
      }, {});

      let currentY = startY;
      Object.keys(grouped).sort().forEach((groupName) => {
        const groupPlayers = grouped[groupName];

        const groupTitle = `${groupName.toUpperCase()} (${groupPlayers.length} Players)`;

        if (currentY > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          currentY = 15;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(groupTitle, 14, currentY);
        currentY += 5;

        const tableRows = groupPlayers.map((player) => [
          player.player_number != null ? `#${player.player_number}` : '-',
          `${player.first_name || ''} ${player.last_name || ''}`,
          player.player_role || '-',
          player.batting_style || '-',
          player.bowling_style || '-',
          player.area || '-'
        ]);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: currentY,
          margin: { top: 10 },
          styles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' } }
        });

        currentY = doc.lastAutoTable.finalY + 15;
      });
    }

    doc.save(filename);
  };

  const handleDownloadPDF = () => {
    generatePDF(players, `Approved_Players_${activeAuction?.auction_name?.replace(/ /g, '_') || 'List'}.pdf`);
  };

  const handleDownloadAllPDF = async () => {
    if (!activeAuction) return;
    setDownloadingAll(true);
    try {
      const { data: apData, error: apError } = await supabase
        .from('auction_players')
        .select('player_id, player_number')
        .eq('auction_id', activeAuction.id)
        .in('approval_status', ['approved', 'pending']);

      if (apError) throw apError;

      let allPlayersToExport = [];
      if (apData && apData.length > 0) {
        const playerIds = apData.map(ap => ap.player_id);
        const { data: pData, error: pError } = await supabase
          .from('players')
          .select('*')
          .in('id', playerIds);

        if (pError) throw pError;

        const numberMap = {};
        apData.forEach(ap => { numberMap[ap.player_id] = ap.player_number; });
        allPlayersToExport = (pData || []).map(p => ({
          ...p,
          player_number: numberMap[p.id] ?? null
        }));
      }

      await generatePDF(allPlayersToExport, `All_Registered_Players_${activeAuction?.auction_name?.replace(/ /g, '_') || 'List'}.pdf`);
    } catch (error) {
      console.error("Error fetching all players for PDF:", error);
      alert("Failed to download all players PDF.");
    } finally {
      setDownloadingAll(false);
    }
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginRight: 'auto', flexWrap: 'wrap' }}>
            <select
              value={pdfGroup}
              onChange={(e) => setPdfGroup(e.target.value)}
              className="input"
              style={{ padding: '0.45rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="none">No Grouping</option>
              <option value="area">Group by Area</option>
              <option value="role">Group by Role</option>
            </select>
            <button onClick={handleDownloadPDF} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}>
              Download PDF
            </button>
            <button onClick={handleDownloadAllPDF} disabled={downloadingAll} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: 'var(--accent-green)', color: '#000', fontWeight: 'bold' }}>
              {downloadingAll ? 'Downloading...' : 'Download All PDF'}
            </button>
          </div>
          <Link to="/admin" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Admin</Link>
          <Link to="/admin-players" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Manage Players</Link>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Logout</button>
        </div>

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
                title="No Players Yet"
                description="Players will appear here once they are registered by the admin."
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
