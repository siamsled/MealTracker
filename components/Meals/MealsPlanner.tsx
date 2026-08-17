'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Lock, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle,
  X,
  ChevronRight,
  Info,
  Sparkles,
  Utensils,
  CheckSquare,
  Square
} from 'lucide-react';

interface MemberMeal {
  userId: string;
  userName: string;
  role: string;
  mealQuantity: number;
  milkQuantity: number;
  canEdit: boolean;
}

const AVAILABLE_INSTRUCTIONS = [
  // Cooking preferences (Pure Bangla)
  { id: 'dal', category: 'cooking', label: 'ডাল রান্না', icon: '🍲' },
  { id: 'chicken', category: 'cooking', label: 'মুরগি রান্না', icon: '🍗' },
  { id: 'eggs', category: 'cooking', label: 'ডিম রান্না বা ভাজি', icon: '🍳' },
  { id: 'fish', category: 'cooking', label: 'মাছ রান্না', icon: '🐟' },
  { id: 'veg', category: 'cooking', label: 'সবজি বা ভাজি', icon: '🥬' },
  { id: 'alu_vaji', category: 'cooking', label: 'আলু ভাজি', icon: '🥔' },
  { id: 'torkari_alu', category: 'cooking', label: 'তরকারিতে বেশি আলু', icon: '🥔' },
  { id: 'bhaat_beshi', category: 'cooking', label: 'ভাত একটু বেশি', icon: '🍚' },
  { id: 'spicy', category: 'cooking', label: 'ঝাল বেশি', icon: '🌶️' },
  { id: 'less_oil', category: 'cooking', label: 'তেল কম', icon: '🧂' },

  // Room Cleaning for Khala (Pure Bangla)
  { id: 'clean_raian', category: 'cleaning', label: 'রাইয়ানের রুম পরিষ্কার', icon: '🧹' },
  { id: 'clean_siam', category: 'cleaning', label: 'সিয়ামের রুম পরিষ্কার', icon: '🧹' },
  { id: 'clean_jubayer', category: 'cleaning', label: 'জুবায়েরের রুম পরিষ্কার', icon: '🧹' },
  { id: 'clean_living', category: 'cleaning', label: 'ড্রয়িং রুম পরিষ্কার', icon: '🧹' },
  { id: 'clean_kitchen', category: 'cleaning', label: 'রান্নাঘর পরিষ্কার', icon: '🧽' }
];

export default function MealsPlanner() {
  const [todayDate, setTodayDate] = useState('2026-08-17');
  const [selectedDate, setSelectedDate] = useState('2026-08-18'); // Default to tomorrow for quick planning
  const [members, setMembers] = useState<MemberMeal[]>([]);
  const [stagedMeals, setStagedMeals] = useState<Record<string, number>>({});
  const [hasUnsavedChange, setHasUnsavedChange] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [specialRequests, setSpecialRequests] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [targetCutoffTime, setTargetCutoffTime] = useState<number | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('usr-siam');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Admin Override Modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminReason, setAdminReason] = useState('');
  const [adminOverrideMode, setAdminOverrideMode] = useState(false);

  // Add Multi-Instruction Modal State
  const [showAddSpecial, setShowAddSpecial] = useState(false);
  const [selectedInstructionLabels, setSelectedInstructionLabels] = useState<string[]>([]);

  // 5-day advance date list
  const [daysList, setDaysList] = useState<{ date: string; label: string; isToday: boolean; isTomorrow: boolean }[]>([]);

  useEffect(() => {
    const today = '2026-08-17';
    setTodayDate(today);

    // Build 5 days from today
    const list: { date: string; label: string; isToday: boolean; isTomorrow: boolean }[] = [];
    const baseDate = new Date(`${today}T00:00:00Z`);

    for (let i = 0; i < 6; i++) {
      const d = new Date(baseDate);
      d.setUTCDate(baseDate.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const dayName = dayNames[d.getUTCDay()];
      const monthName = monthNames[d.getUTCMonth()];
      const dayNum = d.getUTCDate();

      let label = `${dayName}, ${monthName} ${dayNum}`;
      if (i === 0) label = `Today (${monthName} ${dayNum})`;
      if (i === 1) label = `Tomorrow (${monthName} ${dayNum})`;

      list.push({
        date: dateStr,
        label,
        isToday: i === 0,
        isTomorrow: i === 1
      });
    }

    setDaysList(list);
    fetchMealData(selectedDate);
  }, []);

  // Bulletproof real-time live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchMealData(selectedDate);
  }, [selectedDate, adminOverrideMode]);

  async function fetchMealData(date: string) {
    setLoading(true);
    setHasUnsavedChange(false);
    setSaveSuccessNotice(false);
    try {
      const res = await fetch(`/api/meals?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
        const stagedInit: Record<string, number> = {};
        (data.members || []).forEach((m: MemberMeal) => {
          stagedInit[m.userId] = m.mealQuantity;
        });
        setStagedMeals(stagedInit);

        setSpecialRequests(data.specialRequests || []);
        setIsLocked(data.isLocked && !adminOverrideMode);
        setLockReason(data.lockReason);
        if (data.cutoff && data.cutoff.secondsRemaining !== undefined) {
          setTargetCutoffTime(Date.now() + data.cutoff.secondsRemaining * 1000);
          setTodayDate(data.cutoff.serverToday);
        }
        setIsAdmin(data.isAdmin);
        setCurrentUserId(data.currentUserId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getLiveCountdown(): string {
    if (!targetCutoffTime) return '00:00:00';
    const diffMs = targetCutoffTime - nowTime;
    if (diffMs <= 0) return '00:00:00';
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function updateQuantity(targetUserId: string, type: 'meal', delta: number) {
    const currentMember = members.find(m => m.userId === targetUserId);
    if (!currentMember) return;

    const currentQty = stagedMeals[targetUserId] !== undefined ? stagedMeals[targetUserId] : currentMember.mealQuantity;
    const newQty = Math.max(0, currentQty + delta);

    setStagedMeals(prev => ({
      ...prev,
      [targetUserId]: newQty
    }));
    setHasUnsavedChange(true);
    setSaveSuccessNotice(false);
  }

  async function handleSaveMealChanges(targetUserId: string) {
    const qtyToSave = stagedMeals[targetUserId] !== undefined ? stagedMeals[targetUserId] : 1;
    setIsSavingMeal(true);

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          userId: targetUserId,
          mealQuantity: qtyToSave,
          adminOverrideReason: adminOverrideMode ? adminReason : undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setHasUnsavedChange(false);
        setSaveSuccessNotice(true);
        setMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, mealQuantity: qtyToSave } : m));
        setTimeout(() => setSaveSuccessNotice(false), 4000);
      } else {
        alert(data.error || 'Failed to save meal changes');
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving meal changes');
    } finally {
      setIsSavingMeal(false);
    }
  }

  function openAddSpecialModal() {
    const matched: string[] = [];
    AVAILABLE_INSTRUCTIONS.forEach(item => {
      const exists = specialRequests.some(sr => {
        const srLower = (sr.item_name || '').toLowerCase();
        const itemLower = item.label.toLowerCase();
        return srLower.includes(itemLower) || itemLower.includes(srLower) || (srLower.includes(item.id));
      });
      if (exists) {
        matched.push(item.label);
      }
    });
    setSelectedInstructionLabels(matched);
    setShowAddSpecial(true);
  }

  function toggleInstructionSelection(label: string) {
    setSelectedInstructionLabels(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  }

  async function handleAddMultipleInstructions(e: React.FormEvent) {
    e.preventDefault();

    const itemsToSubmit = selectedInstructionLabels.map(label => ({
      itemName: label
    }));

    setSaving(true);
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          userId: currentUserId,
          replaceSpecialRequests: true,
          specialRequests: itemsToSubmit,
          adminOverrideReason: adminOverrideMode ? adminReason : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddSpecial(false);
        fetchMealData(selectedDate);
      } else {
        alert(data.error || 'Could not save instructions');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSpecial(id: string) {
    if (!confirm('এই নির্দেশটি বাতিল করতে চান?')) return;
    try {
      const res = await fetch(`/api/meals?specialRequestId=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchMealData(selectedDate);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const isToday = selectedDate === todayDate;
  const isTomorrow = daysList.find(d => d.date === selectedDate)?.isTomorrow ?? false;
  const myRecord = members.find(m => m.userId === currentUserId && m.userId !== 'usr-admin');
  const otherMembers = members.filter(m => m.userId !== currentUserId && m.userId !== 'usr-admin');
  const flatmateList = members.filter(m => m.userId !== 'usr-admin');

  const myDisplayMealQty = myRecord 
    ? (stagedMeals[myRecord.userId] !== undefined ? stagedMeals[myRecord.userId] : myRecord.mealQuantity)
    : 1;

  return (
    <div>
      {/* Date Planning Strip */}
      <div className="card" style={{ padding: '12px 14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Select Date:
          </div>
          <div style={{ fontSize: '11px', color: '#2b8a3e', fontWeight: 700 }}>
            ● Tomorrow editable until 6:00 AM
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
          {daysList.map((day) => {
            const isSelected = day.date === selectedDate;
            return (
              <button
                key={day.date}
                onClick={() => {
                  setSelectedDate(day.date);
                  setAdminOverrideMode(false);
                }}
                className="btn"
                style={{
                  flex: '0 0 auto',
                  padding: '7px 11px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 800 : 600,
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface-alt)',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                  whiteSpace: 'nowrap'
                }}
              >
                {day.label} {day.isTomorrow ? '⭐' : day.isToday ? '🔒' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lock / Cutoff Status Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 12px',
          backgroundColor: isLocked ? 'var(--color-behind-light)' : 'var(--color-ahead-light)',
          borderColor: isLocked ? '#ffc9c9' : '#b2f2bb',
          marginBottom: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
          {isLocked ? (
            <Lock size={15} color="var(--color-behind)" />
          ) : (
            <Clock size={15} color="var(--color-ahead)" />
          )}
          <span>
            {isToday ? (
              <span>
                <strong>{selectedDate} (Today): LOCKED</strong> — 06:00 AM cutoff passed (Khala has prepared ingredients).
              </span>
            ) : isTomorrow ? (
              <span>
                <strong>Tomorrow&apos;s Meals ({selectedDate}): UNLOCKED</strong> — Editable until 06:00 AM (<strong className="tabular-nums" style={{ color: '#15803d' }}>{getLiveCountdown()}</strong> left)
              </span>
            ) : (
              <span>
                <strong>Advance Plan for {selectedDate}: UNLOCKED</strong> — Fully editable in advance.
              </span>
            )}
          </span>
        </div>

        {isLocked && isAdmin && !adminOverrideMode && (
          <button 
            onClick={() => setShowAdminModal(true)} 
            className="btn btn-sm"
            style={{ backgroundColor: '#fff5f5', color: '#c92a2a', borderColor: '#ffc9c9', fontWeight: 700 }}
          >
            <ShieldAlert size={14} />
            Ghost Admin Override
          </button>
        )}

        {adminOverrideMode && (
          <span className="badge badge-locked" style={{ backgroundColor: '#c92a2a', color: '#fff' }}>
            Admin Override Active ({adminReason})
          </span>
        )}
      </div>

      {/* Your Meal Card (If flatmate profile) */}
      {myRecord && (
        <div className="card" style={{ border: '2px solid var(--accent-primary)', marginBottom: '14px' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--accent-primary)' }}>
              Your Meal Count for {selectedDate}
            </span>
            <span className="badge badge-ahead">Your Profile ({myRecord.userName})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800 }}>{myRecord.userName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Tap + / − to adjust meals.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  🍚 Meals:
                </span>
                <div className="qty-control">
                  <button
                    disabled={isLocked && !adminOverrideMode}
                    onClick={() => updateQuantity(myRecord.userId, 'meal', -1)}
                    className="qty-btn"
                    title="Decrease meals"
                  >
                    −
                  </button>
                  <span className="qty-value">{myDisplayMealQty}</span>
                  <button
                    disabled={isLocked && !adminOverrideMode}
                    onClick={() => updateQuantity(myRecord.userId, 'meal', 1)}
                    className="qty-btn"
                    title="Increase meals"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Confirm & Save Button */}
            <button
              disabled={(isLocked && !adminOverrideMode) || isSavingMeal}
              onClick={() => handleSaveMealChanges(myRecord.userId)}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '9px 14px',
                fontWeight: 800,
                fontSize: '13px',
                borderRadius: '6px',
                backgroundColor: hasUnsavedChange ? 'var(--accent-primary)' : '#16a34a',
                borderColor: hasUnsavedChange ? 'var(--accent-primary)' : '#16a34a',
                boxShadow: hasUnsavedChange ? '0 2px 8px rgba(9, 105, 218, 0.35)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {isSavingMeal ? (
                'Saving...'
              ) : hasUnsavedChange ? (
                <>💾 Save Changes</>
              ) : (
                <>✓ Saved ({myDisplayMealQty} meal{myDisplayMealQty !== 1 ? 's' : ''})</>
              )}
            </button>
          </div>

          {saveSuccessNotice && (
            <div style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} />
              Meal count of {myDisplayMealQty} meal{myDisplayMealQty !== 1 ? 's' : ''} saved for {selectedDate}!
            </div>
          )}
        </div>
      )}

      {/* Other Flatmates' Meals Table */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <span className="card-title">
            {myRecord ? `Other Flatmates for ${selectedDate}` : `All Flatmates for ${selectedDate}`}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isAdmin ? 'Admin Mode (Editable)' : 'Read-Only'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(myRecord ? otherMembers : flatmateList).map((m) => {
            const displayQty = stagedMeals[m.userId] !== undefined ? stagedMeals[m.userId] : m.mealQuantity;
            return (
              <div 
                key={m.userId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-surface-alt)',
                  borderRadius: '4px'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.userName}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isAdmin && adminOverrideMode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="qty-control">
                        <button onClick={() => updateQuantity(m.userId, 'meal', -1)} className="qty-btn">−</button>
                        <span className="qty-value">{displayQty}</span>
                        <button onClick={() => updateQuantity(m.userId, 'meal', 1)} className="qty-btn">+</button>
                      </div>
                      <button 
                        onClick={() => handleSaveMealChanges(m.userId)} 
                        className="btn btn-sm btn-primary"
                        style={{ padding: '6px 12px', fontWeight: 700 }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                      🍚 {displayQty} meal{displayQty !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dish & Room Cleaning Instructions for Khala */}
      <div className="card">
        <div className="card-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="card-title" style={{ fontSize: '15px' }}>
              খালার জন্য রান্নার ও পরিষ্কারের নির্দেশ ({selectedDate})
            </span>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              রান্নার আইটেম ও রুম পরিষ্কারের কাজ নির্বাচন করুন।
            </div>
          </div>
          {(!isLocked || adminOverrideMode) && (
            <button onClick={openAddSpecialModal} className="btn btn-sm btn-primary" style={{ fontWeight: 800, padding: '6px 14px', gap: '6px' }}>
              <Plus size={14} />
              + নির্দেশ পরিবর্তন / যোগ করুন
            </button>
          )}
        </div>

        {specialRequests.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: 'var(--bg-surface-alt)', borderRadius: '6px' }}>
            খালার জন্য কোনো বিশেষ রান্নার বা রুম পরিষ্কারের নির্দেশ দেওয়া হয়নি।
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {specialRequests.map((sr: any) => {
              const isCleaning = sr.item_name.toLowerCase().includes('clean') || sr.item_name.toLowerCase().includes('পরিষ্কার');
              return (
                <div 
                  key={sr.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    backgroundColor: isCleaning ? '#f0fdf4' : '#fffdfa',
                    border: `1.5px solid ${isCleaning ? '#86efac' : '#fdba74'}`,
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{isCleaning ? '🧹' : '🍳'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: isCleaning ? '#15803d' : '#9a3412' }}>
                        {sr.item_name}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                        যোগ করেছেন: {sr.user_name}
                      </div>
                    </div>
                  </div>

                  {(!isLocked || adminOverrideMode) && (
                    <button 
                      onClick={() => handleDeleteSpecial(sr.id)}
                      className="btn btn-sm"
                      style={{ 
                        backgroundColor: '#fee2e2', 
                        color: '#b91c1c', 
                        borderColor: '#fca5a5', 
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 800,
                        gap: '4px'
                      }}
                      title="বাতিল করুন"
                    >
                      <Trash2 size={13} />
                      বাতিল
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Multi-Select Dish & Room Cleaning Instructions (Pure Bangla) */}
      {showAddSpecial && (
        <div className="modal-overlay" onClick={() => setShowAddSpecial(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                খালার জন্য নির্দেশ ({selectedDate})
              </h3>
              <button onClick={() => setShowAddSpecial(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMultipleInstructions}>
              {/* Group 1: Dish & Cooking Preferences */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                  🍳 রান্নার নির্দেশিকা (একাধিক সিলেক্ট করা যাবে):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {AVAILABLE_INSTRUCTIONS.filter(i => i.category === 'cooking').map(item => {
                    const isSelected = selectedInstructionLabels.includes(item.label);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => toggleInstructionSelection(item.label)}
                        className="btn"
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface-alt)',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 2px 6px rgba(9, 105, 218, 0.25)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '15px' }}>{item.icon}</span>
                        <span>{item.label}</span>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: Room Cleaning for Raiyan / Siam / Jubayer */}
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: '13px', color: '#15803d', marginBottom: '8px' }}>
                  🧹 রুম ও বাসা পরিষ্কারের কাজ:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {AVAILABLE_INSTRUCTIONS.filter(i => i.category === 'cleaning').map(item => {
                    const isSelected = selectedInstructionLabels.includes(item.label);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => toggleInstructionSelection(item.label)}
                        className="btn"
                        style={{
                          backgroundColor: isSelected ? '#16a34a' : 'var(--bg-surface-alt)',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                          borderColor: isSelected ? '#16a34a' : 'var(--border-color)',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 2px 6px rgba(22, 163, 74, 0.25)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '15px' }}>{item.icon}</span>
                        <span>{item.label}</span>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button type="button" onClick={() => setShowAddSpecial(false)} className="btn" style={{ fontWeight: 700 }}>
                  বাতিল (Cancel)
                </button>
                <button 
                  type="submit" 
                  disabled={saving || selectedInstructionLabels.length === 0} 
                  className="btn btn-primary"
                  style={{ fontWeight: 800, padding: '8px 18px' }}
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : `সংরক্ষণ করুন ${selectedInstructionLabels.length > 0 ? `(${selectedInstructionLabels.length}টি)` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Override Reason */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#c92a2a' }}>Admin Override Lock</h3>
              <button onClick={() => setShowAdminModal(false)} style={{ background: 'none', border: 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '14px', color: 'var(--text-secondary)' }}>
              You are overriding the cutoff lock for {selectedDate}. All overrides are permanently recorded in the audit log.
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Override (Required)</label>
              <input
                type="text"
                placeholder="e.g. Siam fell sick; Khala called to adjust portions"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setShowAdminModal(false)} className="btn">
                Cancel
              </button>
              <button
                disabled={!adminReason.trim()}
                onClick={() => {
                  setAdminOverrideMode(true);
                  setShowAdminModal(false);
                  setIsLocked(false);
                }}
                className="btn btn-primary"
                style={{ backgroundColor: '#c92a2a', borderColor: '#c92a2a' }}
              >
                Enable Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
