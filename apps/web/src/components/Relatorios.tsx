import React from 'react';
import { BarChart3 } from 'lucide-react';

export const Relatorios: React.FC = () => {
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
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        color: 'var(--color-primary)',
        padding: '1.75rem',
        borderRadius: '50%',
        boxShadow: 'var(--glow-primary)'
      }}>
        <BarChart3 size={48} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
          Relatórios
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
          Gere relatórios detalhados de receitas, despesas e fluxo de caixa.
        </p>
      </div>
    </div>
  );
};
