import React from 'react';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  Store, 
  Car, 
  Settings,
  Plus,
  Target,
  BarChart3,
  Calendar,
  Users,
  X,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
  onAddTransactionClick: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  onLogout,
  onAddTransactionClick,
  isOpen,
  setIsOpen
}) => {
  const menuItems = [
    { id: 'dashboard', name: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
    { id: 'transactions', name: 'Transações', icon: <Receipt size={18} /> },
    { id: 'entradas', name: 'Entradas', icon: <ArrowUpRight size={18} /> },
    { id: 'saidas', name: 'Saídas', icon: <ArrowDownRight size={18} /> },
    { id: 'salgados', name: 'Salgados (Vendas)', icon: <Store size={18} /> },
    { id: 'uber99', name: 'Uber / 99', icon: <Car size={18} /> },
    { id: 'orcamentos', name: 'Orçamentos', icon: <Receipt size={18} /> },
    { id: 'metas', name: 'Metas', icon: <Target size={18} /> },
    { id: 'planejamento', name: 'Planejamento', icon: <BarChart3 size={18} /> },
    { id: 'relatorios', name: 'Relatórios', icon: <BarChart3 size={18} /> },
    { id: 'calendario', name: 'Calendário', icon: <Calendar size={18} /> },
    { id: 'family', name: 'Família', icon: <Users size={18} /> },
    { id: 'categories', name: 'Configurações', icon: <Settings size={18} /> },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleMenuClick = (id: string) => {
    setView(id);
    setIsOpen(false);
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Mobile Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }} className="mobile-only">
          <button 
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.25rem'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav" style={{ flex: 1, marginTop: '0.5rem' }}>
          {menuItems.map((item) => {
            const isActive = currentView === item.id || 
              (currentView === 'transactions-entradas' && item.id === 'entradas') ||
              (currentView === 'transactions-saidas' && item.id === 'saidas') ||
              (currentView === 'transactions-salgados' && item.id === 'salgados') ||
              (currentView === 'transactions-uber99' && item.id === 'uber99');
            
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                {item.name}
              </button>
            );
          })}

          {/* Add Transaction Button */}
          <button className="sidebar-btn-add" onClick={onAddTransactionClick}>
            <Plus size={18} /> Nova Transação
          </button>
        </nav>

        {/* Signout bottom link */}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.75rem 1rem',
            marginTop: 'auto',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-expense)',
            fontFamily: 'var(--font-title)',
            fontSize: '0.88rem',
            fontWeight: '600',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-expense-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={16} />
          Sair da Conta
        </button>
      </aside>

      <style>{`
        @media (min-width: 1025px) {
          .mobile-only {
            display: none !important;
          }
        }
        @media (max-width: 1024px) {
          .sidebar {
            width: 280px;
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};
