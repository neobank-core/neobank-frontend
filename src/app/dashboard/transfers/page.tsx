'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import styles from './transfers.module.css';

interface Account {
  id: string;
  balance: number;
  currency: string;
  iban: string;
  status: string;
}

interface Card {
  id: string;
  cardNumberMasked: string;
  cardHolderName: string;
  cardStatus: string;
  cardType: string;
}

export default function TransfersPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'transfer' | 'deposit'>('transfer');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'transfer' | 'deposit' | null>(null);

  // Transfer Form State
  const [senderCardId, setSenderCardId] = useState('');
  const [receiverCardNumber, setReceiverCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AZN');

  // Deposit Form State
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState('AZN');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const [accountsRes, cardsRes] = await Promise.all([
        api.get('/api/accounts/my'),
        api.get('/api/cards/my').catch(() => ({ data: [] }))
      ]);

      const activeAccounts = accountsRes.data.filter((a: Account) => a.status === 'ACTIVE');
      const activeCards = cardsRes.data.filter((card: Card) => card.cardStatus === 'ACTIVE');

      setAccounts(activeAccounts);
      setCards(activeCards);
      if (activeAccounts.length > 0) {
        setDepositAccountId(activeAccounts[0].id);
        setCurrency(activeAccounts[0].currency || 'AZN');
        setDepositCurrency(activeAccounts[0].currency || 'AZN');
      }
      if (activeCards.length > 0) {
        setSenderCardId(activeCards[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch accounts', error);
      setError('Failed to load your accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);

    if (!senderCardId || !receiverCardNumber || !amount || !currency) {
      setError('Please fill in all required fields');
      setSending(false);
      return;
    }


    const cardNumberRegex = /^[0-9\s]{16,19}$/;
    if (!cardNumberRegex.test(receiverCardNumber)) {
      setError('Recipient Card Number must be a valid 16-digit card number.');
      setSending(false);
      return;
    }

    setPendingAction('transfer');
    setShowConfirm(true);
    setSending(false);
  };

  const executeTransfer = async () => {
    setSending(true);
    setError('');
    setShowConfirm(false);

    try {
      const idempotencyKey = crypto.randomUUID();

      await api.post('/api/transactions/transfer', {
        senderCardId,
        receiverCardNumber,
        amount: parseFloat(amount),
        currency
      }, {
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/transactions');
      }, 2500);

    } catch (err) {
      if ((err as any).response?.data?.message) {
        setError((err as any).response.data.message);
      } else {
        setError('An error occurred during the transfer');
      }
    } finally {
      setSending(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!depositAccountId || !depositAmount || !depositCurrency) {
      setError('Please fill in all required fields');
      return;
    }

    setPendingAction('deposit');
    setShowConfirm(true);
  };

  const executeDeposit = async () => {
    setSending(true);
    setError('');
    setShowConfirm(false);

    try {
      const idempotencyKey = crypto.randomUUID();

      await api.post('/api/transactions/deposit', {
        amount: parseFloat(depositAmount),
        currency: depositCurrency
      }, {
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/transactions');
      }, 2500);

    } catch (err) {
      if ((err as any).response?.data?.message) {
        setError((err as any).response.data.message);
      } else {
        setError('An error occurred during the deposit');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }




  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Transfers & Deposits</h1>

      <div className={`${styles.transferBox} glass`}>
        {success ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}>✓</div>
            <h2>Success!</h2>
            <p>Transaction submitted successfully. Redirecting to history...</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
              <button 
                onClick={() => setActiveTab('transfer')}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                  borderBottom: activeTab === 'transfer' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'transfer' ? 'var(--primary)' : 'var(--foreground)',
                  fontWeight: activeTab === 'transfer' ? '600' : '400'
                }}
              >
                Transfer Money
              </button>
              <button 
                onClick={() => setActiveTab('deposit')}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                  borderBottom: activeTab === 'deposit' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'deposit' ? 'var(--primary)' : 'var(--foreground)',
                  fontWeight: activeTab === 'deposit' ? '600' : '400'
                }}
              >
                Deposit Funds
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {activeTab === 'transfer' ? (
              cards.length === 0 ? (
                <div className={styles.emptyCard}>
                  <h2>No active cards</h2>
                  <p>You need an active verified card before making card-to-card transfers.</p>
                  <button type="button" onClick={() => router.push('/dashboard/cards')} className={styles.btnPrimary}>Go to cards</button>
                </div>
              ) : (
              <form onSubmit={handleTransfer} className={styles.form} noValidate>
                <div className={styles.inputGroup}>
                  <label>From Card</label>
                  <select 
                    value={senderCardId} 
                    onChange={(e) => setSenderCardId(e.target.value)}
                    required
                  >
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.cardNumberMasked} ({card.cardType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Recipient Card Number</label>
                  <input 
                    type="text" 
                    value={receiverCardNumber} 
                    onChange={(e) => setReceiverCardNumber(e.target.value)}
                    placeholder="Enter 16-digit card number"
                    required
                  />
                </div>

                <div className={styles.rowGroup}>
                  <div className={styles.inputGroup} style={{ flex: 2 }}>
                    <label>Amount</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100.00"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label>Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option value="AZN">AZN</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={sending} className={styles.submitBtn}>
                  {sending ? 'Sending...' : 'Send Money'}
                </button>
              </form>
              )
            ) : (
              accounts.length === 0 ? (
                <div className={styles.emptyCard}>
                  <h2>You have no active accounts 🏦</h2>
                  <p>Your account is pending creation or verification. You will be able to deposit funds once your account is active.</p>
                </div>
              ) : (
                <form onSubmit={handleDeposit} className={styles.form} noValidate>
                  <div className={styles.inputGroup}>
                    <label>To Account</label>
                    <select 
                      value={depositAccountId} 
                      onChange={(e) => setDepositAccountId(e.target.value)}
                      required
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.iban || acc.id} ({acc.balance.toLocaleString('en-US')} {acc.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.rowGroup}>
                    <div className={styles.inputGroup} style={{ flex: 2 }}>
                      <label>Amount</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0.01"
                        value={depositAmount} 
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="100.00"
                        required
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label>Currency</label>
                      <select value={depositCurrency} onChange={(e) => setDepositCurrency(e.target.value)}>
                        <option value="AZN">AZN</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={sending} className={styles.submitBtn}>
                    {sending ? 'Processing...' : 'Deposit Funds'}
                  </button>
                </form>
              )
            )}
          </>
        )}
      </div>

      {showConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
          <div className={`${styles.confirmModal} glass`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Confirm Transaction</h2>
              <button onClick={() => setShowConfirm(false)} className={styles.closeBtn}>×</button>
            </div>
            
            <div className={styles.confirmDetails}>
              {pendingAction === 'transfer' ? (
                <>
                  <p>You are about to transfer:</p>
                  <h3 className={styles.amountText}>{amount} {currency}</h3>
                  <div className={styles.detailRow}>
                    <span>From Card:</span>
                    <span className={styles.mono}>{cards.find(c => c.id === senderCardId)?.cardNumberMasked}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span>To Card Number:</span>
                    <span className={styles.mono}>{receiverCardNumber}</span>
                  </div>
                </>
              ) : (
                <>
                  <p>You are about to deposit:</p>
                  <h3 className={styles.amountText}>{depositAmount} {depositCurrency}</h3>
                  <div className={styles.detailRow}>
                    <span>To Account:</span>
                    <span className={styles.mono}>{accounts.find(a => a.id === depositAccountId)?.iban || depositAccountId}</span>
                  </div>
                </>
              )}
              <div className={styles.warningBox}>
                ⚠️ Please verify the details above. Transactions cannot be easily reversed once completed.
              </div>
            </div>

            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowConfirm(false)} 
                className={styles.cancelBtn}
                disabled={sending}
              >
                Cancel
              </button>
              <button 
                onClick={pendingAction === 'transfer' ? executeTransfer : executeDeposit} 
                className={styles.confirmBtn}
                disabled={sending}
              >
                {sending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
