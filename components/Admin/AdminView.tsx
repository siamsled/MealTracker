'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  Users, 
  Clock, 
  ShieldCheck, 
  Download, 
  RotateCcw, 
  Save, 
  Check, 
  AlertCircle,
  FileText,
  DollarSign,
  Utensils,
  ShoppingCart,
  Ghost
} from 'lucide-react';

export default function AdminView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable Form Fields
  const [name, setName] = useState('');
  const [tolerance, setTolerance] = useState('200');
  const [cutoffHour, setCutoffHour] = useState('6');
  const [cutoffMinute, setCutoffMinute] = useState('0');
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [defaultMealQty, setDefaultMealQty] = useState('1');

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      if (json.success) {
        setData(json);
        const hh = json.household;
        setName(hh.name);
        setTolerance(hh.tolerance_amount.toString());
        setCutoffHour(hh.cutoff_hour.toString());
        setCutoffMinute(hh.cutoff_minute.toString());
        setTimezone(hh.timezone);
        setDefaultMealQty(hh.default_meal_qty ? hh.default_meal_qty.toString() : '1');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tolerance_amount: parseFloat(tolerance),
          cutoff_hour: parseInt(cutoffHour, 10),
          cutoff_minute: parseInt(cutoffMinute, 10),
          timezone,
          default_meal_qty: parseInt(defaultMealQty, 10),
          default_milk_qty: 0
        })
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchAdminData();
      } else {
        alert(json.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Direct Override State
  const [directMealUser, setDirectMealUser] = useState('usr-siam');
  const [directMealDate, setDirectMealDate] = useState('2026-08-17');
  const [directMealQty, setDirectMealQty] = useState(1);
  const [directMealReason, setDirectMealReason] = useState('');
  const [directMealSubmitting, setDirectMealSubmitting] = useState(false);

  const [directBazaarUser, setDirectBazaarUser] = useState('usr-siam');
  const [directBazaarDate, setDirectBazaarDate] = useState('2026-08-17');
  const [directBazaarAmount, setDirectBazaarAmount] = useState('');
  const [directBazaarDesc, setDirectBazaarDesc] = useState('');
  const [directBazaarReason, setDirectBazaarReason] = useState('');
  const [directBazaarSubmitting, setDirectBazaarSubmitting] = useState(false);

  async function handleEnterGhostMode(flatmateId: string, targetPath: string = '/') {
    try {
      localStorage.setItem('mt_ghost_admin', '1');
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: flatmateId })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = targetPath;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDirectMealOverride(e: React.FormEvent) {
    e.preventDefault();
    setDirectMealSubmitting(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OVERRIDE_MEAL',
          targetUserId: directMealUser,
          date: directMealDate,
          quantity: directMealQty,
          reason: directMealReason
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Meal adjusted successfully!');
        setDirectMealReason('');
        fetchAdminData();
      } else {
        alert(json.error || 'Failed to adjust meal');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDirectMealSubmitting(false);
    }
  }

  async function handleDirectBazaarRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!directBazaarAmount) return;
    setDirectBazaarSubmitting(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_BAZAAR',
          targetUserId: directBazaarUser,
          date: directBazaarDate,
          amount: directBazaarAmount,
          description: directBazaarDesc,
          reason: directBazaarReason
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Bazaar recorded successfully!');
        setDirectBazaarAmount('');
        setDirectBazaarDesc('');
        setDirectBazaarReason('');
        fetchAdminData();
      } else {
        alert(json.error || 'Failed to record bazaar');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDirectBazaarSubmitting(false);
    }
  }

  async function handleReseed() {
    if (!confirm('Re-seed database to clean initial state for Siam, Raiyan, Jubayer, Admin, and Khala?')) return;
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert('Database reseeded successfully!');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading || !data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading ghost admin panel...</div>;
  }

  const { household, users, categories, auditLogs } = data;

  return (
    <div>
      {/* Ghost Entity Banner */}
      <div className="card" style={{ backgroundColor: '#111418', color: '#ffffff', padding: '16px 20px', marginBottom: '16px', border: '1px solid #30363d' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>👻</span>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#f0f6fc' }}>Ghost Admin Management Console</h1>
            </div>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
              Admin is an invisible entity not included in household consumption, balances, or meal lists. You have full permissions to tweak, fix, or override any data on behalf of flatmates.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => window.location.href = '/api/admin?format=csv&type=ledger'} className="btn btn-sm" style={{ backgroundColor: '#21262d', color: '#f0f6fc', borderColor: '#30363d' }}>
              <Download size={13} />
              Export Ledger (CSV)
            </button>
            <button onClick={() => window.location.href = '/api/admin?format=csv&type=meals'} className="btn btn-sm" style={{ backgroundColor: '#21262d', color: '#f0f6fc', borderColor: '#30363d' }}>
              <Download size={13} />
              Export Meals (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Ghost Impersonation & Override Hub */}
      <div className="card" style={{ marginBottom: '16px', border: '1px solid #1e293b', backgroundColor: '#0f172a' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #334155' }}>
          <span className="card-title" style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎭</span>
            <span>Ghost Mode: Act As Any Flatmate (Edit Anything)</span>
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Changes appear seamlessly under their name to other flatmates
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', padding: '14px' }}>
          {[
            { id: 'usr-siam', name: 'Siam', emoji: '🍇', color: '#a855f7' },
            { id: 'usr-raiyan', name: 'Raiyan', emoji: '🌿', color: '#22c55e' },
            { id: 'usr-jubayer', name: 'Jubayer', emoji: '🍑', color: '#f97316' },
          ].map((f) => (
            <div 
              key={f.id}
              style={{
                backgroundColor: '#1e293b',
                padding: '14px',
                borderRadius: '6px',
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#f8fafc', fontSize: '15px' }}>
                  <span>{f.emoji}</span>
                  <span>{f.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleEnterGhostMode(f.id, '/')}
                  className="btn btn-sm"
                  style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: '11px', padding: '3px 8px' }}
                >
                  🎭 Impersonate
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  onClick={() => handleEnterGhostMode(f.id, '/meals')}
                  className="btn btn-sm"
                  style={{ backgroundColor: '#334155', color: '#f8fafc', borderColor: '#475569', fontSize: '11px', padding: '4px 8px' }}
                >
                  Edit Meals
                </button>
                <button 
                  type="button"
                  onClick={() => handleEnterGhostMode(f.id, '/bazaar')}
                  className="btn btn-sm"
                  style={{ backgroundColor: '#334155', color: '#f8fafc', borderColor: '#475569', fontSize: '11px', padding: '4px 8px' }}
                >
                  Edit Bazaar
                </button>
                <button 
                  type="button"
                  onClick={() => handleEnterGhostMode(f.id, '/')}
                  className="btn btn-sm"
                  style={{ backgroundColor: '#334155', color: '#f8fafc', borderColor: '#475569', fontSize: '11px', padding: '4px 8px' }}
                >
                  Dashboard
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Ghost Master Overrides (Direct In-Console Editors) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        
        {/* Direct Meal Quantity Adjuster */}
        <div className="card" style={{ padding: '16px', border: '1px solid #bfdbfe', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px', color: '#1e40af', marginBottom: '12px' }}>
            <Utensils size={17} />
            <span>Direct Meal Override (Any Date &amp; Flatmate)</span>
          </div>

          <form onSubmit={handleDirectMealOverride} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>FLATMATE</label>
                <select
                  value={directMealUser}
                  onChange={(e) => setDirectMealUser(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '5px 8px', marginTop: '3px' }}
                >
                  <option value="usr-siam">Siam</option>
                  <option value="usr-raiyan">Raiyan</option>
                  <option value="usr-jubayer">Jubayer</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>DATE</label>
                <input
                  type="date"
                  value={directMealDate}
                  onChange={(e) => setDirectMealDate(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '5px 8px', marginTop: '3px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>SET MEAL COUNT</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {[0, 1, 2, 3, 4].map(q => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setDirectMealQty(q)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '4px',
                      border: `1px solid ${directMealQty === q ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      backgroundColor: directMealQty === q ? 'var(--accent-primary)' : '#fff',
                      color: directMealQty === q ? '#fff' : 'var(--text-primary)',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>SHADOW AUDIT NOTE</label>
              <input
                type="text"
                placeholder="e.g. Forgot to turn off meal before cutoff"
                value={directMealReason}
                onChange={(e) => setDirectMealReason(e.target.value)}
                className="form-control"
                style={{ fontSize: '12px', padding: '5px 8px', marginTop: '3px' }}
              />
            </div>

            <button
              type="submit"
              disabled={directMealSubmitting}
              className="btn btn-primary btn-sm"
              style={{ justifyContent: 'center', marginTop: '4px' }}
            >
              {directMealSubmitting ? 'Applying...' : '⚡ Apply Ghost Meal Override'}
            </button>
          </form>
        </div>

        {/* Direct Bazaar Expense Recorder */}
        <div className="card" style={{ padding: '16px', border: '1px solid #bbf7d0', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px', color: '#166534', marginBottom: '12px' }}>
            <ShoppingCart size={17} />
            <span>Direct Bazaar Entry (On Behalf)</span>
          </div>

          <form onSubmit={handleDirectBazaarRecord} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>PAID BY</label>
                <select
                  value={directBazaarUser}
                  onChange={(e) => setDirectBazaarUser(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '5px 8px', marginTop: '3px' }}
                >
                  <option value="usr-siam">Siam</option>
                  <option value="usr-raiyan">Raiyan</option>
                  <option value="usr-jubayer">Jubayer</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>DATE</label>
                <input
                  type="date"
                  value={directBazaarDate}
                  onChange={(e) => setDirectBazaarDate(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '5px 8px', marginTop: '3px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>AMOUNT (৳)</label>
                <input
                  type="number"
                  placeholder="e.g. 2400"
                  value={directBazaarAmount}
                  onChange={(e) => setDirectBazaarAmount(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '5px 8px', marginTop: '3px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>ITEMS</label>
                <input
                  type="text"
                  placeholder="e.g. 5kg Meat, Spices"
                  value={directBazaarDesc}
                  onChange={(e) => setDirectBazaarDesc(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '5px 8px', marginTop: '3px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>SHADOW AUDIT NOTE</label>
              <input
                type="text"
                placeholder="e.g. Recorded offline receipt on behalf"
                value={directBazaarReason}
                onChange={(e) => setDirectBazaarReason(e.target.value)}
                className="form-control"
                style={{ fontSize: '12px', padding: '5px 8px', marginTop: '3px' }}
              />
            </div>

            <button
              type="submit"
              disabled={directBazaarSubmitting}
              className="btn btn-sm"
              style={{ justifyContent: 'center', backgroundColor: '#16a34a', color: '#fff', border: 'none', marginTop: '4px', fontWeight: 700 }}
            >
              {directBazaarSubmitting ? 'Recording...' : '⚡ Record Bazaar on Behalf'}
            </button>
          </form>
        </div>

      </div>

      {/* Quick Fix / Override Action Hub */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px' }}>
              <Utensils size={16} color="var(--accent-primary)" />
              <span>Override Any Meal Plan</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Fix locked past meals or adjust any flatmate&apos;s meal counts (Siam, Raiyan, Jubayer) across any date.
            </p>
          </div>
          <div style={{ marginTop: '12px' }}>
            <Link href="/meals" className="btn btn-primary btn-sm">
              Open Meals Override &rarr;
            </Link>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px' }}>
              <ShoppingCart size={16} color="#2b8a3e" />
              <span>Correct Bazaar Records</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Fix mistyped amounts, reassign payers, or edit descriptions on behalf of flatmates with audit tracking.
            </p>
          </div>
          <div style={{ marginTop: '12px' }}>
            <Link href="/bazaar" className="btn btn-sm" style={{ backgroundColor: '#ebfbee', color: '#2b8a3e', borderColor: '#b2f2bb' }}>
              Open Bazaar Manager &rarr;
            </Link>
          </div>
        </div>

      </div>

      {/* Household Settings Form */}
      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings size={15} />
            Household System Parameters
          </span>
          {saveSuccess && (
            <span className="badge badge-balanced" style={{ gap: '4px' }}>
              <Check size={12} /> Saved Successfully
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            <div className="form-group">
              <label className="form-label">Household Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contribution Balance Tolerance (±৳ BDT)</label>
              <input
                type="number"
                step="any"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
                className="form-control"
                required
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Balances within ±৳{tolerance} display as &ldquo;Balanced&rdquo; without pressing for immediate contributions.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Cutoff Time (Household Local)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={cutoffHour}
                  onChange={(e) => setCutoffHour(e.target.value)}
                  className="form-control"
                  style={{ width: '80px' }}
                />
                <span style={{ alignSelf: 'center', fontWeight: 800 }}>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={cutoffMinute}
                  onChange={(e) => setCutoffMinute(e.target.value)}
                  className="form-control"
                  style={{ width: '80px' }}
                />
                <span style={{ alignSelf: 'center', fontSize: '12px', fontWeight: 600 }}>AM/Hour</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Household Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Daily Meal Quantity</label>
              <input
                type="number"
                min="0"
                max="5"
                value={defaultMealQty}
                onChange={(e) => setDefaultMealQty(e.target.value)}
                className="form-control"
              />
            </div>

          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Household Parameters'}
            </button>
          </div>
        </form>
      </div>

      {/* Household Users & Roles */}
      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} />
            Configured Profiles & Roles ({users.length})
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Profile Name</th>
                <th>Email / User ID</th>
                <th>Role Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-ahead' : u.role === 'cook' ? 'badge-warning' : 'badge-locked'}`}>
                      {u.role === 'admin' ? 'Ghost Admin' : u.role === 'cook' ? 'Cook (Khala)' : 'Flatmate'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#2b8a3e', fontWeight: 600, fontSize: '12px' }}>● Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Trail */}
      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} />
            Ghost Audit Trail ({auditLogs.length} events logged)
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Audit Reason & Explanation</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((a: any) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {a.timestamp.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td style={{ fontWeight: 600 }}>{a.user_name || 'Ghost Admin'}</td>
                  <td>
                    <span className="badge badge-locked">{a.action}</span>
                  </td>
                  <td style={{ fontSize: '12px' }}>{a.target_table}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.reason}</div>
                    {a.before_value && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Before: {a.before_value} &rarr; After: {a.after_value}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Reset / Demo Seed Zone */}
      <div className="card" style={{ borderColor: '#ffd8a8', backgroundColor: '#fffaf0' }}>
        <div className="card-header">
          <span className="card-title" style={{ color: '#d9480f' }}>Demo Testing & Data Reset</span>
        </div>
        <p style={{ fontSize: '13px', color: '#9a3412', marginBottom: '12px' }}>
          Reset the database to clean initial state for Siam, Raiyan, Jubayer, Admin, and Khala.
        </p>
        <button onClick={handleReseed} className="btn" style={{ borderColor: '#d9480f', color: '#d9480f', fontWeight: 700 }}>
          <RotateCcw size={14} />
          Reset & Reseed Demo Data
        </button>
      </div>
    </div>
  );
}
