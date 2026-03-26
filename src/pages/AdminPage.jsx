import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Link } from 'react-router-dom';

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    auction_name: '',
    auction_code: '',
    auction_date: '',
    venue: '',
    status: 'draft',
    logo: null
  });

  useEffect(() => {
    const authFlag = localStorage.getItem('cap_admin_auth');
    if (authFlag === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'auction5454') {
      setIsAuthenticated(true);
      localStorage.setItem('cap_admin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('cap_admin_auth');
    setPassword('');
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      let auction_logo = null;
      if (formData.logo) {
        auction_logo = await uploadToCloudinary(formData.logo);
      }

      const { data, error } = await supabase
        .from('auctions')
        .insert([{
          auction_name: formData.auction_name,
          auction_code: formData.auction_code,
          auction_date: formData.auction_date || null,
          venue: formData.venue || null,
          status: formData.status,
          auction_logo
        }]);

      if (error) throw error;

      setSuccessMsg(`Auction "${formData.auction_name}" created successfully!`);
      setFormData({
        auction_name: '',
        auction_code: '',
        auction_date: '',
        venue: '',
        status: 'draft',
        logo: null
      });
      // Optionally reset the file input using a ref, but acceptable as is for MVP
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to create auction');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-col min-h-screen">
        <PageHeader title="Admin Access" showLogos={false} />
        <main className="container flex-col items-center justify-center p-4">
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Enter Admin Password</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input" 
                placeholder="Password" 
                required 
              />
              {loginError && <p style={{ color: '#ff4444', fontSize: '0.9rem', margin: '0' }}>{loginError}</p>}
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Login</button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Admin Dashboard" subtitle="Manage Auctions" showLogos={false} />
      
      <main className="container" style={{ padding: '2rem 1rem', zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem', gap: '1rem' }}>
          <Link to="/admin-players" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Manage Players</Link>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Logout</button>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Create New Auction</h2>
          
          {successMsg && <div style={{ background: 'rgba(57, 255, 20, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{successMsg}</div>}
          {formError && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{formError}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Auction Name *</label>
                <input required type="text" name="auction_name" value={formData.auction_name} onChange={handleChange} className="form-input" placeholder="e.g. IPL 2026" />
              </div>
              <div className="form-group">
                <label className="form-label">Auction Code * (Unique)</label>
                <input required type="text" name="auction_code" value={formData.auction_code} onChange={handleChange} className="form-input" placeholder="e.g. IPL26" />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" name="auction_date" value={formData.auction_date} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Venue</label>
                <input type="text" name="venue" value={formData.venue} onChange={handleChange} className="form-input" placeholder="e.g. Wankhede Stadium" />
              </div>
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select required name="status" value={formData.status} onChange={handleChange} className="form-select">
                  <option value="draft">Draft (Hidden)</option>
                  <option value="registration_open">Registration Open</option>
                  <option value="running">Running (Live)</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Auction Logo</label>
                <input type="file" name="logo" accept="image/*" onChange={handleChange} className="form-input" />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', maxWidth: '300px' }}>
              {submitting ? 'Creating...' : 'Create Auction'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
