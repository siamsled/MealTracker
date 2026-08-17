'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  ShoppingCart, 
  Utensils, 
  History, 
  Filter, 
  Calendar, 
  User as UserIcon,
  ShieldCheck,
  Download,
  AlertCircle,
  Image as ImageIcon,
  X
} from 'lucide-react';

const FLATMATE_CANDY_THEMES: Record<string, { bg: string; text: string; border: string; cellBg: string; pillBg: string; pillBorder: string }> = {
  'usr-jubayer': {
    bg: '#fff7ed',      // Warm Peach / Honey Candy
    text: '#c2410c',
    border: '#fdba74',
    cellBg: '#fffbf5',
    pillBg: '#ffedd5',
    pillBorder: '#fed7aa'
  },
  'usr-raian': {
    bg: '#f0fdf4',      // Soothing Mint / Emerald Candy
    text: '#15803d',
    border: '#86efac',
    cellBg: '#f6fef9',
    pillBg: '#dcfce7',
    pillBorder: '#bbf7d0'
  },
  'usr-raiyan': {
    bg: '#f0fdf4',
    text: '#15803d',
    border: '#86efac',
    cellBg: '#f6fef9',
    pillBg: '#dcfce7',
    pillBorder: '#bbf7d0'
  },
  'usr-siam': {
    bg: '#faf5ff',      // Soothing Lavender / Berry Candy
    text: '#7e22ce',
    border: '#d8b4fe',
    cellBg: '#fcfaff',
    pillBg: '#f3e8ff',
    pillBorder: '#e9d5ff'
  }
};

function getCandyTheme(userId: string, userName: string) {
  if (FLATMATE_CANDY_THEMES[userId]) return FLATMATE_CANDY_THEMES[userId];
  const nameLower = (userName || '').toLowerCase();
  if (nameLower.includes('jubayer')) return FLATMATE_CANDY_THEMES['usr-jubayer'];
  if (nameLower.includes('raian') || nameLower.includes('raiyan')) return FLATMATE_CANDY_THEMES['usr-raian'];
  if (nameLower.includes('siam')) return FLATMATE_CANDY_THEMES['usr-siam'];
  return {
    bg: '#f8fafc',
    text: '#0284c7',
    border: '#bae6fd',
    cellBg: '#f0f9ff',
    pillBg: '#e0f2fe',
    pillBorder: '#bae6fd'
  };
}

function highlightMatch(text: string, query: string) {
  if (!query.trim() || !text) return text;
  const q = query.trim();
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.substring(0, index)}
      <mark style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0 2px', borderRadius: '2px', fontWeight: 800 }}>
        {text.substring(index, index + q.length)}
      </mark>
      {text.substring(index + q.length)}
    </>
  );
}

export default function LedgerView() {
  const [bazaarEntries, setBazaarEntries] = useState<any[]>([]);
  const [dailyMealRecords, setDailyMealRecords] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [memberBreakdowns, setMemberBreakdowns] = useState<any[]>([]);
  const [viewingReceipts, setViewingReceipts] = useState<{ entry: any; activeIndex: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'bazaar' | 'meals' | 'activity'
  const [activeTab, setActiveTab] = useState<'bazaar' | 'meals' | 'activity'>('bazaar');

  // Filters & Search
  const [filterMonth, setFilterMonth] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLedger();
  }, [filterMonth, filterUser]);

  async function fetchLedger() {
    setLoading(true);
    try {
      let url = `/api/ledger?`;
      if (filterMonth) url += `month=${filterMonth}&`;
      if (filterUser) url += `userId=${filterUser}&`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setBazaarEntries(json.bazaarEntries || []);
        setDailyMealRecords(json.dailyMealRecords || []);
        setActivityLogs(json.activityLogs || []);
        setUsers(json.users || []);
        setSummary(json.summary || null);
        setMemberBreakdowns(json.memberBreakdowns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Active Filtered Views with Search
  const selectedUserName = users.find((u: any) => u.id === filterUser)?.name || '';

  const filteredBazaar = bazaarEntries.filter(b => {
    if (filterUser && b.paid_by_user_id !== filterUser) return false;
    if (filterMonth && !b.date.startsWith(filterMonth)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = b.description?.toLowerCase().includes(q);
      const matchPayer = b.paid_by_user_name?.toLowerCase().includes(q);
      const matchAmount = b.amount?.toString().includes(q);
      const matchDate = b.date?.includes(q);
      return matchDesc || matchPayer || matchAmount || matchDate;
    }
    return true;
  });

  const filteredMeals = dailyMealRecords.filter(d => {
    if (filterMonth && !d.date.startsWith(filterMonth)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDate = d.date?.includes(q);
      const matchSpecials = (d.specials || []).some((s: any) => 
        s.item_name?.toLowerCase().includes(q) || s.user_name?.toLowerCase().includes(q)
      );
      return matchDate || matchSpecials;
    }
    return true;
  });

  const filteredActivity = activityLogs.filter(a => {
    if (filterMonth && !a.timestamp?.startsWith(filterMonth)) return false;
    if (filterUser) {
      const matchUserId = a.user_id === filterUser;
      const matchName = selectedUserName && (
        (a.user_name && a.user_name.toLowerCase() === selectedUserName.toLowerCase()) ||
        (a.reason && a.reason.toLowerCase().includes(selectedUserName.toLowerCase())) ||
        (a.after_value && a.after_value.toLowerCase().includes(selectedUserName.toLowerCase()))
      );
      if (!matchUserId && !matchName) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReason = a.reason?.toLowerCase().includes(q);
      const matchUser = a.user_name?.toLowerCase().includes(q);
      const matchAction = a.action?.toLowerCase().includes(q);
      const matchBefore = a.before_value?.toLowerCase().includes(q);
      const matchAfter = a.after_value?.toLowerCase().includes(q);
      const matchTime = a.timestamp?.includes(q);
      return matchReason || matchUser || matchAction || matchBefore || matchAfter || matchTime;
    }
    return true;
  });

  return (
    <div>
      {/* Top Banner */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Household Permanent Ledger</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Continuous audit trail of bazaar purchases, daily meal counts, and all user alterations.
            </div>
          </div>

          {/* Tab Switcher: Bazaar Records, Meal Counts, Activity */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface-alt)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-color)', overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
            <button
              onClick={() => setActiveTab('bazaar')}
              className="btn btn-sm"
              style={{
                flex: '1 0 auto',
                backgroundColor: activeTab === 'bazaar' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'bazaar' ? '#ffffff' : 'var(--text-primary)',
                border: 'none',
                fontWeight: activeTab === 'bazaar' ? 700 : 500,
                fontSize: '12px',
                padding: '6px 10px',
                whiteSpace: 'nowrap'
              }}
            >
              <ShoppingCart size={13} />
              Bazaar ({filteredBazaar.length})
            </button>
            <button
              onClick={() => setActiveTab('meals')}
              className="btn btn-sm"
              style={{
                flex: '1 0 auto',
                backgroundColor: activeTab === 'meals' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'meals' ? '#ffffff' : 'var(--text-primary)',
                border: 'none',
                fontWeight: activeTab === 'meals' ? 700 : 500,
                fontSize: '12px',
                padding: '6px 10px',
                whiteSpace: 'nowrap'
              }}
            >
              <Utensils size={13} />
              Meals ({filteredMeals.length}d)
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className="btn btn-sm"
              style={{
                flex: '1 0 auto',
                backgroundColor: activeTab === 'activity' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'activity' ? '#ffffff' : 'var(--text-primary)',
                border: 'none',
                fontWeight: activeTab === 'activity' ? 700 : 500,
                fontSize: '12px',
                padding: '6px 10px',
                whiteSpace: 'nowrap'
              }}
            >
              <History size={13} />
              Activity ({filteredActivity.length})
            </button>
          </div>
        </div>
      </div>

      {/* Summary 3 Core KPI Cards (Clean, exact factual metrics) */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div className="card" style={{ padding: '12px', marginBottom: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Bazaar ({filterMonth || 'All Time'})
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#2b8a3e', marginTop: '4px' }} className="tabular-nums">
              ৳{summary.totalBazaar.toLocaleString()}
            </div>
          </div>

          <div className="card" style={{ padding: '12px', marginBottom: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Meals Consumed
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }} className="tabular-nums">
              🍚 {summary.totalMealsConsumed} meals
            </div>
          </div>

          <div className="card" style={{ padding: '12px', marginBottom: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Current Meal Rate
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }} className="tabular-nums">
              ৳{summary.estimatedMealCost.toFixed(2)} / meal
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ padding: '12px 14px', marginBottom: '14px', backgroundColor: 'var(--bg-surface-alt)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Month Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '220px', flex: '1 1 auto' }}>
            <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Month:</span>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="form-control"
              style={{ padding: '6px 8px', fontSize: '12px', flex: 1, minWidth: '130px' }}
            />
            {filterMonth && (
              <button 
                onClick={() => setFilterMonth('')} 
                className="btn btn-sm" 
                style={{ fontSize: '11px', padding: '5px 8px', whiteSpace: 'nowrap' }}
                title="View all-time"
              >
                All-Time
              </button>
            )}
          </div>

          {/* Flatmate Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '180px', flex: '1 1 auto' }}>
            <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Flatmate:</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="form-control"
              style={{ padding: '6px 8px', fontSize: '12px', width: '100%', minWidth: '120px' }}
            >
              <option value="">All Flatmates</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Full-Width Search Input */}
        <div style={{ marginTop: '10px', position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Search items, notes, flatmates, amounts, or audit actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ padding: '8px 32px 8px 10px', fontSize: '13px', width: '100%', borderRadius: '6px' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px',
                lineHeight: 1
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Bazaar Records Table */}
      {activeTab === 'bazaar' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Bazaar Records ({bazaarEntries.length})</span>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading bazaar records...</div>
          ) : filteredBazaar.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No bazaar records found for this filter.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Date</th>
                    <th style={{ width: '130px' }}>Paid By</th>
                    <th>Items / Description</th>
                    <th style={{ width: '110px' }}>Receipts</th>
                    <th className="num-col" style={{ width: '140px' }}>Amount (৳ BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBazaar.map((b) => {
                    const hasReceipts = b.receipt_images && b.receipt_images.length > 0;
                    return (
                      <tr key={b.id}>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {highlightMatch(b.date, searchQuery)}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {highlightMatch(b.paid_by_user_name, searchQuery)}
                        </td>
                        <td>
                          {highlightMatch(b.description, searchQuery)}
                        </td>
                        <td>
                          {hasReceipts ? (
                            <button
                              onClick={() => setViewingReceipts({ entry: b, activeIndex: 0 })}
                              className="btn btn-sm"
                              style={{ 
                                fontSize: '11px', 
                                padding: '3px 8px', 
                                backgroundColor: '#e0f2fe', 
                                color: '#0369a1', 
                                borderColor: '#bae6fd',
                                fontWeight: 700,
                                gap: '4px'
                              }}
                            >
                              <ImageIcon size={12} />
                              🧾 {b.receipt_images.length}
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="num-col" style={{ fontWeight: 800, color: '#2b8a3e', fontSize: '14px' }}>
                          +৳{b.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Daily Meal Counts Matrix Table */}
      {activeTab === 'meals' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Daily Meal Count Records ({dailyMealRecords.length} days)</span>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading meal counts...</div>
          ) : dailyMealRecords.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No meal records found for this filter.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Date</th>
                    {users.map(u => {
                      const theme = getCandyTheme(u.id, u.name);
                      return (
                        <th 
                          key={u.id} 
                          className="num-col" 
                          style={{ 
                            width: '120px',
                            backgroundColor: theme.bg,
                            borderBottom: `2px solid ${theme.border}`,
                            color: theme.text,
                            fontWeight: 800
                          }}
                        >
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: theme.pillBg,
                            border: `1px solid ${theme.pillBorder}`,
                            fontSize: '12px'
                          }}>
                            {u.name}
                          </span>
                        </th>
                      );
                    })}
                    <th className="num-col" style={{ width: '130px' }}>Total Meals</th>
                    <th>Dish / Cooking Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyMealRecords.map((d) => (
                    <tr key={d.date}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{d.date}</td>
                      {users.map(u => {
                        const theme = getCandyTheme(u.id, u.name);
                        const count = d.userMealMap[u.id] ?? 0;
                        return (
                          <td 
                            key={u.id} 
                            className="num-col" 
                            style={{ 
                              backgroundColor: theme.cellBg,
                              borderLeft: `1px solid ${theme.border}22`,
                              borderRight: `1px solid ${theme.border}22`,
                              fontWeight: 700
                            }}
                          >
                            {count > 0 ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '30px',
                                height: '26px',
                                padding: '0 8px',
                                borderRadius: '13px',
                                backgroundColor: theme.pillBg,
                                color: theme.text,
                                border: `1px solid ${theme.pillBorder}`,
                                fontWeight: 800,
                                fontSize: '13px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}>
                                {count}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px', opacity: 0.5 }}>0</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="num-col" style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '14px' }}>
                        🍚 {d.totalMeals}
                      </td>
                      <td>
                        {d.specials && d.specials.length > 0 ? (
                          <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                            {d.specials.map((s: any) => `${s.item_name} (${s.user_name})`).join(', ')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Activity / Alterations Audit Trail */}
      {activeTab === 'activity' && (
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">User Alterations &amp; Activity Log ({filteredActivity.length})</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Complete transparent audit trail of all bazaar recordings, typos corrected, and alterations made by users.
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading activity log...</div>
          ) : filteredActivity.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No alteration activity recorded for this filter.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '140px' }}>Date &amp; Time</th>
                    <th style={{ width: '120px' }}>Flatmate</th>
                    <th style={{ width: '150px' }}>Action</th>
                    <th>Audit Note / Reason</th>
                    <th style={{ width: '220px' }}>Before &rarr; After</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivity.map((a) => (
                    <tr key={a.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600 }}>
                        {highlightMatch(a.timestamp ? a.timestamp.replace('T', ' ').slice(0, 16) : '—', searchQuery)}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {highlightMatch(a.user_name, searchQuery)}
                      </td>
                      <td>
                        <span className={`badge ${a.action.includes('CORRECT') ? 'badge-warning' : 'badge-ahead'}`}>
                          {a.action === 'CORRECT_BAZAAR' ? 'Bazaar Correction' : a.action === 'RECORD_BAZAAR' ? 'Bazaar Added' : a.action === 'CANCEL_COMMITMENT' ? 'Commitment Cancelled' : a.action}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {highlightMatch(a.reason, searchQuery)}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {a.before_value ? (
                          <span>
                            <span style={{ textDecoration: 'line-through', color: '#e03131' }}>{a.before_value}</span>
                            {' '}&rarr;{' '}
                            <span style={{ fontWeight: 700, color: '#2b8a3e' }}>{a.after_value}</span>
                          </span>
                        ) : (
                          <span style={{ fontWeight: 600, color: '#2b8a3e' }}>{a.after_value}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal: View High-Res Receipt Images */}
      {viewingReceipts && viewingReceipts.entry.receipt_images && (
        <div className="modal-overlay" onClick={() => setViewingReceipts(null)} style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000 }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', backgroundColor: '#111418', color: '#fff', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f0f6fc' }}>
                  Receipt for {viewingReceipts.entry.description}
                </h3>
                <div style={{ fontSize: '12px', color: '#8b949e' }}>
                  Paid by {viewingReceipts.entry.paid_by_user_name} &bull; ৳{viewingReceipts.entry.amount.toLocaleString()} &bull; {viewingReceipts.entry.date}
                </div>
              </div>
              <button 
                onClick={() => setViewingReceipts(null)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', minHeight: '320px', maxHeight: '70vh' }}>
              <img
                src={viewingReceipts.entry.receipt_images[viewingReceipts.activeIndex]}
                alt="Receipt Full View"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>

            {/* Multi-image thumbnail switcher if more than 1 image */}
            {viewingReceipts.entry.receipt_images.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                {viewingReceipts.entry.receipt_images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setViewingReceipts(prev => prev ? { ...prev, activeIndex: idx } : null)}
                    style={{
                      border: idx === viewingReceipts.activeIndex ? '2px solid var(--accent-primary)' : '1px solid #484f58',
                      borderRadius: '4px',
                      padding: '2px',
                      background: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '2px' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
