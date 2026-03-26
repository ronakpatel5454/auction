import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';

const RegistrationPage = () => {
  const [activeAuction, setActiveAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', mobile: '', email: '',
    dob: '', area: '', gender: '',
    player_role: '', batting_style: '', bowling_style: '',
    photo: null, aadhar: null
  });

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const { data, error } = await supabase
          .from('auctions')
          .select('id, auction_name, qr_code_url, per_player_fees')
          .in('status', ['registration_open', 'running'])
          .limit(1)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        setActiveAuction(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuction();
  }, []);

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
    setSubmitting(true);

    try {
      if (!activeAuction) throw new Error("No active auction available for registration.");

      // Check if mobile already exists
      const { data: existingPlayers, error: checkError } = await supabase
        .from('players')
        .select('id')
        .eq('mobile', formData.mobile)
        .limit(1);

      if (checkError) throw checkError;
      if (existingPlayers && existingPlayers.length > 0) {
        throw new Error("Already registered with this mobile number. Please contact the auction owner.");
      }

      // Upload Images
      let photo_url = null;
      let aadhar_card_url = null;

      if (formData.photo) photo_url = await uploadToCloudinary(formData.photo);
      if (formData.aadhar) aadhar_card_url = await uploadToCloudinary(formData.aadhar);

      const playerPayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        mobile: formData.mobile,
        email: formData.email,
        dob: formData.dob || null,
        area: formData.area || null,
        gender: formData.gender || null,
        photo_url,
        aadhar_card_url,
        player_role: formData.player_role,
        batting_style: formData.batting_style,
        bowling_style: formData.bowling_style
      };

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([playerPayload])
        .select()
        .single();

      if (playerError) throw playerError;

      // Insert into auction_players
      const { error: auctionPlayerError } = await supabase
        .from('auction_players')
        .insert([{
          auction_id: activeAuction.id,
          player_id: playerData.id,
          approval_status: 'pending'
        }]);

      if (auctionPlayerError) throw auctionPlayerError;

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="LOADING FORM..." />;

  if (success) {
    return (
      <div className="flex-col min-h-screen">
        <PageHeader title="Registration Successful" showLogos={false} />
        <main className="container flex-col items-center justify-center text-center" style={{ flex: 1, padding: '4rem 1rem' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#000', fontSize: '2.5rem', fontWeight: 'bold' }}>
              ✓
            </div>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>You're Registered!</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Your application is currently pending approval. You will be notified once the admin approves your registration.
            </p>
            <a href="#/" className="btn btn-outline">Return to Home</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Player Registration" subtitle={activeAuction ? `Register for ${activeAuction.auction_name}` : ''} showLogos={false} />

      <main className="container flex-col items-center" style={{ flex: 1, padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
        <div className="glass-panel responsive-padding" style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          {formError && (
            <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid red', padding: '1rem', borderRadius: '8px', color: '#ff4444', marginBottom: '2rem' }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Personal Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input required type="text" name="first_name" className="form-input" value={formData.first_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input required type="text" name="last_name" className="form-input" value={formData.last_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input required type="tel" name="mobile" className="form-input" value={formData.mobile} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" name="dob" className="form-input" value={formData.dob} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '2rem 0 1.5rem', color: 'var(--accent-gold)' }}>Address</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Area / Village / City</label>
                <input type="text" name="area" className="form-input" value={formData.area} onChange={handleChange} />
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '2rem 0 1.5rem', color: 'var(--accent-gold)' }}>Cricket Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Player Role *</label>
                <select required name="player_role" className="form-select" value={formData.player_role} onChange={handleChange}>
                  <option value="">Select Role</option>
                  <option value="Batter">Batter</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All Rounder">All Rounder</option>
                  <option value="Wicket Keeper">Wicket Keeper</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Batting Style *</label>
                <select required name="batting_style" className="form-select" value={formData.batting_style} onChange={handleChange}>
                  <option value="">Select Style</option>
                  <option value="Right Hand">Right Hand</option>
                  <option value="Left Hand">Left Hand</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bowling Style *</label>
                <select required name="bowling_style" className="form-select" value={formData.bowling_style} onChange={handleChange}>
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

            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '2rem 0 1.5rem', color: 'var(--accent-gold)' }}>Documents</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Player Photo (Square aspect ratio preferred)</label>
                <input type="file" name="photo" accept="image/*" className="form-input" onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Aadhar Card</label>
                <input type="file" name="aadhar" accept="image/*,application/pdf" className="form-input" onChange={handleChange} />
              </div>
            </div>

            {activeAuction && (activeAuction.qr_code_url || activeAuction.per_player_fees) && (
              <div style={{ marginTop: '3rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Registration Fee Payment</h3>
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  {activeAuction.per_player_fees && (
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-green)', marginBottom: '1.5rem' }}>
                      Registration Fee: ₹{activeAuction.per_player_fees}
                    </div>
                  )}
                  {activeAuction.qr_code_url && (
                    <>
                      <p style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Please scan the QR Code below to securely complete your registration fee payment.</p>
                      <img 
                        src={activeAuction.qr_code_url} 
                        alt="Payment QR Code for Registration" 
                        style={{ maxWidth: '280px', width: '100%', borderRadius: '12px', border: '3px solid var(--accent-gold)', boxShadow: '0 8px 30px rgba(255, 215, 0, 0.15)' }} 
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: '300px', fontSize: '1.2rem', padding: '1rem' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Register Player'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default RegistrationPage;
