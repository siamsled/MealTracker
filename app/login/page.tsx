'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.user?.id) {
          try {
            localStorage.setItem('mt_session_user_id', data.user.id);
            localStorage.setItem('mt_session_user_name', data.user.name);
          } catch (_) {}
        }
        if (data.redirectPath) {
          window.location.href = data.redirectPath;
        } else if (data.user?.role === 'cook') {
          window.location.href = '/cook';
        } else if (data.user?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0d1117',
      color: '#f0f6fc',
      padding: '20px 16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '12px',
        padding: '28px 22px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#0969da',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 800,
            marginBottom: '12px'
          }}>
            ৳
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f0f6fc' }}>Flat 6A MealTracker</h1>
          <p style={{ fontSize: '13px', color: '#8b949e', marginTop: '4px' }}>
            Enter your credentials to access your dashboard
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: 'rgba(248, 81, 73, 0.15)',
            border: '1px solid rgba(248, 81, 73, 0.4)',
            borderRadius: '6px',
            color: '#f85149',
            fontSize: '13px',
            marginBottom: '16px',
            fontWeight: 600
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#8b949e', marginBottom: '6px', textTransform: 'uppercase' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  backgroundColor: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '14px',
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#8b949e', marginBottom: '6px', textTransform: 'uppercase' }}>
              Password / PIN
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
              <input
                type="password"
                placeholder="Enter password or PIN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  backgroundColor: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '14px',
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 16px',
              backgroundColor: '#238636',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(35, 134, 54, 0.4)'
            }}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
