import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { deleteFromCloudinary } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate } from 'react-router-dom';

const AdminPlayersPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [activeAuction, setActiveAuction] = useState(null);
  const [playersList, setPlayersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .in('status', ['registration_open', 'running'])
        .limit(1)
        .single();
        
      if (auctionError && auctionError.code !== 'PGRST116') throw auctionError;
      setActiveAuction(auctionData);

      if (auctionData) {
        // Fetch mappings
        const { data: apData, error: apError } = await supabase
          .from('auction_players')
          .select('*')
          .eq('auction_id', auctionData.id);

        if (apError) throw apError;

        if (apData && apData.length > 0) {
          const playerIds = apData.map(ap => ap.player_id);
          const { data: pData, error: pError } = await supabase
            .from('players')
            .select('*')
            .in('id', playerIds);
            
          if (pError) throw pError;
          
          // Merge
          const merged = apData.map(ap => {
            const playerDetails = pData.find(p => p.id === ap.player_id) || {};
            return {
              ...playerDetails,
              auction_player_id: ap.id,
              approval_status: ap.approval_status
            };
          });
          
          setPlayersList(merged);
        } else {
          setPlayersList([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (auctionPlayerId, newStatus) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('auction_players')
        .update({ approval_status: newStatus })
        .eq('id', auctionPlayerId);
        
      if (error) throw error;
      
      setPlayersList(prev => prev.map(p => p.auction_player_id === auctionPlayerId ? { ...p, approval_status: newStatus } : p));
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const deletePlayer = async (playerId, auctionPlayerId) => {
    if (!window.confirm("Are you sure you want to permanently delete this player?")) return;
    
    try {
      setActionLoading(true);
      
      const playerToDelete = playersList.find(p => p.id === playerId);
      if (playerToDelete) {
        if (playerToDelete.photo_url) {
          await deleteFromCloudinary(playerToDelete.photo_url);
        }
        if (playerToDelete.aadhar_card_url) {
          await deleteFromCloudinary(playerToDelete.aadhar_card_url);
        }
      }

      // 1. Delete from auction_players
      const { error: apError } = await supabase
        .from('auction_players')
        .delete()
        .eq('id', auctionPlayerId);
        
      if (apError) throw apError;
      
      // 2. Delete from players
      const { error: pError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);
        
      if (pError) throw pError;

      setPlayersList(prev => prev.filter(p => p.auction_player_id !== auctionPlayerId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete player');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    window.location.reload();
  };

  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  if (loading) return <Loader message="LOADING ADMIN PLAYERS..." />;

  const filteredList = playersList.filter(p => p.approval_status === activeTab);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

  const pendingCount = playersList.filter(p => p.approval_status === 'pending').length;
  const approvedCount = playersList.filter(p => p.approval_status === 'approved').length;
  const rejectedCount = playersList.filter(p => p.approval_status === 'rejected').length;

  const renderPlayerTable = (list) => (
    <div style={{ marginBottom: '1rem' }}>
      {list.length === 0 ? <p className="text-muted text-center" style={{ padding: '2rem' }}>No players found in this category.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Photo</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Name</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Role</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Mobile</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.auction_player_id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                  <td style={{ padding: '1rem' }}>
                    <img src={p.photo_url || 'https://via.placeholder.com/50'} alt="Player" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }} />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{p.first_name} {p.last_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.email}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{p.player_role}</td>
                  <td style={{ padding: '1rem' }}>{p.mobile}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {p.approval_status !== 'approved' && (
                      <button disabled={actionLoading} onClick={() => updateStatus(p.auction_player_id, 'approved')} className="btn" style={{ background: 'var(--accent-green)', color: '#000', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Approve</button>
                    )}
                    {p.approval_status !== 'rejected' && (
                      <button disabled={actionLoading} onClick={() => updateStatus(p.auction_player_id, 'rejected')} className="btn" style={{ background: '#f59e0b', color: '#000', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Reject</button>
                    )}
                    <button disabled={actionLoading} onClick={() => deletePlayer(p.id, p.auction_player_id)} className="btn" style={{ background: '#ef4444', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Player Management" showLogos={false} />
      
      <main className="container" style={{ padding: '2rem 1rem', zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Active Auction: {activeAuction ? activeAuction.auction_name : 'None'}</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/players" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>View Roster</Link>
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Admin</Link>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Logout</button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <button 
              onClick={() => { setActiveTab('pending'); setCurrentPage(1); }} 
              className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem' }}
            >
              Pending ({pendingCount})
            </button>
            <button 
              onClick={() => { setActiveTab('approved'); setCurrentPage(1); }} 
              className={`btn ${activeTab === 'approved' ? 'btn-primary' : 'btn-outline'}`}
              style={{ 
                padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem',
                color: activeTab === 'approved' ? '#000' : 'var(--accent-green)', 
                borderColor: 'var(--accent-green)',
                backgroundColor: activeTab === 'approved' ? 'var(--accent-green)' : 'transparent'
              }}
            >
              Approved ({approvedCount})
            </button>
            <button 
              onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }} 
              className={`btn ${activeTab === 'rejected' ? 'btn-primary' : 'btn-outline'}`}
              style={{ 
                padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem',
                color: activeTab === 'rejected' ? '#000' : '#f59e0b', 
                borderColor: '#f59e0b', 
                backgroundColor: activeTab === 'rejected' ? '#f59e0b' : 'transparent' 
              }}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          {renderPlayerTable(paginatedList)}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '1rem', alignItems: 'center' }}>
              <button 
                className="btn btn-outline" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '0.5rem 1rem' }}
              >
                Previous
              </button>
              <div style={{ color: 'var(--text-muted)' }}>
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
        </div>
      </main>
    </div>
  );
};

export default AdminPlayersPage;
