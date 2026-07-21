import React from 'react';
import { BarChart3 } from 'lucide-react';

export const Planejamento: React.FC = () => {
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
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        color: '#f59e0b',
        padding: '1.75rem',
        borderRadius: '50%',
        boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)'
      }}>
        <BarChart3 size={48} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
          Planejamento
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
          Planeje suas finanças com projeções de receitas e despesas futuras.
        </p>
      </div>
    </div>
  );
};
