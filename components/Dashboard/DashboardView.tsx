'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Utensils, 
  Clock, 
  HelpCircle, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Calendar,
  X,
  TrendingUp,
  Flame
} from 'lucide-react';

interface DashboardData {
  household: {
    name: string;
    currencySymbol: string;
    tolerance: number;
    cutoffHour: number;
    cutoffMinute: number;
  };
  cutoff: {
    isLockedToday: boolean;
    cutoffTimeString: string;
    timeRemainingFormatted: string;
    serverToday: string;
  };
  foodStatus: {
    estimatedMealCost: number;
    foodInventoryValue: number;
    coverageDays: number;
    totalMealsRecorded: number;
    totalFoodPurchasesRecorded: number;
    isInventorySufficient: boolean;
    recommendedShopper: {
      userId: string;
      userName: string;
      suggestedAmount: number;
      reason: string;
      immediateRequired: boolean;
    } | null;
    activeCommitment: any;
  };
  userBalance: {
    userId: string;
    userName: string;
    mealsCount: number;
    mealsValue: number;
    specialRequestsCount: number;
    specialRequestsValue: number;
    totalConsumptionValue: number;
    totalFoodContribution: number;
    netBalance: number;
    tolerance: number;
    status: 'BALANCED' | 'AHEAD' | 'BEHIND';
    statusText: string;
    suggestedBazaarAmount: number;
    explanation: string;
  } | null;
  allMembers: any[];
  todaySummary: {
    date: string;
    members: { userId: string; userName: string; meals: number }[];
    specials: any[];
  };
}

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 8000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCommitBazaar() {
    if (!data || !data.userBalance) return;
    setCommitting(true);
    try {
      const res = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userBalance.userId,
          estimatedAmount: data.userBalance.suggestedBazaarAmount || 1200
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommitting(false);
    }
  }

  async function handleCancelCommitment() {
    if (!confirm('Cancel your upcoming bazaar commitment?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/commitments?userId=${data?.userBalance?.userId}`, {
        method: 'DELETE'
      });
      const resJson = await res.json();
      if (resJson.success) {
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  }

  if (loading || !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading household status...
      </div>
    );
  }

  const { household, cutoff, foodStatus, userBalance, todaySummary } = data;
  const sym = household.currencySymbol || '৳';

  return (
    <div>
      {/* 6:00 AM Cutoff Banner */}
      <div 
        style={{
          backgroundColor: cutoff.isLockedToday ? '#f8f9fa' : '#ebfbee',
          border: `1px solid ${cutoff.isLockedToday ? '#d0d7de' : '#b2f2bb'}`,
          borderRadius: 'var(--border-radius)',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color={cutoff.isLockedToday ? '#495057' : '#2b8a3e'} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>
            {cutoff.isLockedToday ? (
              <span>Today&apos;s meals locked at <strong>{cutoff.cutoffTimeString}</strong></span>
            ) : (
              <span>06:00 AM Daily Cutoff: Locks in <strong className="tabular-nums">{cutoff.timeRemainingFormatted}</strong></span>
            )}
          </span>
        </div>
        <Link href="/meals" className="btn btn-sm" style={{ fontWeight: 700 }}>
          Plan Meals &rarr;
        </Link>
      </div>

      {/* Profile Welcome & Quick Action Bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800 }}>
              Welcome back, {userBalance?.userName || 'Flatmate'}
            </h1>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Household: <strong>{household.name}</strong> &bull; Asia/Dhaka Local Time
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/bazaar?new=true" className="btn btn-primary">
              <Plus size={14} />
              Add Bazaar
            </Link>
            <Link href="/meals" className="btn">
              <Utensils size={14} />
              My Meals
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: 4 Core Dashboard KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        
        {/* Card 1: CURRENT MEAL RATE (Prominently Displayed) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '2px solid var(--accent-primary)', backgroundColor: '#ffffff' }}>
          <div>
            <div className="card-header">
              <span className="card-title" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={15} />
                Current Meal Rate
              </span>
              <span className="badge badge-ahead">Dynamic Rate</span>
            </div>

            <div style={{ margin: '6px 0 10px 0' }}>
              <div 
                style={{ 
                  fontSize: '32px', 
                  fontWeight: 900, 
                  color: 'var(--accent-primary)'
                }}
                className="tabular-nums"
              >
                {sym}{foodStatus.estimatedMealCost.toFixed(2)}
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '4px' }}>/ meal</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Formula: Total Bazaar ({sym}{foodStatus.totalFoodPurchasesRecorded.toLocaleString()}) &divide; Total Meals ({foodStatus.totalMealsRecorded})
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Household Total Meals: <strong>{foodStatus.totalMealsRecorded} meals</strong>
          </div>
        </div>

        {/* Card 2: YOUR CONTRIBUTION BALANCE */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '2px solid var(--border-dark)' }}>
          <div>
            <div className="card-header">
              <span className="card-title">Your Balance Status</span>
              {userBalance && (
                <span className={`badge badge-${userBalance.status.toLowerCase()}`}>
                  {userBalance.status === 'BALANCED' ? 'Balanced' : userBalance.status}
                </span>
              )}
            </div>

            <div style={{ margin: '6px 0 10px 0' }}>
              <div 
                style={{ 
                  fontSize: '32px', 
                  fontWeight: 900, 
                  color: userBalance?.status === 'BEHIND' ? 'var(--color-behind)' : 'var(--color-balanced)'
                }}
                className="tabular-nums"
              >
                {userBalance ? userBalance.statusText : `${sym}0`}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                {userBalance?.explanation}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
            <button 
              onClick={() => setShowDrilldown(true)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              <HelpCircle size={14} />
              How is this balance calculated?
            </button>
          </div>
        </div>

        {/* Card 3: YOUR MONTHLY ACTIVITY */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header">
              <span className="card-title">Your Food Activity</span>
              <span className="badge badge-locked">August 2026</span>
            </div>

            <div style={{ margin: '6px 0 10px 0' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                🍚 {userBalance?.mealsCount || 0} meals consumed
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#2b8a3e', marginTop: '4px' }}>
                🛒 {sym}{Math.round(userBalance?.totalFoodContribution || 0).toLocaleString()} bazaar contributed
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Your meal share: <strong>{sym}{Math.round(userBalance?.totalConsumptionValue || 0).toLocaleString()}</strong>
          </div>
        </div>

        {/* Card 4: TOTAL BAZAAR SPENT */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header">
              <span className="card-title">Total Household Bazaar</span>
              <span className="badge badge-balanced">Shared Bazaar</span>
            </div>

            <div style={{ margin: '6px 0 10px 0' }}>
              <div style={{ fontSize: '28px', fontWeight: 800 }} className="tabular-nums">
                {sym}{Math.round(foodStatus.totalFoodPurchasesRecorded).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Shared across <strong>3 Flatmates</strong>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Link href="/ledger" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              View Permanent Ledger &rarr;
            </Link>
          </div>
        </div>

      </div>

      {/* Suggested Next Bazaar Recommendation */}
      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCart size={15} />
            Next Recommended Bazaar
          </span>
          {foodStatus.recommendedShopper && (
            <span className="badge badge-behind">Pending Bazaar</span>
          )}
        </div>

        <div>
          {foodStatus.activeCommitment ? (
            <div style={{ backgroundColor: '#ebfbee', border: '1px solid #b2f2bb', borderRadius: '4px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#2b8a3e', fontSize: '13px' }}>
                  🛒 Active Bazaar Commitment: <strong>{foodStatus.activeCommitment.userName}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#2f9e44', marginTop: '2px' }}>
                  Target: {foodStatus.activeCommitment.targetDate} &bull; Estimated Amount: <strong>{sym}{foodStatus.activeCommitment.estimatedAmount.toLocaleString()}</strong>
                </div>
              </div>

              {(foodStatus.activeCommitment.userId === userBalance?.userId || userBalance?.userId === 'usr-admin') && (
                <button
                  onClick={handleCancelCommitment}
                  disabled={cancelling}
                  className="btn btn-sm"
                  style={{ backgroundColor: '#ffffff', borderColor: '#ffc9c9', color: '#c92a2a', fontWeight: 700, fontSize: '12px' }}
                >
                  <X size={13} />
                  {cancelling ? 'Cancelling...' : 'Cancel Commitment'}
                </button>
              )}
            </div>
          ) : foodStatus.recommendedShopper ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>
                  Recommended: <span style={{ color: 'var(--accent-primary)' }}>{foodStatus.recommendedShopper.userName}</span>
                  {' '}&bull; Suggested amount: <span className="tabular-nums"><strong>{sym}{foodStatus.recommendedShopper.suggestedAmount.toLocaleString()}</strong></span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {foodStatus.recommendedShopper.reason}
                </div>
              </div>

              <button
                onClick={handleCommitBazaar}
                disabled={committing}
                className="btn btn-primary btn-sm"
              >
                <CheckCircle2 size={13} />
                {committing ? 'Saving...' : "I'll do it"}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Everyone is currently balanced within ±{sym}{household.tolerance}.
            </div>
          )}
        </div>
      </div>

      {/* Split: Today's Household Meal Plan & All Flatmates Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        
        {/* Today's Cooking Plan */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Today&apos;s Meal Plan ({todaySummary.date})</span>
            <Link href="/cook" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
              Cook View &rarr;
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todaySummary.members.filter(m => m.userId !== 'usr-admin').map((m) => (
              <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: 'var(--bg-surface-alt)', borderRadius: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{m.userName}</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  🍚 <strong>{m.meals}</strong> meal{m.meals !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flatmate Contribution Balances */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Flatmate Balances (Zero-Sum Closed Loop)</span>
            <Link href="/ledger" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
              Permanent Ledger &rarr;
            </Link>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Flatmate</th>
                  <th className="num-col">Meals</th>
                  <th className="num-col">Contributed</th>
                  <th className="num-col">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.allMembers.filter((m: any) => m.userId !== 'usr-admin').map((m: any) => (
                  <tr key={m.userId}>
                    <td style={{ fontWeight: 600 }}>{m.userName}</td>
                    <td className="num-col">{m.mealsCount}</td>
                    <td className="num-col">{sym}{Math.round(m.totalFoodContribution).toLocaleString()}</td>
                    <td className="num-col" style={{ fontWeight: 800, color: m.status === 'BEHIND' ? 'var(--color-behind)' : m.status === 'AHEAD' ? 'var(--color-ahead)' : 'var(--text-primary)' }}>
                      {m.statusText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Balance Drilldown Modal */}
      {showDrilldown && userBalance && (
        <div className="modal-overlay" onClick={() => setShowDrilldown(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Continuous Balance Calculation</h3>
              <button onClick={() => setShowDrilldown(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <p style={{ marginBottom: '10px' }}>
                Calculation for <strong>{userBalance.userName}</strong>:
              </p>

              <div style={{ backgroundColor: 'var(--bg-surface-alt)', padding: '10px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span>Meals share ({userBalance.mealsCount} &times; {sym}{foodStatus.estimatedMealCost.toFixed(2)}):</span>
                  <span className="tabular-nums">−{sym}{userBalance.mealsValue.toLocaleString()}</span>
                </div>
                {userBalance.specialRequestsCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Special requests ({userBalance.specialRequestsCount} items):</span>
                    <span className="tabular-nums">−{sym}{userBalance.specialRequestsValue.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Total Consumed Share:</span>
                  <span className="tabular-nums">−{sym}{userBalance.totalConsumptionValue.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ebfbee', padding: '10px 12px', borderRadius: '4px', border: '1px solid #b2f2bb', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#2b8a3e' }}>
                  <span>Total Bazaar Contributions Made:</span>
                  <span className="tabular-nums">+{sym}{userBalance.totalFoodContribution.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ border: '2px solid var(--border-dark)', padding: '10px 12px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800 }}>Net Balance:</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: userBalance.status === 'BEHIND' ? 'var(--color-behind)' : 'var(--color-balanced)' }} className="tabular-nums">
                  {userBalance.statusText}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '14px', textAlign: 'right' }}>
              <button onClick={() => setShowDrilldown(false)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
