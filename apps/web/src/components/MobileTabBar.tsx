import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Users,
  Plus,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Car,
  Store,
  Settings,
  Home,
  PieChart,
} from 'lucide-react';

interface MobileTabBarProps {
  currentView: string;
  setView: (view: string) => void;
  onAddTransactionClick: () => void;
  profession?: string;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  currentView,
  setView,
  onAddTransactionClick,
  profession
}) => {
  const getTabs = () => {
    const baseTabs = [
      { id: 'dashboard', label: 'Início', icon: Home },
    ];

    const professionTabs = [];
    if (profession === 'motorista') {
      professionTabs.push({ id: 'transactions-uber99', label: 'Uber/99', icon: Car });
    } else if (profession === 'vendedor') {
      professionTabs.push({ id: 'transactions-salgados', label: 'Salgados', icon: Store });
    } else {
      professionTabs.push({ id: 'transactions', label: 'Extrato', icon: Receipt });
    }

    const endTabs = [
      { id: 'relatorios', label: 'Relatórios', icon: PieChart },
      { id: 'metas', label: 'Metas', icon: Target },
      { id: 'family', label: 'Perfil', icon: Users },
    ];

    return [...baseTabs, ...professionTabs, ...endTabs];
  };

  const tabs = getTabs();
  const getActiveTab = () => {
    if (currentView === 'dashboard') return 'dashboard';
    if (currentView === 'transactions' || currentView.startsWith('transactions-')) {
      if (profession === 'motorista') return 'transactions-uber99';
      if (profession === 'vendedor') return 'transactions-salgados';
      return 'transactions';
    }
    if (currentView === 'relatorios') return 'relatorios';
    if (currentView === 'metas') return 'metas';
    if (currentView === 'family') return 'family';
    return 'dashboard';
  };

  const active = getActiveTab();

  return (
    <>
      <nav className="ios-tab-bar">
        <div className="ios-tab-bar-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                className={`ios-tab ${isActive ? 'active' : ''}`}
                onClick={() => setView(tab.id)}
              >
                <div className="ios-tab-icon">
                  <Icon size={24} strokeWidth={isActive ? 2.2 : 1.6} />
                </div>
                <span className="ios-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button (bottom-right) */}
      <button
        className="ios-fab-floating"
        onClick={onAddTransactionClick}
        aria-label="Nova transação"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </>
  );
};
