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
}

const tabs = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'transactions', label: 'Extrato', icon: Receipt },
  { id: 'relatorios', label: 'Relatórios', icon: PieChart },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'family', label: 'Perfil', icon: Users },
];

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  currentView,
  setView,
  onAddTransactionClick,
}) => {
  const getActiveTab = () => {
    if (currentView === 'dashboard') return 'dashboard';
    if (currentView.startsWith('transactions')) return 'transactions';
    if (currentView === 'relatorios') return 'relatorios';
    if (currentView === 'metas') return 'metas';
    if (currentView === 'family') return 'family';
    return 'dashboard';
  };

  const active = getActiveTab();

  return (
    <nav className="ios-tab-bar">
      <div className="ios-tab-bar-inner">
        {tabs.slice(0, 2).map((tab) => {
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

        {/* Center FAB */}
        <button
          className="ios-tab-fab"
          onClick={onAddTransactionClick}
          aria-label="Nova transação"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {tabs.slice(2).map((tab) => {
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
  );
};
