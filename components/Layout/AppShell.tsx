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
  LogOut
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
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

      {/* Main Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '13.5px', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Flat 6A MealTracker
            </div>
          </div>

          {/* Logged in User Indicator & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: 'var(--bg-surface-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
              <span>{currentUser?.name || 'User'}</span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-sm"
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                gap: '4px'
              }}
              title="Sign Out"
            >
              <LogOut size={13} />
              <span className="hide-on-mobile">Sign Out</span>
            </button>
          </div>
        </header>

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
