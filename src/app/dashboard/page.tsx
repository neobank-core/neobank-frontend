'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import styles from './dashboard.module.css';

interface Account {
  id: string;
  iban: string;
  balance: number;
  currency: string;
  status: string;
}

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, txRes] = await Promise.all([
          api.get('/api/accounts/my'),
          api.get('/api/transactions/my?page=0&size=5')
        ]);
        
        if (accRes.data && accRes.data.length > 0) {
          setAccount(accRes.data[0]);  // { id, iban, balance, currency, status }
        }
        
        if (txRes.data && txRes.data.content) {
          setRecentTx(txRes.data.content);
        }
        
        try {
          const cardsRes = await api.get('/api/cards/my');
          setMyCards(cardsRes.data.map((c: any) => c.id));
        } catch (e) {
          console.error('Failed to fetch cards for dashboard', e);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownloadStatement = async () => {
    if (!account?.id) return;
    try {
      setDownloading(true);
      const res = await api.get(`/api/accounts/${account.id}/statement`);
      
      const transactions = res.data;
      let csvContent = "ID,Type,Amount,Currency,Date,Status,Description\n";
      
      transactions.forEach((tx: any) => {
        csvContent += `${tx.id},${tx.type},${tx.amount},${tx.currency},${tx.createdAt},${tx.status},"${tx.description || ''}"\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download statement', error);
      alert('Failed to download statement.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading data...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <div className={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        {account && (
          <button 
            className={styles.downloadBtn} 
            onClick={handleDownloadStatement}
            disabled={downloading}
          >
            {downloading ? 'Exporting...' : 'Export Statement CSV'}
          </button>
        )}
      </header>

      <div className={styles.grid}>
        <div className={`${styles.balanceCard} glass`}>
          <div className={styles.cardHeader}>Total Balance</div>
          <div className={styles.balance}>
            {account ? `${account.balance.toLocaleString('en-US')} ${account.currency}` : '0 AZN'}
          </div>
          {account && (
            <div className={styles.cardFooter}>
              Account status: <span className={account.status === 'ACTIVE' ? styles.statusActive : styles.statusOther}>{account.status}</span>
            </div>
          )}
        </div>

        <div className={`${styles.actionCard} glass`}>
          <div className={styles.actionIcon}>💸</div>
          <div className={styles.actionTitle}>Quick Transfer</div>
          <p className={styles.actionDesc}>Transfer money to another card</p>
          <a href="/dashboard/transfers" className={styles.actionBtn}>Go</a>
        </div>
        
        <div className={`${styles.actionCard} glass`}>
          <div className={styles.actionIcon}>💳</div>
          <div className={styles.actionTitle}>My Cards</div>
          <p className={styles.actionDesc}>Manage cards and limits</p>
          <a href="/dashboard/cards" className={styles.actionBtn}>Manage</a>
        </div>
      </div>
      
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Recent Transactions</h2>
        <a href="/dashboard/transactions" className={styles.viewAll}>View All</a>
      </div>
      
      <div className={`${styles.transactionsBox} glass`}>
        {recentTx.length > 0 ? (
          <div className={styles.txList}>
            {recentTx.map(tx => {
              const isSelfTransfer = tx.type?.startsWith('TRANSFER') && 
                                     myCards.includes(tx.senderCardId) && 
                                     myCards.includes(tx.receiverCardId);
              
              const isPositive = tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN';
              
              return (
              <div key={tx.id} className={styles.txItem}>
                <div className={styles.txIcon}>
                  {isSelfTransfer ? '🔄' : isPositive ? '↓' : '↑'}
                </div>
                <div className={styles.txDetails}>
                  <div className={styles.txType}>
                    {isSelfTransfer ? 'TRANSFER (SELF)' : tx.type?.replace('_', ' ')}
                  </div>
                  <div className={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                </div>
                <div className={`${styles.txAmount} ${isSelfTransfer ? '' : isPositive ? styles.positive : styles.negative}`}>
                  {isSelfTransfer ? '' : isPositive ? '+' : '-'}{tx.amount} {tx.currency}
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Nothing here yet. Make your first transfer!
          </div>
        )}
      </div>
    </div>
  );
}
