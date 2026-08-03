import React from 'react';
import {
  Receipt,
  Plus,
  Target,
  Car,
  Store,
  Home,
  PieChart,
  Users
} from 'lucide-react';
import { InteractiveMenu, type InteractiveMenuItem } from './InteractiveMenu';

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
  const getTabs = (): InteractiveMenuItem[] => {
    const baseTabs: InteractiveMenuItem[] = [
      { id: 'dashboard', label: 'Início', icon: Home },
    ];

    const professionTabs: InteractiveMenuItem[] = [];
    if (profession === 'motorista') {
      professionTabs.push({ id: 'transactions-uber99', label: 'Uber/99', icon: Car });
    } else if (profession === 'vendedor') {
      professionTabs.push({ id: 'transactions-salgados', label: 'Salgados', icon: Store });
    } else {
      professionTabs.push({ id: 'transactions', label: 'Extrato', icon: Receipt });
    }

    const endTabs: InteractiveMenuItem[] = [
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

  const activeId = getActiveTab();

  return (
    <>
      <nav className="ios-tab-bar">
        <InteractiveMenu
          items={tabs}
          activeId={activeId}
          onItemChange={(id) => setView(id)}
          accentColor="var(--color-secondary, #0a84ff)"
        />
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
