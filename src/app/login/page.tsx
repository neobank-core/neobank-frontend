'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import api from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/auth/login', {
        username,
        password,
      });

      if (response.data.accessToken) {
        localStorage.setItem('access_token', response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem('refresh_token', response.data.refreshToken);
        }
        router.push('/dashboard');
      } else {
        setError('Failed to get token. Please check your credentials.');
      }
    } catch (err) {
      if ((err as any).response?.status === 401 || ((err as any).response?.data?.message && (err as any).response.data.message.includes('401'))) {
        setError('Invalid username or password');
      } else if ((err as any).response?.data?.message) {
        try {
          // If message is a JSON string, try to parse it to get a cleaner description
          const parsed = JSON.parse((err as any).response.data.message.replace(/^[^{]*/, ''));
          setError(parsed.error_description || 'An error occurred during authorization');
        } catch {
          setError((err as any).response.data.message);
        }
      } else {
        setError('An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.loginBox} glass`}>
        <div className={styles.logo}>NeoBank</div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account to continue</p>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form} noValidate>
          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          
          <div className={styles.footer}>
            Don't have an account? <a href="/register">Sign up</a>
          </div>
        </form>
      </div>
    </div>
  );
}
