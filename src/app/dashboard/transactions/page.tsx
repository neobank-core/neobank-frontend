'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import styles from './transactions.module.css';

interface Transaction {
  id: string;
  senderCardId: string;
  receiverCardId: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [txDetails, setTxDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchMyCards();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [status, type, search, startDate, endDate, page]);

  const fetchMyCards = async () => {
    try {
      const res = await api.get('/api/cards/my');
      setMyCards(res.data.map((c: any) => c.id));
    } catch (err) {
      console.error('Failed to fetch my cards', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('size', '10');
      params.append('sort', 'createdAt,desc');
      if (status) params.append('status', status);
      if (type) params.append('type', type);
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append('endDate', end.toISOString());
      }

      const res = await api.get(`/api/transactions/my?${params.toString()}`);
      setTransactions(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (s: string) => {
    if (s === 'COMPLETED') return styles.statusCompleted;
    if (s === 'FAILED') return styles.statusFailed;
    return styles.statusPending;
  };

  const getTypeIcon = (t: string, isSelfTransfer?: boolean) => {
    if (isSelfTransfer) return '🔄';
    if (t === 'DEPOSIT') return '⬇️';
    if (t === 'TRANSFER_OUT') return '💸';
    if (t === 'TRANSFER_IN') return '📥';
    return '🔄';
  };

  const handleRowClick = async (id: string) => {
    setSelectedTxId(id);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/transactions/${id}`);
      setTxDetails(res.data);
    } catch (err) {
      console.error('Failed to load tx details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.append('size', '1000'); // Export up to 1000
      params.append('sort', 'createdAt,desc');
      if (status) params.append('status', status);
      if (type) params.append('type', type);
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append('endDate', end.toISOString());
      }

      const res = await api.get(`/api/transactions/my?${params.toString()}`);
      const txs = res.data.content;

      if (txs.length === 0) {
        alert('No transactions to export.');
        return;
      }

      const headers = ['ID', 'Type', 'Amount', 'Currency', 'Status', 'Date', 'Sender Card', 'Receiver Card'];
      const csvRows = [headers.join(',')];

      for (const tx of txs) {
        const row = [
          tx.id,
          tx.type,
          tx.amount,
          tx.currency,
          tx.status,
          new Date(tx.createdAt).toISOString(),
          tx.senderCardId || '',
          tx.receiverCardId || ''
        ];
        csvRows.push(row.join(','));
      }

      const blob = new Blob([csvRows.join('\\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV', error);
      alert('Failed to export CSV');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Transaction History</h1>

      <div className={`${styles.filterBox} glass`}>
        <div className={styles.filterGroup}>
          <label>Search</label>
          <input 
            type="text" 
            placeholder="Search ID..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className={styles.inputField}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>From Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            className={styles.inputField}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>To Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            className={styles.inputField}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Transaction Type</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>
            <option value="">All</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
            <option value="TRANSFER_IN">Transfer In</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div className={styles.filterGroup} style={{ alignSelf: 'flex-end' }}>
          <button 
            onClick={exportToCSV}
            style={{ padding: '0.6rem 1rem', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
          >
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      <div className={`${styles.tableBox} glass`}>
        {loading && <div className={styles.loadingOverlay}>Loading...</div>}
        
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Transaction ID</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => {
              const isSelfTransfer = tx.type.startsWith('TRANSFER') && 
                                     myCards.includes(tx.senderCardId) && 
                                     myCards.includes(tx.receiverCardId);
              
              return (
              <tr key={tx.id} onClick={() => handleRowClick(tx.id)} className={styles.tableRow}>
                <td>
                  <span className={styles.icon}>{getTypeIcon(tx.type, isSelfTransfer)}</span>
                  {isSelfTransfer ? 'Transfer (Self)' : tx.type === 'DEPOSIT' ? 'Deposit' : tx.type === 'TRANSFER_IN' ? 'Transfer In' : 'Transfer Out'}
                </td>
                <td className={`${styles.amount} ${isSelfTransfer ? '' : tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN' ? styles.positive : styles.negative}`}>
                  {isSelfTransfer ? '' : tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN' ? '+' : '-'}{tx.amount.toLocaleString('en-US')} {tx.currency}
                </td>
                <td>{new Date(tx.createdAt).toLocaleString('en-US')}</td>
                <td>
                  <span className={`${styles.badge} ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </td>
                <td className={styles.txId}>{tx.id.split('-')[0]}...</td>
              </tr>
            )})}
          </tbody>
        </table>

        {!loading && transactions.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📋</div>
            <h3>No transactions found</h3>
            <p>You haven't made any transactions matching these filters yet.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              disabled={page === 0} 
              onClick={() => setPage(p => p - 1)}
              className={styles.pageBtn}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
            <button 
              disabled={page >= totalPages - 1} 
              onClick={() => setPage(p => p + 1)}
              className={styles.pageBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTxId && (
        <div className={styles.modalOverlay} onClick={() => { setSelectedTxId(null); setTxDetails(null); }}>
          <div className={`${styles.modal} glass`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Transaction Details</h2>
              <button onClick={() => { setSelectedTxId(null); setTxDetails(null); }} className={styles.closeBtn}>×</button>
            </div>
            {loadingDetails ? (
              <div className={styles.loadingDetails}>Loading details...</div>
            ) : txDetails ? (
              <div className={styles.txDetailsBody}>
                {(() => {
                  const isSelfTransfer = txDetails.type?.startsWith('TRANSFER') && 
                                         myCards.includes(txDetails.senderCardId) && 
                                         myCards.includes(txDetails.receiverCardId);
                  return (
                    <div className={styles.txBigAmount} style={{ color: isSelfTransfer ? 'white' : undefined }}>
                      {isSelfTransfer ? '' : txDetails.type === 'DEPOSIT' || txDetails.type === 'TRANSFER_IN' ? '+' : '-'}{txDetails.amount.toLocaleString('en-US')} {txDetails.currency}
                    </div>
                  );
                })()}
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <label>Status</label>
                    <span className={`${styles.badge} ${getStatusColor(txDetails.status)}`}>{txDetails.status}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Date & Time</label>
                    <span>{new Date(txDetails.createdAt).toLocaleString('en-US')}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Transaction ID</label>
                    <span className={styles.mono}>{txDetails.id}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Type</label>
                    <span>{txDetails.type}</span>
                  </div>
                  {txDetails.senderCardId && (
                    <div className={styles.detailItem}>
                      <label>Sender Card ID</label>
                      <span className={styles.mono}>{txDetails.senderCardId}</span>
                    </div>
                  )}
                  {txDetails.receiverCardId && (
                    <div className={styles.detailItem}>
                      <label>Receiver Card ID</label>
                      <span className={styles.mono}>{txDetails.receiverCardId}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.errorDetails}>Failed to load details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
