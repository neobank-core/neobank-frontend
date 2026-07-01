'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import styles from './profile.module.css';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Profile Edits
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({ firstName: '', lastName: '', phone: '' });
  
  // Address Edits
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressData, setAddressData] = useState({ country: '', city: '', street: '', postalCode: '' });

  // KYC State
  const [kycStatus, setKycStatus] = useState<string>('NOT_SUBMITTED');
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycForm, setKycForm] = useState({ documentType: 'PASSPORT', documentNumber: '' });
  const [submittingKyc, setSubmittingKyc] = useState(false);

  const fetchProfile = async () => {
    try {
      const [userRes, prefRes, addrRes, kycRes] = await Promise.all([
        api.get('/api/users/me'),
        api.get('/api/notifications/preferences'),
        api.get('/api/users/me/address/current').catch(() => ({ data: {} })), // Catch 404 or missing gracefully
        api.get('/api/users/me/kyc/status').catch(() => ({ data: { status: 'NOT_SUBMITTED' } }))
      ]);
      setUser(userRes.data);
      setPrefs(prefRes.data);
      setEditData({
        firstName: userRes.data.firstName || '',
        lastName: userRes.data.lastName || '',
        phone: userRes.data.phone || ''
      });
      
      if (addrRes.data) {
        setAddressData({
          country: addrRes.data.country || '',
          city: addrRes.data.city || '',
          street: addrRes.data.street || '',
          postalCode: addrRes.data.postalCode || ''
        });
      }
      
      if (kycRes.data && kycRes.data.status) {
        setKycStatus(kycRes.data.status === 'NONE' ? 'NOT_SUBMITTED' : kycRes.data.status);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await api.put('/api/users/me', editData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressData.country || !addressData.city || !addressData.street || !addressData.postalCode) {
      toast.error('Please fill in the full address before saving');
      return;
    }

    try {
      setSavingAddress(true);
      await api.post('/api/users/me/address', addressData);
      toast.success('Address updated successfully');
      setIsEditingAddress(false);
      // Re-fetch address to confirm what's stored in the DB
      const addrRes = await api.get('/api/users/me/address/current').catch(() => ({ data: {} }));
      if (addrRes.data) {
        setAddressData({
          country: addrRes.data.country || '',
          city: addrRes.data.city || '',
          street: addrRes.data.street || '',
          postalCode: addrRes.data.postalCode || ''
        });
      }
    } catch (err) {
      toast.error('Failed to update address: ' + ((err as any).response?.data?.message || (err as any).message));
    } finally {
      setSavingAddress(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdatePrefs = async (field: string, value: boolean) => {
    const previousPrefs = { ...prefs };
    try {
      // Optimistic UI update
      setPrefs({ ...prefs, [field]: value });
      
      await api.put('/api/notifications/preferences', {
        ...prefs,
        [field]: value
      });
      toast.success('Preferences saved');
    } catch (err) {
      // Rollback on failure
      setPrefs(previousPrefs);
      toast.error('Error saving preferences');
    }
  };

  const handleSubmitKyc = async () => {
    if (!kycForm.documentNumber) {
      toast.error('Document number is required');
      return;
    }
    
    try {
      setSubmittingKyc(true);
      await api.post('/api/users/me/kyc', kycForm);
      toast.success('Verification application submitted successfully!');
      
      setKycStatus('PENDING');
      setShowKycModal(false);
    } catch (err) {
      const message = (err as any).response?.data?.message || (err as any).message;
      if (message?.includes('already exists')) {
        await fetchProfile();
        toast.error('KYC request is already submitted. Wait for admin review.');
      } else {
        toast.error('Error submitting KYC: ' + message);
      }
    } finally {
      setSubmittingKyc(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading profile...</div>;

  const kycLabel: Record<string, string> = {
    NOT_SUBMITTED: 'Not Submitted',
    PENDING: 'Pending Review',
    APPROVED: 'Approved ✓',
    REJECTED: 'Rejected',
    NONE: 'Not Submitted',
  };

  const kycColor: Record<string, string> = {
    NOT_SUBMITTED: 'badgeNot_submitted',
    PENDING: 'badgePending',
    APPROVED: 'badgeApproved',
    REJECTED: 'badgeRejected',
    NONE: 'badgeNot_submitted',
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile Settings</h1>
        <div className={styles.kycStatusWrapper}>
          <span>KYC Status:</span>
          <span className={`${styles.badge} ${styles[kycColor[kycStatus] || 'badge-not_submitted']}`}>
            {kycLabel[kycStatus] || kycStatus}
          </span>
          {(kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED' || kycStatus === 'NONE') && (
            <button className={styles.verifyBtn} onClick={() => setShowKycModal(true)}>
              Verify Now
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.grid}>
        {/* Personal Details Card */}
        <div className={`${styles.card} glass`}>
          <div className={styles.cardHeader}>
            <h3>Personal Details</h3>
            {!isEditing && (
              <button className={styles.editIconBtn} onClick={() => setIsEditing(true)}>✎ Edit</button>
            )}
          </div>
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <label>First Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editData.firstName} 
                  onChange={e => setEditData({...editData, firstName: e.target.value})} 
                  className={styles.inputField}
                />
              ) : (
                <div className={styles.fieldValue}>{user?.firstName || '-'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Last Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editData.lastName} 
                  onChange={e => setEditData({...editData, lastName: e.target.value})} 
                  className={styles.inputField}
                />
              ) : (
                <div className={styles.fieldValue}>{user?.lastName || '-'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Phone Number</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editData.phone} 
                  onChange={e => setEditData({...editData, phone: e.target.value})} 
                  className={styles.inputField}
                />
              ) : (
                <div className={styles.fieldValue}>{user?.phone || 'Not provided'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Email (Read-only)</label>
              <div className={styles.fieldValue}>{user?.email || '-'}</div>
            </div>
          </div>
          
          {isEditing && (
            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={() => setIsEditing(false)} disabled={saving}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Address Card */}
        <div className={`${styles.card} glass`}>
          <div className={styles.cardHeader}>
            <h3>Residential Address</h3>
            {!isEditingAddress && (
              <button className={styles.editIconBtn} onClick={() => setIsEditingAddress(true)}>✎ Edit</button>
            )}
          </div>
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <label>Country</label>
              {isEditingAddress ? (
                <input 
                  type="text" 
                  value={addressData.country} 
                  onChange={e => setAddressData({...addressData, country: e.target.value})} 
                  className={styles.inputField}
                />
              ) : (
                <div className={styles.fieldValue}>{addressData.country || 'Not provided'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>City</label>
              {isEditingAddress ? (
                <input 
                  type="text" 
                  value={addressData.city} 
                  onChange={e => setAddressData({...addressData, city: e.target.value})} 
                  className={styles.inputField}
                />
              ) : (
                <div className={styles.fieldValue}>{addressData.city || 'Not provided'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Street</label>
              {isEditingAddress ? (
                <input 
                  type="text" 
                  value={addressData.street} 
                  onChange={e => setAddressData({...addressData, street: e.target.value})} 
                  className={styles.inputField}
                />
              ) : (
                <div className={styles.fieldValue}>{addressData.street || 'Not provided'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Postal Code</label>
              {isEditingAddress ? (
                <input 
                  type="text" 
                  value={addressData.postalCode} 
                  onChange={e => setAddressData({...addressData, postalCode: e.target.value})} 
                  className={styles.inputField}
                />
              ) : (
                <div className={styles.fieldValue}>{addressData.postalCode || 'Not provided'}</div>
              )}
            </div>
          </div>
          
          {isEditingAddress && (
            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={() => setIsEditingAddress(false)} disabled={savingAddress}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSaveAddress} disabled={savingAddress}>
                {savingAddress ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Card */}
        <div className={`${styles.card} glass`}>
          <h3>Notification Preferences</h3>
          <div className={styles.prefGroup}>
            <label className={styles.switchLabel}>
              <div className={styles.switchText}>
                <strong>SMS Notifications</strong>
                <span>Receive SMS alerts on your phone</span>
              </div>
              <input 
                type="checkbox" 
                className={styles.toggle}
                checked={prefs?.smsEnabled || false} 
                onChange={(e) => handleUpdatePrefs('smsEnabled', e.target.checked)} 
              />
            </label>
            <label className={styles.switchLabel}>
              <div className={styles.switchText}>
                <strong>Email Notifications</strong>
                <span>Receive statements and important alerts via email</span>
              </div>
              <input 
                type="checkbox" 
                className={styles.toggle}
                checked={prefs?.emailEnabled || false} 
                onChange={(e) => handleUpdatePrefs('emailEnabled', e.target.checked)} 
              />
            </label>
          </div>
        </div>
      </div>

      {/* KYC Modal */}
      {showKycModal && (
        <div className={styles.modalOverlay} onClick={() => setShowKycModal(false)}>
          <div className={`${styles.kycModal} glass`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Identity Verification</h2>
              <button onClick={() => setShowKycModal(false)} className={styles.closeBtn}>×</button>
            </div>
            <p className={styles.modalDesc}>Please provide your document details to complete KYC verification. This is required to issue bank cards.</p>
            
            <div className={styles.field}>
              <label>Document Type</label>
              <select 
                className={styles.selectField}
                value={kycForm.documentType}
                onChange={e => setKycForm({...kycForm, documentType: e.target.value})}
              >
                <option value="PASSPORT">Passport</option>
                <option value="ID_CARD">National ID Card</option>
                <option value="DRIVING_LICENSE">Driving License</option>
              </select>
            </div>
            
            <div className={styles.field}>
              <label>Document Number</label>
              <input 
                type="text"
                placeholder="e.g. AB1234567"
                className={styles.inputField}
                value={kycForm.documentNumber}
                onChange={e => setKycForm({...kycForm, documentNumber: e.target.value})}
              />
            </div>

            <div className={styles.field}>
              <label>Upload Document (Front)</label>
              <input 
                type="file"
                accept="image/*,.pdf"
                className={styles.inputField}
                style={{ padding: '0.5rem' }}
              />
              <span style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.25rem', display: 'block' }}>
                Supported formats: JPG, PNG, PDF (Mock upload)
              </span>
            </div>
            
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowKycModal(false)}>Cancel</button>
              <button 
                className={styles.saveBtn} 
                onClick={handleSubmitKyc}
                disabled={submittingKyc || !kycForm.documentNumber}
              >
                {submittingKyc ? 'Submitting...' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
