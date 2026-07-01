'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../login/login.module.css'; // Reusing login styles
import api from '@/services/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.username || !formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.phone) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/auth/register', formData);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      if ((err as any).response && (err as any).response.data && (err as any).response.data.message) {
        setError((err as any).response.data.message);
      } else {
        setError('Error during registration. Please check your data.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={`${styles.loginBox} glass`} style={{ textAlign: 'center' }}>
          <div className={styles.logo}>NeoBank</div>
          <h1 className={styles.title} style={{ color: 'var(--success)' }}>Success!</h1>
          <p className={styles.subtitle}>Account created. You will now be redirected to the login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.loginBox} glass`}>
        <div className={styles.logo}>NeoBank</div>
        <h1 className={styles.title}>Create an account</h1>
        <p className={styles.subtitle}>Join the bank of the future</p>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleRegister} className={styles.form} noValidate>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className={styles.inputGroup} style={{ flex: 1 }}>
              <label htmlFor="firstName">First Name</label>
              <input id="firstName" type="text" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className={styles.inputGroup} style={{ flex: 1 }}>
              <label htmlFor="lastName">Last Name</label>
              <input id="lastName" type="text" value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input id="username" type="text" value={formData.username} onChange={handleChange} required />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="phone">Phone number</label>
            <input id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+1234567890" required />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={formData.password} onChange={handleChange} required />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Registering...' : 'Sign Up'}
          </button>
          
          <div className={styles.footer}>
            Already have an account? <a href="/login">Sign In</a>
          </div>
        </form>
      </div>
    </div>
  );
}
