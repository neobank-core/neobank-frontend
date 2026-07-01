'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import styles from './cards.module.css';

interface Card {
  id: string;
  cardNumberMasked: string;
  cardNumber?: string;
  cvv?: string;
  cardHolderName: string;
  cardStatus: string;
  expiryMonth: number;
  expiryYear: number;
  cardType: string;
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [show3ds, setShow3ds] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [threeDsError, setThreeDsError] = useState(''); // separate error for 3DS modal
  
  // Create Card Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCardForm, setNewCardForm] = useState({ cardHolderName: '', cardType: 'DEBIT' });

  // Card Details Modal
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [showFullCard, setShowFullCard] = useState(false);
  const [revealedCard, setRevealedCard] = useState<Card | null>(null);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await api.get('/api/cards/my');
      setCards(res.data);
    } catch (error) {
      console.error('Failed to fetch cards', error);
    } finally {
      setLoading(false);
    }
  };

  const maskCard = (num: string) => {
    if (!num) return '**** **** **** ****';
    // Backend might return "123456******7890" or just last 4. 
    // Let's just use what it returns or add spaces if it's 16 digits.
    if (num.length === 16) {
      return `${num.slice(0,4)} ${num.slice(4,8)} ${num.slice(8,12)} ${num.slice(12,16)}`;
    }
    return num;
  };

  const handleAddCard = () => {
    setError('');
    setNewCardForm({ cardHolderName: '', cardType: 'DEBIT' });
    setShowCreateModal(true);
  };

  const submitCreateCard = async () => {
    if (!newCardForm.cardHolderName.trim()) {
      setError('Card Holder Name is required');
      return;
    }

    setAdding(true);
    setShowCreateModal(false);
    try {
      // First, get the user's account to link the card to
      const accountsRes = await api.get('/api/accounts/my');
      const accounts = accountsRes.data;
      
      if (!accounts || accounts.length === 0) {
        setError('You do not have an active account yet. Please wait for it to be created.');
        setAdding(false);
        return;
      }
      
      const accountId = accounts[0].id;
      
      const res = await api.post('/api/cards', {
        accountId: accountId,
        cardHolderName: newCardForm.cardHolderName.toUpperCase(),
        cardType: newCardForm.cardType
      });
      
      if (res.data.status === 'PENDING_VERIFICATION') {
        setPendingCardId(res.data.cardId || res.data.id);
        setSessionToken(res.data.sessionToken);
        setShow3ds(true);
      } else {
        fetchCards();
      }
    } catch (err) {
      console.error('Failed to add card', err);
      if ((err as any).response?.status === 403) {
        setError('Verification Required: Please complete your KYC in the Profile page before issuing a card.');
      } else {
        setError('Error issuing card: ' + ((err as any).response?.data?.message || '500 Server Error'));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleBlockCard = async (id: string) => {
    try {
      setBlocking(true);
      await api.put(`/api/cards/${id}/block`);
      setSelectedCard(prev => prev ? { ...prev, cardStatus: 'BLOCKED' } : null);
      fetchCards();
    } catch (err) {
      setError('Error blocking card: ' + ((err as any).response?.data?.message || '500 Server Error'));
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblockCard = async (id: string) => {
    try {
      setBlocking(true); // Reusing blocking state for unblocking operation
      await api.put(`/api/cards/${id}/unblock`);
      setSelectedCard(prev => prev ? { ...prev, cardStatus: 'ACTIVE' } : null);
      fetchCards();
    } catch (err) {
      setError('Error unblocking card: ' + ((err as any).response?.data?.message || '500 Server Error'));
    } finally {
      setBlocking(false);
    }
  };

  const handleRevealCard = async (id: string) => {
    if (revealedCard?.id === id) {
      // Toggle off
      setShowFullCard(false);
      setRevealedCard(null);
      return;
    }
    try {
      setRevealing(true);
      const res = await api.get(`/api/cards/${id}`);
      setRevealedCard(res.data);
      setShowFullCard(true);
    } catch (err) {
      setError('Could not reveal card details: ' + ((err as any).response?.data?.message || (err as any).message));
    } finally {
      setRevealing(false);
    }
  };

  const handleVerify3ds = async () => {
    if (!pendingCardId || !sessionToken) return;
    setVerifying(true);
    setThreeDsError('');
    try {
      await api.post(`/api/cards/${pendingCardId}/verify-3ds`, { 
        sessionToken: sessionToken,
        otp: otp 
      });
      setShow3ds(false);
      setPendingCardId(null);
      setSessionToken(null);
      setOtp('');
      setThreeDsError('');
      fetchCards(); // auto-refresh list after success
    } catch (error) {
      console.error('Failed to verify', error);
      const msg = (error as any).response?.data?.message || 'Invalid code. Please try again.';
      setThreeDsError(msg); // show inside modal, not behind it
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelPending = async (id: string) => {
    try {
      await api.delete(`/api/cards/${id}`);
      if (id === pendingCardId) {
        setShow3ds(false);
        setPendingCardId(null);
        setSessionToken(null);
      }
      fetchCards();
    } catch (error) {
      setError('Error cancelling request: ' + ((error as any).response?.data?.message || '500 Server Error'));
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading cards...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Cards</h1>
        <button onClick={handleAddCard} disabled={adding} className={styles.addBtn}>
          {adding ? 'Issuing...' : '+ Issue new card'}
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.grid}>
        {cards.map(card => (
          <div key={card.id} className={`${styles.card} ${styles['card' + card.cardStatus]}`} onClick={() => setSelectedCard(card)}>
            <div className={styles.cardHeader}>
              <span>NeoBank Premium</span>
              <div className={styles.chip}></div>
            </div>
            <div className={styles.cardNumber}>{maskCard(card.cardNumberMasked)}</div>
            <div className={styles.cardFooter}>
              <div className={styles.cardHolder}>
                <span className={styles.label}>Card Holder</span>
                <span>{card.cardHolderName}</span>
              </div>
              <div className={styles.cardStatus}>
                <span className={styles.label}>Status</span>
                <span className={styles['status' + card.cardStatus]}>{card.cardStatus}</span>
              </div>
            </div>
            {card.cardStatus === 'PENDING_VERIFICATION' && (
              <div className={styles.pendingAction} onClick={e => e.stopPropagation()}>
                <div className={styles.warningText}>Awaiting 3DS verification.</div>
                <button 
                  onClick={() => handleCancelPending(card.id)}
                  className={styles.cancelRequestBtn}
                >
                  Cancel Request
                </button>
              </div>
            )}
            {card.cardStatus === 'BLOCKED' && (
              <div className={styles.pendingAction} onClick={e => e.stopPropagation()}>
                <div className={styles.warningText} style={{ color: 'var(--foreground)' }}>Card is blocked.</div>
                <button 
                  onClick={() => handleUnblockCard(card.id)}
                  className={styles.confirmBtn}
                  style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                  disabled={blocking}
                >
                  {blocking ? 'Unblocking...' : 'Unblock Card'}
                </button>
              </div>
            )}
          </div>
        ))}
        {cards.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💳</div>
            <h3>No Cards Found</h3>
            <p>You don't have any active cards yet. Issue a new one to start spending.</p>
          </div>
        )}
      </div>

      {/* Card Details Modal */}
      {selectedCard && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCard(null)}>
          <div className={`${styles.detailsModal} glass`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Card Details</h2>
              <button onClick={() => { setSelectedCard(null); setShowFullCard(false); setRevealedCard(null); }} className={styles.closeBtn}>×</button>
            </div>
            <div className={`${styles.cardDetailView} ${styles['card' + selectedCard.cardStatus]}`}>
              <div className={styles.cardHeader}>
                <span>NeoBank Premium</span>
                <div className={styles.chip}></div>
              </div>
              <div className={styles.cardNumber}>
                  {showFullCard && revealedCard?.id === selectedCard.id
                    ? (revealedCard.cardNumber || 'Not available')
                    : maskCard(selectedCard.cardNumberMasked)}
              </div>
              <div className={styles.cardFooter}>
                <div className={styles.cardHolder}>
                  <span className={styles.label}>Card Holder</span>
                  <span>{selectedCard.cardHolderName}</span>
                </div>
                <div className={styles.cardStatus}>
                  <span className={styles.label}>Expires</span>
                  <span>{String(selectedCard.expiryMonth).padStart(2, '0')}/{String(selectedCard.expiryYear).slice(-2)}</span>
                </div>
              </div>
            </div>
            
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <label>Status</label>
                <span className={styles['status' + selectedCard.cardStatus]}>{selectedCard.cardStatus}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Type</label>
                <span>{selectedCard.cardType}</span>
              </div>
              <div className={styles.detailItem}>
                <label>CVV</label>
                <span>{showFullCard && revealedCard?.id === selectedCard.id ? (revealedCard.cvv || 'N/A') : '***'}</span>
              </div>
            </div>
            
            {selectedCard.cardStatus === 'ACTIVE' && (
              <button 
                className={styles.revealBtn} 
                onClick={() => handleRevealCard(selectedCard.id)}
                disabled={revealing}
                style={{ width: '100%', padding: '0.5rem', marginTop: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
              >
                {revealing ? '⏳ Loading...' : showFullCard ? '🙈 Hide Details' : '👁️ Reveal Card Details'}
              </button>
            )}

            <div className={styles.modalActions}>
              {selectedCard.cardStatus === 'ACTIVE' && (
                <>
                  <a
                    href={`/dashboard/transfers`}
                    className={styles.confirmBtn}
                    style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setSelectedCard(null)}
                  >
                    💸 Transfer
                  </a>
                  <button 
                    className={styles.dangerBtn} 
                    onClick={() => handleBlockCard(selectedCard.id)}
                    disabled={blocking}
                  >
                    {blocking ? 'Blocking...' : 'Block Card'}
                  </button>
                </>
              )}
              {selectedCard.cardStatus === 'BLOCKED' && (
                <button 
                  className={styles.confirmBtn} 
                  onClick={() => handleUnblockCard(selectedCard.id)}
                  disabled={blocking}
                >
                  {blocking ? 'Unblocking...' : 'Unblock Card'}
                </button>
              )}
              {selectedCard.cardStatus === 'PENDING_VERIFICATION' && (
                <button 
                  className={styles.dangerBtn} 
                  onClick={() => {
                    handleCancelPending(selectedCard.id);
                    setSelectedCard(null);
                  }}
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {show3ds && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <h2>3DS Verification</h2>
            <p>A one-time code has been sent to your phone. Enter it below to activate the card.</p>
            <p style={{fontSize: '0.8rem', opacity: 0.6}}>(Test environment: use code <strong>123456</strong>)</p>
            {threeDsError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                ⚠️ {threeDsError}
              </div>
            )}
            <input 
              type="text" 
              value={otp} 
              onChange={e => { setOtp(e.target.value); setThreeDsError(''); }}
              placeholder="000000"
              maxLength={6}
              className={styles.otpInput}
            />
            <div className={styles.modalActions}>
              <button onClick={() => { setShow3ds(false); setThreeDsError(''); setOtp(''); fetchCards(); }} className={styles.cancelBtn}>Cancel</button>
              <button onClick={handleVerify3ds} disabled={verifying || otp.length < 6} className={styles.confirmBtn}>
                {verifying ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={`${styles.modal} glass`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Issue New Card</h2>
              <button onClick={() => setShowCreateModal(false)} className={styles.closeBtn}>×</button>
            </div>
            
            <div className={styles.formGroup}>
              <label>Cardholder Name</label>
              <input 
                type="text" 
                value={newCardForm.cardHolderName} 
                onChange={e => setNewCardForm({...newCardForm, cardHolderName: e.target.value.toUpperCase()})}
                placeholder="e.g. JOHN DOE"
                className={styles.inputField}
              />
              <p className={styles.hint}>This name will be printed on your card.</p>
            </div>
            
            <div className={styles.formGroup}>
              <label>Card Type</label>
              <select 
                value={newCardForm.cardType}
                onChange={e => setNewCardForm({...newCardForm, cardType: e.target.value})}
                className={styles.inputField}
              >
                <option value="DEBIT">Debit Card</option>
                <option value="CREDIT">Credit Card</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setShowCreateModal(false)} className={styles.cancelBtn} disabled={adding}>Cancel</button>
              <button 
                onClick={submitCreateCard} 
                disabled={adding || !newCardForm.cardHolderName.trim()} 
                className={styles.confirmBtn}
              >
                {adding ? 'Issuing...' : 'Issue Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
