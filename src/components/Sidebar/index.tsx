'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import api from '@/services/api';
import styles from './Sidebar.module.css';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: '🏠' },
  { path: '/dashboard/cards', label: 'My Cards', icon: '💳' },
  { path: '/dashboard/transfers', label: 'Transfers', icon: '💸' },
  { path: '/dashboard/transactions', label: 'History', icon: '📋' },
  { path: '/dashboard/profile', label: 'Profile', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Basic SSE implementation for notifications
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Use EventSource or polling if backend SSE is not fully supported yet
    // Since SSE requires full URL and token in query string or a custom fetch,
    // let's use short polling for now as a robust fallback until backend SSE is fully deployed
    const pollNotifications = async () => {
      try {
        const res = await api.get('/api/notifications/my');
        // Sort descending (newest first)
        const sorted = res.data.content.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(sorted);
        
        const unread = sorted.filter((n: any) => n.status !== 'READ');
        setUnreadCount(unread.length);
        
        // Check for new notifications to toast
        let maxTime = 0;
        if (sorted.length > 0) {
          maxTime = new Date(sorted[0].createdAt).getTime();
        }

        const lastCheckedStr = localStorage.getItem('last_notif_time_v2');
        if (!lastCheckedStr) {
          // First load: just set the maxTime to avoid toasting all old ones
          localStorage.setItem('last_notif_time_v2', maxTime.toString());
        } else {
          const lastCheckedTime = parseInt(lastCheckedStr);
          unread.forEach((notif: any) => {
            const notifTime = new Date(notif.createdAt).getTime();
            if (notifTime > lastCheckedTime) {
              toast.success(`${notif.subject}\n${notif.body}`, {
                duration: 5000,
                position: 'top-right',
                style: {
                  background: 'rgba(30, 41, 59, 0.9)',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }
              });
            }
          });
          if (maxTime > lastCheckedTime) {
            localStorage.setItem('last_notif_time_v2', maxTime.toString());
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  const handleReadNotification = async (id: string) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  return (
    <>
      <Toaster />
      <aside className={`${styles.sidebar} glass`}>
      <div className={styles.logo}>NeoBank</div>
      
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.notificationBell} onClick={handleOpenNotifications}>
          <span className={styles.icon}>🔔</span> Notifications
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <span className={styles.icon}>🚪</span> Logout
        </button>
      </div>
    </aside>

    {showNotifications && (
      <div className={styles.modalOverlay} onClick={() => setShowNotifications(false)}>
        <div className={`${styles.notificationsModal} glass`} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className={styles.markReadBtn}>
                Mark all as read
              </button>
            )}
            <button onClick={() => setShowNotifications(false)} className={styles.closeBtn}>×</button>
          </div>
          <div className={styles.notificationsList}>
            {notifications.length === 0 ? (
              <div className={styles.emptyNotifications}>No new notifications</div>
            ) : (
              notifications.map((notif: any) => (
                <div 
                  key={notif.id} 
                  className={`${styles.notificationItem} ${notif.status !== 'READ' ? styles.unread : ''}`}
                  onClick={() => { if(notif.status !== 'READ') handleReadNotification(notif.id) }}
                >
                  <div className={styles.notificationSubject}>{notif.subject}</div>
                  <div className={styles.notificationBody}>{notif.body}</div>
                  <div className={styles.notificationTime}>
                    {new Date(notif.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
