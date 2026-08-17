'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CookInstructionData {
  bengaliText: string;
  totalMeals: number;
  totalMealsBengali: string;
  flatmateMeals: { name: string; quantity: number }[];
  cookingInstructions: { name: string; user: string }[];
  cleaningTasks: { name: string; user: string }[];
}

export default function CookView() {
  const [data, setData] = useState<CookInstructionData | null>(null);
  const [date, setDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(0.85);

  useEffect(() => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    setDate(formatted);
  }, []);

  useEffect(() => {
    if (date) {
      fetchCookData(date);
    }
  }, [date]);

  async function fetchCookData(targetDate: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/cook?date=${targetDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.instruction);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  function stopSpokenBengali() {
    if (audioObj) {
      audioObj.pause();
      audioObj.currentTime = 0;
    }
    setIsPlaying(false);
    setIsAudioLoading(false);
  }

  async function playSpokenBengali() {
    stopSpokenBengali();
    if (!data) return;

    setIsAudioLoading(true);

    try {
      const rateParam = speed === 0.8 ? '-15%' : '+0%';
      const audioUrl = `/api/cook/audio?date=${date}&rate=${encodeURIComponent(rateParam)}&t=${Date.now()}`;
      
      const audio = new Audio(audioUrl);
      setAudioObj(audio);

      audio.oncanplaythrough = () => {
        setIsAudioLoading(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsAudioLoading(false);
        setAudioObj(null);
      };

      audio.onerror = (e) => {
        console.error('Audio load error:', e);
        setIsPlaying(false);
        setIsAudioLoading(false);
      };

      await audio.play();
      setIsAudioLoading(false);
      setIsPlaying(true);
    } catch (err) {
      console.error('Playback error:', err);
      setIsPlaying(false);
      setIsAudioLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontSize: '20px', fontWeight: 800, color: 'var(--text-muted)' }}>
        লোড হচ্ছে...
      </div>
    );
  }

  const { totalMeals, totalMealsBengali, flatmateMeals, cookingInstructions, cleaningTasks, bengaliText } = data;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Simple Today's Date Banner (Concerning Day Only) */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '14px', 
        padding: '10px 16px', 
        backgroundColor: '#ffffff', 
        border: '1px solid var(--border-color)', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>
          📅 আজকের তারিখ: {date}
        </div>
      </div>

      {/* Main Massive Voice Audio Player */}
      <div style={{ 
        backgroundColor: '#0f172a', 
        color: '#ffffff', 
        borderRadius: '12px', 
        padding: '24px 16px', 
        textAlign: 'center', 
        marginBottom: '16px',
        border: '2px solid #334155',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '4px', color: '#f8fafc' }}>
          আসসালামু আলাইকুম খালা
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '18px' }}>
          আজকের রান্নার পরিমাণ ও নির্দেশ শুনতে নিচের বোতামে চাপ দিন
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          {isPlaying ? (
            <button
              onClick={stopSpokenBengali}
              className="btn btn-lg"
              style={{ 
                minWidth: '260px', 
                padding: '16px 24px', 
                fontSize: '20px', 
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderColor: '#dc2626',
                borderRadius: '50px',
                fontWeight: 900,
                gap: '10px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
              }}
            >
              <VolumeX size={24} />
              ⏹️ কথা থামান
            </button>
          ) : isAudioLoading ? (
            <button
              disabled
              className="btn btn-lg"
              style={{ 
                minWidth: '260px', 
                padding: '16px 24px', 
                fontSize: '20px', 
                backgroundColor: '#0284c7', 
                color: '#ffffff', 
                borderColor: '#0284c7', 
                borderRadius: '50px',
                fontWeight: 900,
                gap: '10px',
                opacity: 0.9,
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              <Volume2 size={26} />
              ⏳ কথা তৈরি হচ্ছে...
            </button>
          ) : (
            <button
              onClick={playSpokenBengali}
              className="btn btn-lg"
              style={{ 
                minWidth: '260px', 
                padding: '16px 24px', 
                fontSize: '20px', 
                backgroundColor: '#16a34a', 
                color: '#ffffff', 
                borderColor: '#16a34a', 
                borderRadius: '50px',
                fontWeight: 900,
                gap: '10px',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)'
              }}
            >
              <Volume2 size={26} />
              🔊 কথা শুনুন (প্লে করুন)
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
            <span>পড়ার গতি:</span>
            <button 
              onClick={() => { setSpeed(0.8); stopSpokenBengali(); }} 
              className="btn btn-sm"
              style={{ 
                backgroundColor: speed === 0.8 ? '#2563eb' : '#1e293b', 
                color: '#fff', 
                borderColor: '#334155',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: speed === 0.8 ? 800 : 500
              }}
            >
              ধীরে
            </button>
            <button 
              onClick={() => { setSpeed(1.0); stopSpokenBengali(); }} 
              className="btn btn-sm"
              style={{ 
                backgroundColor: speed === 1.0 ? '#2563eb' : '#1e293b', 
                color: '#fff', 
                borderColor: '#334155',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: speed === 1.0 ? 800 : 500
              }}
            >
              স্বাভাবিক
            </button>
          </div>
        </div>
      </div>

      {/* Spoken Text in Simple Bengali */}
      <div className="card" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400e', marginBottom: '4px', letterSpacing: '0.5px' }}>
          মুখের কথা (বাংলা)
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#78350f', lineHeight: 1.6 }}>
          &ldquo;{bengaliText}&rdquo;
        </div>
      </div>

      {/* ONE GIANT TOTAL MEALS BOX */}
      <div className="card" style={{ 
        textAlign: 'center', 
        padding: '24px 16px', 
        border: '3px solid var(--accent-primary)', 
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ fontSize: '46px', marginBottom: '2px' }}>🍚</div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-secondary)' }}>
          আজকে মোট মিল
        </div>
        <div style={{ fontSize: '64px', fontWeight: 900, color: 'var(--accent-primary)', lineHeight: 1.1, margin: '6px 0' }} className="tabular-nums">
          {totalMeals}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 900, color: '#111827' }}>
          {totalMealsBengali} টি মিল রান্না করতে হবে
        </div>
      </div>

      {/* Person-by-Person Breakdown */}
      <div className="card" style={{ marginBottom: '16px', padding: '14px 16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
          কার কয়টি মিল:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {flatmateMeals.map((fm) => {
            const isSiam = fm.name.toLowerCase().includes('siam');
            const isRaiyan = fm.name.toLowerCase().includes('raiyan');
            const bName = isSiam ? 'সিয়াম' : isRaiyan ? 'রাইয়ান' : 'জুবায়ের';
            const bPillColor = isSiam ? '#faf5ff' : isRaiyan ? '#f0fdf4' : '#fff7ed';
            const bTextColor = isSiam ? '#7e22ce' : isRaiyan ? '#15803d' : '#c2410c';

            return (
              <div 
                key={fm.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: bPillColor,
                  borderRadius: '6px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 800, color: bTextColor }}>
                  👤 {bName}
                </div>

                <div style={{ fontSize: '15px', fontWeight: 900, color: bTextColor }}>
                  🍚 {fm.quantity} মিল
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cooking Instructions (if any) */}
      {cookingInstructions.length > 0 && (
        <div className="card" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa', marginBottom: '16px', padding: '14px 16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span>🍳</span>
            <span>আজকের রান্নার নির্দেশ:</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cookingInstructions.map((item, idx) => (
              <div key={idx} style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #fed7aa', fontWeight: 700, fontSize: '14px', color: '#9a3412' }}>
                &bull; {item.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Cleaning Tasks (if any) */}
      {cleaningTasks.length > 0 && (
        <div className="card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', padding: '14px 16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span>🧹</span>
            <span>আজকের পরিষ্কারের কাজ:</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cleaningTasks.map((item, idx) => (
              <div key={idx} style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: '14px', color: '#166534' }}>
                &bull; {item.name}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
