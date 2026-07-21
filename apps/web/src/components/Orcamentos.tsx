import React from 'react';
import { Receipt } from 'lucide-react';

export const Orcamentos: React.FC = () => {
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
        backgroundColor: 'var(--color-meta-bg)',
        color: 'var(--color-meta)',
        padding: '1.75rem',
        borderRadius: '50%',
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.25)'
      }}>
        <Receipt size={48} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
          Orçamentos
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
          Defina e acompanhe os orçamentos da sua família por categoria.
        </p>
      </div>
    </div>
  );
};
