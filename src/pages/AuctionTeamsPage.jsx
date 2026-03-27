import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate } from 'react-router-dom';

const AuctionTeamsPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [activeAuction, setActiveAuction] = useState(null);
  const [teams, setTeams] = useState([]);
  const [iconPlayers, setIconPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formError, setFormError] = useState('');
  
  const initialFormState = {
    team_name: '',
    logo: null
  };
  const [formData, setFormData] = useState(initialFormState);
  const fileInputRef = useRef(null);

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
        // Fetch Teams for this auction
        const { data: tData, error: tError } = await supabase
          .from('auction_teams')
          .select('*')
          .eq('auction_id', auctionData.id)
          .order('created_at', { ascending: true });
          
        if (tError) {
           if (tError.code === '42P01') {
               // Table doesn't exist yet! We will handle this in UI
               console.error("auction_teams table does not exist!");
               setFormError("The 'auction_teams' table does not exist in Supabase. Please create it first with fields: id, auction_id, team_name, logo_url, created_at.");
           } else {
               throw tError;
           }
        }
        setTeams(tData || []);

        // Fetch Icon Players for this auction
        const { data: apData, error: apError } = await supabase
          .from('auction_players')
          .select('*, players(*)')
          .eq('auction_id', auctionData.id)
          .eq('is_icon', true)
          .eq('approval_status', 'approved');

        if (apError) throw apError;
        
        const mappedPlayers = (apData || []).map(ap => ({
           auction_player_id: ap.id,
           team_id: ap.team_id,
           ...ap.players
        }));
        setIconPlayers(mappedPlayers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddNewTeam = () => {
    setEditingTeam(null);
    setFormData(initialFormState);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditClick = (team) => {
    setEditingTeam(team);
    setFormData({ team_name: team.team_name, logo: null });
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingTeam(null);
    setFormData(initialFormState);
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      if (!activeAuction) throw new Error("No active auction.");
      
      // Enforce number_of_teams limit if adding a new team
      if (!editingTeam && activeAuction.number_of_teams > 0 && teams.length >= activeAuction.number_of_teams) {
          throw new Error(`Cannot add more teams. Maximum number of teams (${activeAuction.number_of_teams}) reached.`);
      }

      let logo_url = editingTeam ? editingTeam.logo_url : null;

      if (formData.logo) {
        if (logo_url) await deleteFromCloudinary(logo_url);
        logo_url = await uploadToCloudinary(formData.logo);
      }

      const payload = {
        auction_id: activeAuction.id,
        team_name: formData.team_name,
        logo_url
      };

      if (editingTeam) {
        const { error: updateError } = await supabase.from('auction_teams').update(payload).eq('id', editingTeam.id);
        if (updateError) throw updateError;
        alert(`Team updated successfully!`);
      } else {
        const { error: insertError } = await supabase.from('auction_teams').insert([payload]);
        if (insertError) throw insertError;
        alert(`Team added successfully!`);
      }

      setShowForm(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to save team.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteTeam = async (team) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${team.team_name}? Icon players assigned to this team will be unassigned.`)) return;
    
    try {
      setActionLoading(true);
      if (team.logo_url) await deleteFromCloudinary(team.logo_url);
      
      // Unassign players first
      await supabase.from('auction_players').update({ team_id: null }).eq('team_id', team.id);

      const { error } = await supabase.from('auction_teams').delete().eq('id', team.id);
      if (error) throw error;
      
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete team');
    } finally {
      setActionLoading(false);
    }
  };

  const assignIconPlayer = async (auctionPlayerId, teamId) => {
    try {
      setActionLoading(true);
      
      if (teamId && activeAuction) {
        const teamIconsCount = iconPlayers.filter(p => p.team_id == teamId).length;
        const maxIcons = activeAuction.number_of_icon !== null && activeAuction.number_of_icon !== undefined
            ? parseInt(activeAuction.number_of_icon)
            : 999;
            
        if (teamIconsCount >= maxIcons) {
            alert(`Cannot assign more than ${maxIcons} icon players to this team.`);
            setActionLoading(false);
            return;
        }
      }

      const { error } = await supabase
        .from('auction_players')
        .update({ team_id: teamId || null })
        .eq('id', auctionPlayerId);
        
      if (error) throw error;
      
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to assign icon player.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    window.location.reload();
  };

  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  if (loading) return <Loader message="LOADING TEAMS..." />;

  // Group Icon Players by Team
  const playersByTeam = {};
  const unassignedPlayers = [];
  
  iconPlayers.forEach(p => {
      if (p.team_id) {
          if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = [];
          playersByTeam[p.team_id].push(p);
      } else {
          unassignedPlayers.push(p);
      }
  });

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Auction Teams Management" showLogos={false} />
      
      <main className="container" style={{ padding: '2rem 1rem', zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>
                Active Auction: {activeAuction ? activeAuction.auction_name : 'None'}
            </h2>
            {activeAuction && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Allowed Teams: {activeAuction.number_of_teams !== null && activeAuction.number_of_teams !== undefined ? activeAuction.number_of_teams : 'Unlimited'} | Allowed Icons/Team: {activeAuction.number_of_icon !== null && activeAuction.number_of_icon !== undefined ? activeAuction.number_of_icon : 'Unlimited'}
                </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {!showForm && <button onClick={handleAddNewTeam} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'var(--accent-gold)' }}>+ Add Team</button>}
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Admin</Link>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#ff4444', borderColor: '#ff4444' }}>Logout</button>
          </div>
        </div>

        {formError && !showForm && (
            <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                {formError}
            </div>
        )}

        {showForm ? (
          <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
             <h2 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {editingTeam ? `Edit Team: ${editingTeam.team_name}` : 'Add New Team'}
              <button type="button" onClick={cancelForm} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                Cancel
              </button>
            </h2>

            {formError && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Team Name *</label>
                  <input required type="text" name="team_name" value={formData.team_name} onChange={handleFormChange} className="form-input" placeholder="e.g. Mumbai Indians" />
                </div>
                <div className="form-group">
                  <label className="form-label">Team Logo {editingTeam?.logo_url && '(Uploaded)'}</label>
                  <input type="file" name="logo" accept="image/*" onChange={handleFormChange} className="form-input" ref={fileInputRef} />
                </div>
              </div>

              <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ width: '100%' }}>
                {actionLoading ? 'Saving...' : (editingTeam ? 'Update Team' : 'Add Team')}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            {teams.length === 0 ? <p className="text-muted text-center" style={{ padding: '2rem' }}>No teams created yet. Start by adding a team!</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                {teams.map(team => {
                    const teamIcons = playersByTeam[team.id] || [];
                    const maxIcons = activeAuction?.number_of_icon !== null && activeAuction?.number_of_icon !== undefined ? parseInt(activeAuction.number_of_icon) : 999;
                    const canAddMoreIcons = teamIcons.length < maxIcons;
                    
                    return (
                      <div key={team.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'hidden' }}>
                        
                        {/* Team Header */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                            <img src={team.logo_url || 'https://via.placeholder.com/60'} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: '50%', background: '#fff', border: '2px solid var(--accent-gold)' }} />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-main)' }}>{team.team_name}</h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Icon Slots: {teamIcons.length} / {maxIcons > 100 ? '∞' : maxIcons}
                                </div>
                            </div>
                            <div>
                                <button disabled={actionLoading} onClick={() => handleEditClick(team)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', marginRight: '0.5rem' }}>Edit</button>
                                <button disabled={actionLoading} onClick={() => deleteTeam(team)} className="btn" style={{ background: '#ef4444', color: '#fff', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>Delete</button>
                            </div>
                        </div>

                        {/* Icon Players Section */}
                        <div style={{ padding: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-gold)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Assigned Icon Players</h4>
                            
                            {teamIcons.length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>No icon players assigned yet.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {teamIcons.map(p => (
                                        <li key={p.auction_player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,215,0,0.05)', padding: '0.5rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(255,215,0,0.2)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <img src={p.photo_url || 'https://via.placeholder.com/30'} alt="Player" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: '50%' }} />
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.first_name} {p.last_name}</span>
                                            </div>
                                            <button 
                                                onClick={() => assignIconPlayer(p.auction_player_id, null)} 
                                                className="btn btn-outline" 
                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderColor: '#f59e0b', color: '#f59e0b' }}
                                                disabled={actionLoading}
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Assign new icon dropdown */}
                            {canAddMoreIcons && unassignedPlayers.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Assign New Icon Player:</label>
                                    <select 
                                        className="form-select" 
                                        style={{ width: '100%', fontSize: '0.9rem' }}
                                        value=""
                                        onChange={(e) => assignIconPlayer(e.target.value, team.id)}
                                        disabled={actionLoading}
                                    >
                                        <option value="" disabled>-- Select Unassigned Icon Player --</option>
                                        {unassignedPlayers.map(p => (
                                            <option key={p.auction_player_id} value={p.auction_player_id}>
                                                {p.first_name} {p.last_name} ({p.player_role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {canAddMoreIcons && unassignedPlayers.length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No unassigned icon players available.</p>
                            )}
                            {!canAddMoreIcons && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>Maximum icon players assigned.</p>
                            )}
                        </div>
                      </div>
                    );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AuctionTeamsPage;
