'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ShoppingCart, 
  Plus, 
  Filter, 
  Edit3, 
  Calendar, 
  User as UserIcon, 
  X,
  ShieldCheck,
  Lock,
  Camera,
  Image as ImageIcon,
  Check,
  ZoomIn,
  Trash2,
  FileText,
  ChevronDown
} from 'lucide-react';
import { compressReceiptImage } from '@/lib/imageCompressor';

interface Expense {
  id: string;
  paid_by_user_id: string;
  paid_by_user_name: string;
  date: string;
  amount: number;
  description: string;
  receipt_images?: string[];
  corrections?: any[];
  canEdit: boolean;
  is_correction: number;
  created_at: string;
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

export default function BazaarView() {
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState('usr-siam');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddModal, setShowAddModal] = useState(searchParams.get('new') === 'true');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [receipts, setReceipts] = useState<{ base64: string; originalSize: number; compressedSize: number; savings: number }[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [filterMonth, setFilterMonth] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Correction Modal State
  const [correctingExpense, setCorrectingExpense] = useState<Expense | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctingReceipts, setCorrectingReceipts] = useState<string[]>([]);
  const [correctingSubmitting, setCorrectingSubmitting] = useState(false);

  // Expandable row correction history dropdown
  const [expandedCorrections, setExpandedCorrections] = useState<Record<string, boolean>>({});

  function toggleCorrectionExpand(expenseId: string) {
    setExpandedCorrections(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
  }

  // Lightbox Modal for Receipt Viewing
  const [viewingReceipts, setViewingReceipts] = useState<{ expense: Expense; activeIndex: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const today = '2026-08-17';
    setExpenseDate(today);
    fetchData();
  }, [filterMonth, filterUser]);

  async function fetchData() {
    setLoading(true);
    try {
      let url = `/api/bazaar?`;
      if (filterMonth) url += `month=${filterMonth}&`;
      if (filterUser) url += `userId=${filterUser}&`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.expenses || []);
        setUsers(json.users || []);
        setCurrentUserId(json.currentUserId || 'usr-siam');
        setIsAdmin(json.isAdmin || false);

        if (!paidBy && json.users.length > 0) {
          setPaidBy(json.currentUserId || json.users[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressing(true);
    try {
      const remainingSlots = isEdit 
        ? 3 - correctingReceipts.length 
        : 3 - receipts.length;

      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      for (const file of filesToProcess) {
        const result = await compressReceiptImage(file);
        if (isEdit) {
          setCorrectingReceipts(prev => [...prev, result.base64].slice(0, 3));
        } else {
          setReceipts(prev => [...prev, {
            base64: result.base64,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            savings: result.savingsPercent
          }].slice(0, 3));
        }
      }
    } catch (err) {
      console.error('Image compression error:', err);
      alert('Error compressing image. Please try another photo.');
    } finally {
      setCompressing(false);
      if (e.target) e.target.value = '';
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/bazaar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paidByUserId: paidBy || currentUserId,
          description: description.trim() || 'Bazaar food purchase',
          date: expenseDate,
          isFoodPool: true,
          receiptImages: receipts.map(r => r.base64)
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setAmount('');
        setDescription('');
        setReceipts([]);
        fetchData();
      } else {
        alert(json.error || 'Failed to record bazaar purchase');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function openCorrectionModal(e: Expense) {
    setCorrectingExpense(e);
    setNewAmount(e.amount.toString());
    setNewDescription(e.description);
    setCorrectionReason('');
    setCorrectingReceipts(e.receipt_images || []);
  }

  async function handleCorrectExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!correctingExpense || !correctionReason.trim()) return;

    setCorrectingSubmitting(true);
    try {
      const res = await fetch('/api/bazaar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: correctingExpense.id,
          newAmount: parseFloat(newAmount),
          newDescription: newDescription.trim(),
          correctionReason: correctionReason.trim(),
          receiptImages: correctingReceipts
        })
      });
      const json = await res.json();
      if (json.success) {
        setCorrectingExpense(null);
        setNewAmount('');
        setNewDescription('');
        setCorrectionReason('');
        setCorrectingReceipts([]);
        fetchData();
      } else {
        alert(json.error || 'Failed to save correction');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCorrectingSubmitting(false);
    }
  }

  const filteredExpenses = expenses.filter(e => {
    if (filterUser && e.paid_by_user_id !== filterUser) return false;
    if (filterMonth && !e.date.startsWith(filterMonth)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchPayer = e.paid_by_user_name?.toLowerCase().includes(q);
      const matchAmount = e.amount?.toString().includes(q);
      const matchDate = e.date?.includes(q);
      return matchDesc || matchPayer || matchAmount || matchDate;
    }
    return true;
  });

  const totalFoodSpend = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      {/* Top Action Card */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Bazaar Purchases &amp; Expenses</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Record groceries, raw ingredients, and food pool expenses with instant receipt OCR &amp; compression.
            </div>
          </div>
          <button 
            onClick={() => {
              setShowAddModal(true);
              setPaidBy(currentUserId || (users[0]?.id ?? ''));
            }} 
            className="btn btn-primary"
            style={{ fontWeight: 800 }}
          >
            <Plus size={16} />
            Record Bazaar Purchase
          </button>
        </div>
      </div>

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

          {/* Paid by Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '180px', flex: '1 1 auto' }}>
            <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Paid by:</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="form-control"
              style={{ padding: '6px 8px', fontSize: '12px', width: '100%', minWidth: '120px' }}
            >
              <option value="">All Flatmates</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Full-Width Search Input */}
        <div style={{ marginTop: '10px', position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Search items, notes, flatmates, amounts..."
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

      {/* Bazaar Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Bazaar Records ({filteredExpenses.length})</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            You can only edit your own bazaar contributions
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading bazaar records...</div>
        ) : filteredExpenses.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {searchQuery ? 'No bazaar records matching your search.' : 'No bazaar purchases recorded for this period.'}
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Date</th>
                  <th style={{ width: '130px' }}>Paid By</th>
                  <th>Items / Description</th>
                  <th style={{ width: '120px' }}>Receipts</th>
                  <th className="num-col" style={{ width: '140px' }}>Amount (৳ BDT)</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => {
                  const hasReceipts = e.receipt_images && e.receipt_images.length > 0;
                  return (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {highlightMatch(e.date, searchQuery)}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {highlightMatch(e.paid_by_user_name, searchQuery)}
                        {e.paid_by_user_id === currentUserId && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-primary)', marginLeft: '4px', fontWeight: 600 }}>
                            (You)
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{highlightMatch(e.description, searchQuery)}</div>
                        {e.is_correction === 1 && (
                          <div style={{ marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => toggleCorrectionExpand(e.id)}
                              className="badge badge-warning"
                              style={{ 
                                cursor: 'pointer', 
                                border: '1px solid #f59f00', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: 700
                              }}
                              title="Click to view correction details"
                            >
                              <span>EDITED / CORRECTED</span>
                              <ChevronDown 
                                size={11} 
                                style={{ 
                                  transform: expandedCorrections[e.id] ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.2s ease'
                                }} 
                              />
                            </button>

                            {expandedCorrections[e.id] && (
                              <div style={{
                                marginTop: '6px',
                                padding: '8px 10px',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#92400e',
                                lineHeight: 1.5,
                                maxWidth: '340px'
                              }}>
                                {e.corrections && e.corrections.length > 0 ? (
                                  e.corrections.map((c: any) => (
                                    <div key={c.id} style={{ marginBottom: '4px' }}>
                                      <div style={{ fontWeight: 700, color: '#78350f' }}>
                                        🕒 {c.timestamp ? c.timestamp.replace('T', ' ').slice(0, 16) : ''} by {c.user_name}:
                                      </div>
                                      <div style={{ marginTop: '2px' }}>
                                        <strong>Reason:</strong> &ldquo;{c.reason}&rdquo;
                                      </div>
                                      {c.before_value && (
                                        <div style={{ fontSize: '10px', color: '#b45309', marginTop: '2px' }}>
                                          Was: <span style={{ textDecoration: 'line-through' }}>{c.before_value}</span> &rarr; Now: <strong>{c.after_value}</strong>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div>Amount or details were corrected. See Activity tab in Permanent Ledger.</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {hasReceipts ? (
                          <button
                            onClick={() => setViewingReceipts({ expense: e, activeIndex: 0 })}
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
                            🧾 {e.receipt_images!.length} photo{e.receipt_images!.length > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="num-col" style={{ fontWeight: 800, color: '#2b8a3e', fontSize: '14px' }}>
                        +৳{e.amount.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {e.canEdit ? (
                          <button
                            onClick={() => openCorrectionModal(e)}
                            className="btn btn-sm"
                            style={{ fontSize: '12px', padding: '4px 8px', gap: '4px' }}
                            title="Edit your bazaar amount or description"
                          >
                            <Edit3 size={12} />
                            Correct
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Lock size={11} />
                            Read-Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record New Bazaar Purchase */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Record Bazaar Purchase</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label className="form-label">Total Amount Spent (৳ BDT)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="form-control"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Paid By (Flatmate)</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="form-control"
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.id === currentUserId ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date of Purchase</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Items Purchased / Description</label>
                <input
                  type="text"
                  placeholder="e.g. 10kg Rice, 2L Oil, Spices & Potatoes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-control"
                />
              </div>

              {/* Receipt Images Section - Clean & Minimal */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, fontSize: '13px' }}>
                    Receipt Photos <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional, max 3)</span>
                  </label>
                  {receipts.length > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {receipts.length}/3 photos added
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e, false)}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />

                {receipts.length < 3 && (
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-sm"
                    style={{ 
                      width: '100%', 
                      justifyContent: 'center', 
                      backgroundColor: 'var(--bg-surface-alt)',
                      borderColor: 'var(--border-color)', 
                      padding: '8px 12px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      gap: '6px'
                    }}
                  >
                    <Camera size={15} color="var(--accent-primary)" />
                    {compressing ? 'Optimizing photo...' : receipts.length === 0 ? 'Upload Receipt Photos' : '+ Add Another Receipt'}
                  </button>
                )}

                {/* Thumbnails */}
                {receipts.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
                    {receipts.map((r, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}>
                        <img 
                          src={r.base64} 
                          alt={`Receipt ${idx + 1}`} 
                          style={{ width: '100%', height: '70px', objectFit: 'cover' }} 
                        />
                        <button
                          type="button"
                          onClick={() => setReceipts(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            backgroundColor: 'rgba(0, 0, 0, 0.65)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || compressing} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Bazaar Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Correct / Edit Own Bazaar Entry */}
      {correctingExpense && (
        <div className="modal-overlay" onClick={() => setCorrectingExpense(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Edit Bazaar Entry ({correctingExpense.date})</h3>
              <button onClick={() => setCorrectingExpense(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', backgroundColor: 'var(--bg-surface-alt)', padding: '8px 10px', borderRadius: '4px' }}>
              Payer: <strong>{correctingExpense.paid_by_user_name}</strong> &bull; Original Amount: <strong>৳{correctingExpense.amount.toLocaleString()}</strong>
            </div>

            <form onSubmit={handleCorrectExpense}>
              <div className="form-group">
                <label className="form-label">Corrected Amount (৳ BDT)</label>
                <input
                  type="number"
                  step="any"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Updated Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              {/* Edit Receipt Photos - Clean & Minimal */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, fontSize: '13px' }}>
                    Receipt Photos <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({correctingReceipts.length}/3)</span>
                  </label>
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => handleFileSelect(e, true)}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />

                {correctingReceipts.length < 3 && (
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => editFileInputRef.current?.click()}
                    className="btn btn-sm"
                    style={{ 
                      width: '100%', 
                      justifyContent: 'center', 
                      backgroundColor: 'var(--bg-surface-alt)',
                      borderColor: 'var(--border-color)', 
                      padding: '8px 12px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      gap: '6px'
                    }}
                  >
                    <Camera size={15} color="var(--accent-primary)" />
                    {compressing ? 'Optimizing photo...' : '+ Add Receipt Photo'}
                  </button>
                )}

                {correctingReceipts.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
                    {correctingReceipts.map((b64, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}>
                        <img src={b64} alt={`Receipt ${idx + 1}`} style={{ width: '100%', height: '70px', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setCorrectingReceipts(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            backgroundColor: 'rgba(0, 0, 0, 0.65)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#c92a2a' }}>Reason for Correction (Required for Audit Trail)</label>
                <input
                  type="text"
                  placeholder="e.g. Typo in receipt amount, found additional bill"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="form-control"
                  required
                />
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  This reason will be logged in the permanent Activity audit trail.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setCorrectingExpense(null)} className="btn">
                  Cancel
                </button>
                <button type="submit" disabled={correctingSubmitting || !correctionReason.trim()} className="btn btn-primary">
                  {correctingSubmitting ? 'Saving...' : 'Save & Log Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal: View High-Res Receipt Images */}
      {viewingReceipts && viewingReceipts.expense.receipt_images && (
        <div className="modal-overlay" onClick={() => setViewingReceipts(null)} style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000 }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', backgroundColor: '#111418', color: '#fff', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f0f6fc' }}>
                  Receipt for {viewingReceipts.expense.description}
                </h3>
                <div style={{ fontSize: '12px', color: '#8b949e' }}>
                  Paid by {viewingReceipts.expense.paid_by_user_name} &bull; ৳{viewingReceipts.expense.amount.toLocaleString()} &bull; {viewingReceipts.expense.date}
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
                src={viewingReceipts.expense.receipt_images[viewingReceipts.activeIndex]}
                alt="Receipt Full View"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>

            {/* Multi-image thumbnail switcher if more than 1 image */}
            {viewingReceipts.expense.receipt_images.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                {viewingReceipts.expense.receipt_images.map((img, idx) => (
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
