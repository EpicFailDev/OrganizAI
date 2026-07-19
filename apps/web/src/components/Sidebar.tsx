import React from 'react';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  Store, 
  Car, 
  PieChart, 
  Target, 
  CalendarRange, 
  BarChart3, 
  CalendarDays, 
  Users, 
  Settings,
  Plus,
  RefreshCw,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
  onAddTransactionClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  onLogout,
  onAddTransactionClick
}) => {
  const menuItems = [
    { id: 'dashboard', name: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
    { id: 'transactions', name: 'Transações', icon: <Receipt size={18} /> },
    { id: 'entradas', name: 'Entradas', icon: <ArrowUpRight size={18} />, isMock: true },
    { id: 'saidas', name: 'Saídas', icon: <ArrowDownRight size={18} />, isMock: true },
    { id: 'salgados', name: 'Salgados (Vendas)', icon: <Store size={18} />, isMock: true },
    { id: 'uber99', name: 'Uber / 99', icon: <Car size={18} />, isMock: true },
    { id: 'orcamentos', name: 'Orçamentos', icon: <PieChart size={18} />, isMock: true },
    { id: 'metas', name: 'Metas', icon: <Target size={18} />, isMock: true },
    { id: 'planejamento', name: 'Planejamento', icon: <CalendarRange size={18} />, isMock: true },
    { id: 'relatorios', name: 'Relatórios', icon: <BarChart3 size={18} />, isMock: true },
    { id: 'calendario', name: 'Calendário', icon: <CalendarDays size={18} />, isMock: true },
    { id: 'family', name: 'Família', icon: <Users size={18} /> },
    { id: 'categories', name: 'Configurações', icon: <Settings size={18} /> },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start', margin: '0 0.5rem' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
            <path d="M10 15h4"/>
          </svg>
          <span className="sidebar-title">Finance<span style={{ color: '#22c55e' }}>Fam</span></span>
        </div>
        <span className="sidebar-subtitle" style={{ alignSelf: 'flex-start', margin: '0.1rem 0.5rem' }}>
          Organização financeira para toda a família
        </span>
      </div>

      {/* Handwritten Tagline */}
      <div className="sidebar-motto">
        Juntos, construímos um futuro melhor! 💚
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!item.isMock) setView(item.id);
              }}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{
                opacity: item.isMock ? 0.6 : 1,
                cursor: item.isMock ? 'default' : 'pointer'
              }}
            >
              {item.icon}
              {item.name}
            </button>
          );
        })}

        {/* Add Transaction Button inside nav list */}
        <button className="sidebar-btn-add" onClick={onAddTransactionClick}>
          <Plus size={18} /> Nova Transação
        </button>
      </nav>

      {/* 3D Character Illustration */}
      <div className="sidebar-artwork-container">
        <img 
          src="/sidebar_illustration.jpg" 
          className="sidebar-artwork-img" 
          alt="FinanceFam 3D Illustration" 
        />
      </div>

      {/* Sincronização Inteligente Card */}
      <div className="sidebar-sync-card">
        <div className="sidebar-sync-title">
          <RefreshCw size={14} color="#22c55e" style={{ animation: 'spin 12s linear infinite' }} />
          Sincronização Inteligente
        </div>
        <div className="sidebar-sync-desc">
          Conecte suas contas bancárias, Uber, 99 e acompanhe tudo em um só lugar.
        </div>
        <div className="sidebar-sync-brands">
          <span className="sidebar-brand-badge">Uber</span>
          <span className="sidebar-brand-badge" style={{ color: '#f59e0b' }}>99</span>
          <span className="sidebar-brand-badge" style={{ color: '#8b5cf6' }}>nu</span>
          <span className="sidebar-brand-badge" style={{ color: '#3b82f6' }}>bb</span>
          <span className="sidebar-brand-badge" style={{ color: '#ef4444' }}>caixa</span>
        </div>
      </div>

      {/* Signout bottom link */}
      <button
        onClick={handleSignOut}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          padding: '0.65rem 1rem',
          marginTop: '1.5rem',
          border: 'none',
          background: 'transparent',
          color: '#ef4444',
          fontFamily: 'var(--font-title)',
          fontSize: '0.85rem',
          fontWeight: '600',
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <LogOut size={16} />
        Sair da Conta
      </button>
    </aside>
  );
};
