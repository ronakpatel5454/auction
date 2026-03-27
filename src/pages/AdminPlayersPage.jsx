import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const AdminPlayersPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [activeAuction, setActiveAuction] = useState(null);
  const [playersList, setPlayersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;
  const navigate = useNavigate();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formError, setFormError] = useState('');
  
  const initialFormState = {
    first_name: '', last_name: '', mobile: '', email: '',
    dob: '', area: '', gender: '',
    player_role: '', batting_style: '', bowling_style: '',
    photo: null, aadhar: null,
    is_icon: false
  };
  const [formData, setFormData] = useState(initialFormState);

  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

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
          
          const merged = apData.map(ap => {
            const playerDetails = pData.find(p => p.id === ap.player_id) || {};
            return {
              ...playerDetails,
              auction_player_id: ap.id,
              approval_status: ap.approval_status,
              is_icon: ap.is_icon || false
            };
          });
          
          // Reverse sort so newest is first
          setPlayersList(merged.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
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

  const toggleIconStatus = async (auctionPlayerId, currentStatus) => {
    try {
      setActionLoading(true);
      const newIconStatus = !currentStatus;
      
      const updatePayload = { is_icon: newIconStatus };
      if (!newIconStatus) {
        updatePayload.team_id = null;
      }

      const { error } = await supabase
        .from('auction_players')
        .update(updatePayload)
        .eq('id', auctionPlayerId);
        
      if (error) throw error;
      setPlayersList(prev => prev.map(p => p.auction_player_id === auctionPlayerId ? { ...p, is_icon: newIconStatus } : p));
      
      // If we removed icon status, we might need to refresh to reflect team changes in UI
      if (!newIconStatus) await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update icon status');
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
        if (playerToDelete.photo_url) await deleteFromCloudinary(playerToDelete.photo_url);
        if (playerToDelete.aadhar_card_url) await deleteFromCloudinary(playerToDelete.aadhar_card_url);
      }

      const { error: apError } = await supabase.from('auction_players').delete().eq('id', auctionPlayerId);
      if (apError) throw apError;
      
      const { error: pError } = await supabase.from('players').delete().eq('id', playerId);
      if (pError) throw pError;

      setPlayersList(prev => prev.filter(p => p.auction_player_id !== auctionPlayerId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete player');
    } finally {
      setActionLoading(false);
    }
  };

  // --- FORM LOGIC ---
  const handleEditClick = (p) => {
    setEditingPlayer(p);
    setFormData({
      first_name: p.first_name || '', last_name: p.last_name || '',
      mobile: p.mobile || '', email: p.email || '',
      dob: p.dob || '', area: p.area || '', gender: p.gender || '',
      player_role: p.player_role || '', batting_style: p.batting_style || '', bowling_style: p.bowling_style || '',
      photo: null, aadhar: null,
      is_icon: p.is_icon || false
    });
    setFormError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNewPlayer = () => {
    setEditingPlayer(null);
    setFormData(initialFormState);
    setFormError('');
    if (fileInputRef1.current) fileInputRef1.current.value = "";
    if (fileInputRef2.current) fileInputRef2.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingPlayer(null);
    setFormData(initialFormState);
    setFormError('');
  };

  const handleFormChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      if (!activeAuction) throw new Error("No active auction configuration found.");

      // Check Mobile uniqueness
      let mobileQuery = supabase.from('players').select('id').eq('mobile', formData.mobile).limit(1);
      const { data: existingPlayer, error: checkError } = await mobileQuery;
      
      if (checkError) throw checkError;
      if (existingPlayer && existingPlayer.length > 0) {
        // If editing, make sure the found duplicate isn't the current player
        if (!editingPlayer || existingPlayer[0].id !== editingPlayer.id) {
          throw new Error("A player with this mobile number already exists.");
        }
      }

      let photo_url = editingPlayer ? editingPlayer.photo_url : null;
      let aadhar_card_url = editingPlayer ? editingPlayer.aadhar_card_url : null;

      if (formData.photo) {
        if (photo_url) await deleteFromCloudinary(photo_url);
        photo_url = await uploadToCloudinary(formData.photo);
      }
      if (formData.aadhar) {
        if (aadhar_card_url) await deleteFromCloudinary(aadhar_card_url);
        aadhar_card_url = await uploadToCloudinary(formData.aadhar);
      }

      const playerPayload = {
        first_name: formData.first_name, last_name: formData.last_name,
        mobile: formData.mobile, email: formData.email,
        dob: formData.dob || null, area: formData.area || null, gender: formData.gender || null,
        photo_url, aadhar_card_url,
        player_role: formData.player_role, batting_style: formData.batting_style, bowling_style: formData.bowling_style
      };

      if (editingPlayer) {
        // UPDATE player record
        const { error: updateError } = await supabase.from('players').update(playerPayload).eq('id', editingPlayer.id);
        if (updateError) throw updateError;
        
        // UPDATE auction_players specifically for is_icon
        const apUpdatePayload = { is_icon: formData.is_icon || false };
        if (!formData.is_icon) {
          apUpdatePayload.team_id = null;
        }

        const { error: apUpdateError } = await supabase.from('auction_players')
          .update(apUpdatePayload)
          .eq('id', editingPlayer.auction_player_id);
        if (apUpdateError) throw apUpdateError;
        
        alert(`Player ${formData.first_name} updated successfully!`);
      } else {
        // INSERT new player
        const { data: newPlayerData, error: insertError } = await supabase.from('players').insert([playerPayload]).select().single();
        if (insertError) throw insertError;

        const { error: apError } = await supabase.from('auction_players').insert([{
          auction_id: activeAuction.id,
          player_id: newPlayerData.id,
          approval_status: 'approved', // Automatically auto-approve Admins directly adding players
          is_icon: formData.is_icon || false
        }]);
        if (apError) throw apError;
        alert(`Player ${formData.first_name} added successfully!`);
      }

      setShowForm(false);
      await fetchData(); // Refresh entire list
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to save player details.");
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

  const filteredList = playersList.filter(p => {
    const matchesTab = p.approval_status === activeTab;
    const matchesSearch = searchTerm === '' || 
      `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mobile && p.mobile.includes(searchTerm));
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

  const pendingCount = playersList.filter(p => p.approval_status === 'pending').length;
  const approvedCount = playersList.filter(p => p.approval_status === 'approved').length;
  const rejectedCount = playersList.filter(p => p.approval_status === 'rejected').length;

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
            {!showForm && <button onClick={handleAddNewPlayer} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'var(--accent-gold)' }}>+ Add Player</button>}
            <Link to="/players" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>View Roster</Link>
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Admin</Link>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#ff4444', borderColor: '#ff4444' }}>Logout</button>
          </div>
        </div>

        {showForm ? (
          <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto 3rem' }}>
             <h2 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {editingPlayer ? `Edit Player: ${editingPlayer.first_name}` : 'Add New Player'}
              <button type="button" onClick={cancelForm} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                Cancel
              </button>
            </h2>

            {formError && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.1rem' }}>Personal Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input required type="text" name="first_name" value={formData.first_name} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input required type="text" name="last_name" value={formData.last_name} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input required type="tel" name="mobile" value={formData.mobile} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleFormChange} className="form-select">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Area / City</label>
                  <input type="text" name="area" value={formData.area} onChange={handleFormChange} className="form-input" />
                </div>
              </div>

              <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.1rem' }}>Cricket Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Player Role *</label>
                  <select required name="player_role" value={formData.player_role} onChange={handleFormChange} className="form-select">
                    <option value="">Select Role</option>
                    <option value="Batter">Batter</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All Rounder">All Rounder</option>
                    <option value="Wicket Keeper">Wicket Keeper</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batting Style *</label>
                  <select required name="batting_style" value={formData.batting_style} onChange={handleFormChange} className="form-select">
                    <option value="">Select Style</option>
                    <option value="Right Hand">Right Hand</option>
                    <option value="Left Hand">Left Hand</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bowling Style *</label>
                  <select required name="bowling_style" value={formData.bowling_style} onChange={handleFormChange} className="form-select">
                    <option value="">Select Style</option>
                    <option value="Right Arm Fast">Right Arm Fast</option>
                    <option value="Right Arm Medium">Right Arm Medium</option>
                    <option value="Right Arm Spin">Right Arm Spin</option>
                    <option value="Left Arm Fast">Left Arm Fast</option>
                    <option value="Left Arm Spin">Left Arm Spin</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>

              <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.1rem' }}>Documents</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Player Photo {editingPlayer?.photo_url && '(Uploaded)'}</label>
                  <input type="file" name="photo" accept="image/*" onChange={handleFormChange} className="form-input" ref={fileInputRef1} />
                </div>
                <div className="form-group">
                  <label className="form-label">Aadhar Card {editingPlayer?.aadhar_card_url && '(Uploaded)'}</label>
                  <input type="file" name="aadhar" accept="image/*,application/pdf" onChange={handleFormChange} className="form-input" ref={fileInputRef2} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', margin: 0, padding: '0.5rem', background: 'rgba(255,215,0,0.1)', borderRadius: '4px', border: '1px solid var(--accent-gold)' }}>
                    <input type="checkbox" name="is_icon" checked={formData.is_icon} onChange={handleFormChange} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent-gold)' }} />
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Mark as Icon Player</span>
                  </label>
                </div>
              </div>

              <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'block' }}>
                {actionLoading ? 'Saving...' : (editingPlayer ? 'Update Player' : 'Add Player')}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
              <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
                <input 
                  type="text" 
                  placeholder="Search by name or mobile..." 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  className="form-input" 
                  style={{ width: '100%', border: '1px solid var(--glass-border)' }} 
                />
              </div>
            </div>

            {paginatedList.length === 0 ? <p className="text-muted text-center" style={{ padding: '2rem' }}>No players found in this category.</p> : (
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
                    {paginatedList.map(p => (
                      <tr 
                        key={p.auction_player_id} 
                        onClick={() => navigate(`/player/${p.id}`, { state: { from: '/admin-players' } })} 
                        style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                      >
                        <td style={{ padding: '1rem' }}>
                          <img src={p.photo_url || 'https://via.placeholder.com/50'} alt="Player" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }} />
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 'bold' }}>{p.first_name} {p.last_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.email}</div>
                          {p.is_icon && <span style={{ background: 'var(--accent-gold)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-block', marginTop: '0.3rem' }}>ICON</span>}
                        </td>
                        <td style={{ padding: '1rem' }}>{p.player_role}</td>
                        <td style={{ padding: '1rem' }}>{p.mobile}</td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); handleEditClick(p); }} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Edit</button>
                          
                          <button 
                            disabled={actionLoading} 
                            onClick={(e) => { e.stopPropagation(); toggleIconStatus(p.auction_player_id, p.is_icon); }} 
                            className="btn btn-outline" 
                            style={{ 
                              padding: '0.4rem 0.8rem', fontSize: '0.8rem', 
                              color: p.is_icon ? 'var(--accent-gold)' : '', 
                              borderColor: p.is_icon ? 'var(--accent-gold)' : '' 
                            }}
                          >
                            {p.is_icon ? 'Remove Icon' : 'Make Icon'}
                          </button>

                          {p.approval_status !== 'approved' && (
                            <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); updateStatus(p.auction_player_id, 'approved'); }} className="btn" style={{ background: 'var(--accent-green)', color: '#000', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Approve</button>
                          )}
                          {p.approval_status !== 'rejected' && (
                            <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); updateStatus(p.auction_player_id, 'rejected'); }} className="btn" style={{ background: '#f59e0b', color: '#000', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Reject</button>
                          )}
                          <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); deletePlayer(p.id, p.auction_player_id); }} className="btn" style={{ background: '#ef4444', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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
        )}
      </main>
    </div>
  );
};

export default AdminPlayersPage;
