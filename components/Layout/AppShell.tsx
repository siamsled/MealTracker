'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingCart, 
  BookOpen, 
  History, 
  Settings, 
  ChefHat, 
  Clock, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Download,
  User as UserIcon,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  Camera,
  KeyRound,
  Check
} from 'lucide-react';
import { compressReceiptImage } from '@/lib/imageCompressor';

interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'flatmate' | 'cook';
}

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [cutoffData, setCutoffData] = useState<{ isLockedToday: boolean; timeRemainingFormatted: string; cutoffTimeString: string } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile Settings Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  useEffect(() => {
    fetchSession();
    fetchCutoff();

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration error:', err));
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const timer = setInterval(() => fetchCutoff(), 1000);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearInterval(timer);
    };
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  async function fetchSession() {
    // Both /login and /cook are public pages
    if (pathname === '/login' || pathname === '/cook') return;
    try {
      const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('mt_session_user_id') : null;
      const headers: Record<string, string> = {};
      if (storedUserId) {
        headers['x-user-id'] = storedUserId;
      }

      const res = await fetch('/api/auth', { headers });
      const data = await res.json();
      if (data.authenticated && data.currentUser) {
        setCurrentUser(data.currentUser);
        try {
          localStorage.setItem('mt_session_user_id', data.currentUser.id);
        } catch (_) {}
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error(err);
      router.push('/login');
    }
  }

  async function handleAvatarUpload(file: File) {
    try {
      const compressed = await compressReceiptImage(file);
      setProfileAvatar(compressed.base64);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          avatar: profileAvatar,
          newPassword: newPassword.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        setProfileSuccessMsg('Profile updated successfully!');
        setTimeout(() => {
          setShowProfileModal(false);
          setProfileSuccessMsg('');
          setNewPassword('');
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleLogout() {
    try {
      try {
        localStorage.removeItem('mt_session_user_id');
        localStorage.removeItem('mt_session_user_name');
      } catch (_) {}
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
  }

  async function fetchCutoff(userFromUrl?: string | null) {
    try {
      const url = userFromUrl ? `/api/dashboard?user=${userFromUrl}` : '/api/dashboard';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.cutoff) {
        const remaining = data.cutoff.msUntilCutoff;
        let formatted = 'Locked';
        if (!data.cutoff.isLockedToday && remaining > 0) {
          const totalSeconds = Math.floor(remaining / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        setCutoffData({
          isLockedToday: data.cutoff.isLockedToday,
          timeRemainingFormatted: formatted,
          cutoffTimeString: data.cutoff.cutoffTime
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSwitchUser(userId: string) {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        if (data.user.role === 'cook') {
          window.location.href = `/cook?user=${data.user.id}`;
        } else if (pathname === '/cook') {
          window.location.href = `/?user=${data.user.id}`;
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleInstallPwa() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }

  const isAdmin = currentUser?.role === 'admin';

  // 1. On Login page, render clean full-screen view without sidebar/topbar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // 2. Public Direct Link for Khala (/cook): Clean, standalone, no login needed, no sidebar, no clutter
  if (pathname === '/cook') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px 12px' }}>
        <main style={{ maxWidth: '640px', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    );
  }

  // If a Cook user is authenticated and attempts to access any route other than /cook, immediately lock to /cook
  if (currentUser?.role === 'cook') {
    if (typeof window !== 'undefined') {
      window.location.href = '/cook';
    }
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px 12px' }}>
        <main style={{ maxWidth: '640px', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    );
  }

  // 3. If not logged in yet on protected pages, render clean loading / redirect container
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1117' }}>
        <div style={{ color: '#8b949e', fontSize: '14px', fontWeight: 600 }}>Loading...</div>
      </div>
    );
  }

  // Role-tailored navigation items: flatmates do not get Cook View in their private sidebar
  let navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'My Meals', href: '/meals', icon: Utensils },
    { name: 'Bazaar', href: '/bazaar', icon: ShoppingCart },
    { name: 'Ledger', href: '/ledger', icon: BookOpen },
  ];

  if (isAdmin) {
    navItems = [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'All Meals (Override)', href: '/meals', icon: Utensils },
      { name: 'Bazaar Records', href: '/bazaar', icon: ShoppingCart },
      { name: 'Permanent Ledger', href: '/ledger', icon: BookOpen },
      { name: 'Cook View', href: '/cook', icon: ChefHat },
      { name: 'Household Admin', href: '/admin', icon: Settings },
    ];
  }

  return (
    <div className="app-layout">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: '#111418', color: '#fff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
              ৳
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '-0.2px' }}>MealTracker</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Continuous Food Ledger</div>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="btn btn-sm"
            style={{ display: isMobileMenuOpen ? 'flex' : 'none', padding: '4px' }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Active Profile Info */}
        <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Profile</div>
          <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px' }}>
            {currentUser?.name || 'Loading...'}
          </div>
          {isAdmin && (
            <div style={{ fontSize: '11px', color: '#c92a2a', fontWeight: 700, marginTop: '2px' }}>
              🛡️ Administrator Mode
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-primary-light)' : 'transparent',
                  marginBottom: '3px',
                  transition: 'all 0.1s ease'
                }}
              >
                <Icon size={16} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Cutoff Status Box */}
        <div style={{ padding: '12px', margin: '8px', backgroundColor: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '4px' }}>
            <Clock size={14} color={cutoffData?.isLockedToday ? '#c92a2a' : '#2b8a3e'} />
            <span>06:00 AM Cutoff</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
            {cutoffData?.isLockedToday ? (
              <span style={{ color: 'var(--color-behind)', fontWeight: '600' }}>Locked for today</span>
            ) : (
              <span>Lock in: <strong>{cutoffData?.timeRemainingFormatted || '--:--:--'}</strong></span>
            )}
          </div>
        </div>

        {/* Logout button at bottom of sidebar */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          <button
            onClick={handleLogout}
            className="btn btn-sm"
            style={{
              width: '100%',
              gap: '6px',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              fontWeight: 700
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {installPrompt && (
          <div style={{ padding: '8px' }}>
            <button
              onClick={handleInstallPwa}
              className="btn btn-sm"
              style={{ width: '100%', gap: '6px', justifyContent: 'center', backgroundColor: '#eef6ff', color: '#0969da', borderColor: '#0969da' }}
            >
              <Download size={13} />
              Install PWA App
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-bar" style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 20px',
          height: '56px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left Title / Context (Only show mobile hamburger on mobile, clean breadcrumb on desktop) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="show-on-mobile"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'none', alignItems: 'center', color: '#1e293b' }}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '3px 8px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#334155',
                letterSpacing: '0.2px'
              }}>
                Flat 6A
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }} className="hide-on-mobile">
                Household Mess
              </span>
            </div>
          </div>

          {/* Logged in User Profile Chip & Modal Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={() => {
                setProfileAvatar(currentUser?.avatar || '');
                setShowProfileModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px 4px 4px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Click to edit profile or change password"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#e0e7ff',
                  color: '#4338ca',
                  fontWeight: 800,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                {currentUser?.name || 'User'}
              </span>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            </button>

            <button
              onClick={handleLogout}
              className="btn btn-sm"
              style={{
                padding: '5px 9px',
                fontSize: '11.5px',
                fontWeight: 700,
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                borderRadius: '6px',
                gap: '4px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="Sign Out"
            >
              <LogOut size={13} />
              <span className="hide-on-mobile">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Profile & Password Modal */}
        {showProfileModal && (
          <div className="modal-overlay" style={{ zIndex: 99999, backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
            <div className="modal-dialog" style={{
              maxWidth: '400px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Profile &amp; Security
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Personalize your Flat 6A account
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile}>
                {profileSuccessMsg && (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Check size={14} />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {/* Avatar Preview & Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    {profileAvatar ? (
                      <img
                        src={profileAvatar}
                        alt="Profile Preview"
                        style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366f1', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)' }}
                      />
                    ) : (
                      <div style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                        color: '#ffffff',
                        fontSize: '32px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(99, 102, 241, 0.25)'
                      }}>
                        {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <label
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        background: '#0f172a',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        border: '2px solid #ffffff'
                      }}
                      title="Upload profile picture"
                    >
                      <Camera size={13} />
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleAvatarUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    Tap camera to change photo
                  </div>
                </div>

                {/* Account Details */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={currentUser?.name || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                {/* Change Password */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    New Password / PIN (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Example: 111, 222, 333, or custom PIN
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    style={{
                      fontSize: '12.5px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    style={{
                      fontSize: '12.5px',
                      padding: '7px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: profileSaving ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Page Container */}
        <main className="page-container">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <Link href="/" className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Home</span>
        </Link>
        <Link href="/meals" className={`mobile-nav-item ${pathname === '/meals' ? 'active' : ''}`}>
          <Utensils size={18} />
          <span>Meals</span>
        </Link>
        <Link href="/bazaar" className={`mobile-nav-item ${pathname === '/bazaar' ? 'active' : ''}`}>
          <ShoppingCart size={18} />
          <span>Bazaar</span>
        </Link>
        <Link href="/ledger" className={`mobile-nav-item ${pathname === '/ledger' ? 'active' : ''}`}>
          <BookOpen size={18} />
          <span>Ledger</span>
        </Link>
        {isAdmin && (
          <Link href="/admin" className={`mobile-nav-item ${pathname === '/admin' ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
