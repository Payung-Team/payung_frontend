import React from 'react';

// ── Shared field-display primitives for booking detail views ──────────────────
// Label-left / value-right rows used by BookingDetailPage.tsx. The tracking
// view's collapsible panel uses its own stacked DetailField instead.

export function Divider() {
  return <div style={{ height: '0.8px', background: '#F0F1F3', margin: '18px 0' }} />;
}

export function SectionTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#8A8C8E', margin: '0 0 10px', lineHeight: '20px' }}>
      {children}
    </p>
  );
}

export function InfoRow({ label, value, valueFont = 'inter' }: Readonly<{ label: string; value: string; valueFont?: 'inter' | 'thai' }>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', lineHeight: '20px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: valueFont === 'inter' ? "'Inter', sans-serif" : "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A', lineHeight: '20px', textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}
