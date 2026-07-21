import React from 'react';
import { Calendar } from 'lucide-react';

export const Calendario: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      textAlign: 'center',
      gap: '1.5rem',
      padding: '2rem'
    }} className="glass-card">
      <div style={{
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        color: 'var(--color-secondary)',
        padding: '1.75rem',
        borderRadius: '50%',
        boxShadow: 'var(--glow-secondary)'
      }}>
        <Calendar size={48} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
          Calendário
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
          Visualize suas transações e compromissos financeiros no calendário.
        </p>
      </div>
    </div>
  );
};
