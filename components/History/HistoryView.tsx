'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ShoppingCart, 
  Utensils, 
  FileText, 
  ChefHat, 
  ShieldAlert,
  BarChart2
} from 'lucide-react';

export default function HistoryView() {
  const [activeTab, setActiveTab] = useState<'day' | 'month'>('day');
  
  // Day Inspector State
  const [selectedDay, setSelectedDay] = useState('2026-08-29'); // Defaults to the key test date
  const [dayData, setDayData] = useState<any>(null);
  const [dayLoading, setDayLoading] = useState(true);

  // Monthly Report State
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);

  useEffect(() => {
    fetchDayInspection(selectedDay);
  }, [selectedDay]);

  useEffect(() => {
    fetchMonthlyReport(selectedMonth);
  }, [selectedMonth]);

  async function fetchDayInspection(date: string) {
    setDayLoading(true);
    try {
      const [mealsRes, bazaarRes, cookRes] = await Promise.all([
        fetch(`/api/meals?date=${date}`),
        fetch(`/api/bazaar?date=${date}`),
        fetch(`/api/cook?date=${date}`)
      ]);

      const [mealsJson, bazaarJson, cookJson] = await Promise.all([
        mealsRes.json(),
        bazaarRes.json(),
        cookRes.json()
      ]);

      setDayData({
        meals: mealsJson.members || [],
        specials: mealsJson.specialRequests || [],
        bazaar: bazaarJson.expenses || [],
        cook: cookJson.instruction || null
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDayLoading(false);
    }
  }

  async function fetchMonthlyReport(month: string) {
    setMonthlyLoading(true);
    try {
      const res = await fetch(`/api/analytics?month=${month}`);
      const json = await res.json();
      if (json.success) {
        setMonthlyData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMonthlyLoading(false);
    }
  }

  function changeDay(days: number) {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + days);
    setSelectedDay(d.toISOString().slice(0, 10));
  }

  return (
    <div>
      {/* View Switcher Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('day')}
          className={`btn ${activeTab === 'day' ? 'btn-primary' : ''}`}
          style={{ gap: '6px' }}
        >
          <CalendarIcon size={14} />
          Day-by-Day Inspector
        </button>
        <button
          onClick={() => setActiveTab('month')}
          className={`btn ${activeTab === 'month' ? 'btn-primary' : ''}`}
          style={{ gap: '6px' }}
        >
          <BarChart2 size={14} />
          Monthly Report (Continuous Stream)
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: DAY-BY-DAY INSPECTOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'day' && (
        <div>
          {/* Date Selector Bar */}
          <div className="card" style={{ padding: '10px 14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => changeDay(-1)} className="btn btn-sm">
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="form-control"
                  style={{ width: 'auto', padding: '5px 8px', fontSize: '13px', fontWeight: 700 }}
                />
                <button onClick={() => changeDay(1)} className="btn btn-sm">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Inspect Day: <span style={{ color: 'var(--accent-primary)' }}>{selectedDay}</span>
              </div>
            </div>
          </div>

          {dayLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records for {selectedDay}...</div>
          ) : dayData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              
              {/* Box 1: Meals & Milk on this Day */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Utensils size={15} />
                    Meals & Milk ({selectedDay})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dayData.meals.map((m: any) => (
                    <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-surface-alt)', borderRadius: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{m.userName}</span>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        🍚 {m.mealQuantity} meal{m.mealQuantity !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}

                  {dayData.specials.length > 0 && (
                    <div style={{ marginTop: '6px', padding: '8px 10px', backgroundColor: '#fff4e6', border: '1px solid #ffd8a8', borderRadius: '4px', fontSize: '12px' }}>
                      <strong>Special Requests:</strong>
                      {dayData.specials.map((s: any, idx: number) => (
                        <div key={idx} style={{ marginTop: '2px' }}>
                          &bull; {s.user_name}: {s.quantity}x {s.item_name} {s.notes ? `(${s.notes})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Bazaar on this Day */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShoppingCart size={15} />
                    Bazaar Purchases ({selectedDay})
                  </span>
                </div>

                {dayData.bazaar.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No bazaar purchases recorded on this day.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dayData.bazaar.map((b: any) => (
                      <div key={b.id} style={{ padding: '10px 12px', backgroundColor: '#ebfbee', border: '1px solid #b2f2bb', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>{b.paid_by_user_name}</span>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: '#2b8a3e' }} className="tabular-nums">
                            +৳{b.amount.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {b.category_icon} {b.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Box 3: Daily Cooking Instruction Generated */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header">
                  <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ChefHat size={15} />
                    Cooking Instruction Snapshot for {selectedDay}
                  </span>
                </div>

                {dayData.cook ? (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '14px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#78350f', marginBottom: '8px', lineHeight: 1.5 }}>
                      &ldquo;{dayData.cook.bengaliText}&rdquo;
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
                      <span>🍚 Total Meals: {dayData.cook.totalMeals}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    No cooking instruction generated for this date.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MONTHLY REPORT OVER CONTINUOUS STREAM */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'month' && (
        <div>
          {/* Month Selector Bar */}
          <div className="card" style={{ padding: '10px 14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="form-control"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '13px', fontWeight: 700 }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Derived report over the permanent continuous ledger
              </span>
            </div>
          </div>

          {monthlyLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading monthly statistics...</div>
          ) : monthlyData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Monthly Overview Card */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Monthly Summary ({selectedMonth})</span>
                  <span className="badge badge-locked">Continuous Filter View</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ backgroundColor: 'var(--bg-surface-alt)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>TOTAL MEALS IN MONTH</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '2px' }} className="tabular-nums">
                      {monthlyData.monthlyReport.totalMeals} meals
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-surface-alt)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>FOOD PURCHASES (BAZAAR)</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#2b8a3e', marginTop: '2px' }} className="tabular-nums">
                      ৳{monthlyData.monthlyReport.foodPurchases.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-surface-alt)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>ESTIMATED FOOD CONSUMED</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#c92a2a', marginTop: '2px' }} className="tabular-nums">
                      ৳{monthlyData.monthlyReport.estimatedFoodConsumed.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-surface-alt)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>AVERAGE ESTIMATED MEAL COST</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '2px' }} className="tabular-nums">
                      ৳{monthlyData.monthlyReport.averageEstimatedMealCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Contributions in Month Table */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Food Purchases by Flatmate ({selectedMonth})</span>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Flatmate</th>
                        <th className="num-col">Month Food Contributions</th>
                        <th className="num-col">Cumulative Continuous Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.monthlyReport.userContributions.map((u: any) => {
                        const member = monthlyData.mealDistribution.find((m: any) => m.userId === u.id);
                        return (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 600 }}>{u.name}</td>
                            <td className="num-col" style={{ fontWeight: 700 }}>৳{u.total.toLocaleString()}</td>
                            <td className="num-col" style={{ fontWeight: 800, color: (member?.netBalance || 0) < 0 ? 'var(--color-behind)' : 'var(--color-balanced)' }}>
                              {(member?.netBalance || 0) >= 0 ? `+৳${Math.round(member?.netBalance || 0).toLocaleString()}` : `−৳${Math.abs(Math.round(member?.netBalance || 0)).toLocaleString()}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expense Category Distribution */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Expense Category Breakdown</span>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Classification</th>
                        <th className="num-col">Transactions</th>
                        <th className="num-col">Total Amount (৳)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.categoryStats.map((c: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{c.category_icon || '🛒'} {c.category_name}</td>
                          <td>
                            <span className={`badge ${c.category_type === 'food_pool' ? 'badge-balanced' : 'badge-locked'}`}>
                              {c.category_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="num-col">{c.transaction_count}</td>
                          <td className="num-col" style={{ fontWeight: 700 }}>৳{c.total_amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
