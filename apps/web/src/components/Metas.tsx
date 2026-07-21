import React from 'react';
import { Target } from 'lucide-react';

export const Metas: React.FC = () => {
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
        backgroundColor: 'var(--color-secondary-glow)',
        color: 'var(--color-secondary)',
        padding: '1.75rem',
        borderRadius: '50%',
        boxShadow: 'var(--glow-secondary)'
      }}>
        <Target size={48} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
          Metas Financeiras
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
          Crie e acompanhe metas de economia e investimento para sua família.
        </p>
      </div>
    </div>
  );
};
