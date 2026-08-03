import React, { useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target as TargetIcon,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Download,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart, 
  Pie, 
  Cell
} from 'recharts';

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  subcategory_id?: string;
  categories?: { name: string; color?: string };
  profiles?: { display_name: string };
}

interface DashboardProps {
  transactions: Transaction[];
  profileName?: string;
  familyMembers?: string[];
  onNavigate?: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  profileName,
  familyMembers = [],
  onNavigate
}) => {
  const name = profileName || 'Usuário';

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'income') income += amount;
      else expense += amount;
    });
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const cashFlowData = useMemo(() => {
    const data = [
      { name: 'Sem 1', Entradas: 0, Saídas: 0 },
      { name: 'Sem 2', Entradas: 0, Saídas: 0 },
      { name: 'Sem 3', Entradas: 0, Saídas: 0 },
      { name: 'Sem 4', Entradas: 0, Saídas: 0 },
    ];
    transactions.forEach(t => {
      const amt = Number(t.amount);
      const day = new Date(t.date).getDate();
      let index = 3;
      if (day <= 7) index = 0;
      else if (day <= 14) index = 1;
      else if (day <= 21) index = 2;
      if (t.type === 'income') data[index].Entradas += amt;
      else data[index].Saídas += amt;
    });
    return data.map(d => ({
      ...d,
      Entradas: Math.round(d.Entradas),
      Saídas: Math.round(d.Saídas),
    }));
  }, [transactions]);

  const donutChartData = useMemo(() => {
    const expenseMap: Record<string, { name: string; value: number; color: string }> = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.categories?.name || 'Outros';
        const color = t.categories?.color || '#6b7280';
        const amount = Number(t.amount);
        if (expenseMap[cat]) expenseMap[cat].value += amount;
        else expenseMap[cat] = { name: cat, value: amount, color };
      }
    });
    const data = Object.values(expenseMap).sort((a, b) => b.value - a.value);
    if (data.length === 0) {
      return [
        { name: 'Transporte', value: 1327, color: '#5856d6' },
        { name: 'Alimentação', value: 1031, color: '#34c759' },
        { name: 'Casa', value: 853, color: '#007aff' },
        { name: 'Saúde', value: 426, color: '#ff9500' },
        { name: 'Outros', value: 341, color: '#af52de' },
      ];
    }
    return data.slice(0, 5);
  }, [transactions]);

  const totalExpenseSum = useMemo(() => 
    donutChartData.reduce((sum, item) => sum + item.value, 0),
    [donutChartData]
  );

  const recentList = useMemo(() => {
    const list = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    if (list.length === 0) {
      return [
        { id: '1', description: '99 Pop - Corrida', date: 'Hoje', type: 'income' as const, amount: 28.40, color: '#30d158' },
        { id: '2', description: 'Venda Salgados', date: 'Hoje', type: 'income' as const, amount: 150.00, color: '#ff9500' },
        { id: '3', description: 'Combustível', date: 'Ontem', type: 'expense' as const, amount: 120.00, color: '#ff453a' },
      ];
    }
    return list.map(t => ({
      id: t.id,
      description: t.description,
      date: new Date(t.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
      type: t.type,
      amount: Number(t.amount),
      color: t.categories?.color || '#8e8e93',
    }));
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL',
    }).format(value);
  };

  const budgetPercentage = useMemo(() => {
    const limit = 3500;
    if (stats.expense <= 0) return 0;
    return Math.min(Math.round((stats.expense / limit) * 100), 100);
  }, [stats]);

  return (
    <>
      {/* Balance hero */}
      <div className="ios-kpi-card primary" onClick={() => onNavigate?.('transactions')} style={{ cursor: 'pointer' }}>
        <div className="ios-kpi-header">
          <span className="ios-kpi-label">Saldo Total</span>
          <div className="ios-kpi-icon" style={{ background: 'rgba(48, 209, 88, 0.2)' }}>
            <Wallet size={16} color="#30d158" />
          </div>
        </div>
        <div className="ios-kpi-value" style={{ color: '#30d158' }}>
          {formatCurrency(stats.balance)}
        </div>
        <div className="ios-kpi-trend up">
          <TrendingUp size={11} /> +12% vs mês anterior
        </div>
      </div>

      {/* KPI Grid */}
      <div className="ios-kpi-grid">
        <div className="ios-kpi-card" onClick={() => onNavigate?.('entradas')} style={{ cursor: 'pointer' }}>
          <div className="ios-kpi-header">
            <span className="ios-kpi-label">Entradas</span>
            <ArrowUpRight size={14} color="#30d158" />
          </div>
          <div className="ios-kpi-value" style={{ color: '#30d158', fontSize: '1.25rem' }}>
            {formatCurrency(stats.income)}
          </div>
          <div className="ios-kpi-trend up">
            <TrendingUp size={11} /> +8%
          </div>
        </div>

        <div className="ios-kpi-card" onClick={() => onNavigate?.('saidas')} style={{ cursor: 'pointer' }}>
          <div className="ios-kpi-header">
            <span className="ios-kpi-label">Saídas</span>
            <ArrowDownRight size={14} color="#ff453a" />
          </div>
          <div className="ios-kpi-value" style={{ color: '#ff453a', fontSize: '1.25rem' }}>
            {formatCurrency(stats.expense)}
          </div>
          <div className="ios-kpi-trend down">
            <TrendingDown size={11} /> +5%
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="ios-chart-card">
        <div className="ios-chart-card-header">
          <h3 className="ios-chart-card-title">Fluxo de Caixa</h3>
          <button className="ios-section-action" onClick={() => onNavigate?.('relatorios')}>
            Ver mais
          </button>
        </div>
        <div style={{ padding: '0 0.5rem 0.75rem' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', padding: '0 0.75rem 0.5rem', fontSize: '0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 2, background: '#30d158', borderRadius: 2 }} />
              Entradas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 2, background: '#ff453a', borderRadius: 2 }} />
              Saídas
            </div>
          </div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#30d158" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#30d158" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff453a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-quaternary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-quaternary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value))]}
                  contentStyle={{ 
                    backgroundColor: '#2c2c2e', 
                    border: 'none',
                    borderRadius: 12, 
                    color: '#fff', 
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    fontSize: 12,
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="Entradas" stroke="#30d158" strokeWidth={2} fillOpacity={1} fill="url(#gIncome)" />
                <Area type="monotone" dataKey="Saídas" stroke="#ff453a" strokeWidth={2} fillOpacity={1} fill="url(#gExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="ios-chart-card">
        <div className="ios-chart-card-header">
          <h3 className="ios-chart-card-title">Distribuição de Gastos</h3>
          <button className="ios-section-action" onClick={() => onNavigate?.('relatorios')}>
            Ver mais
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 1rem 1rem' }}>
          <div style={{ width: 120, height: 120, position: 'relative', flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={54}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donutChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                {formatCurrency(totalExpenseSum)}
              </p>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {donutChartData.slice(0, 4).map((item, idx) => {
              const pct = totalExpenseSum > 0 ? Math.round((item.value / totalExpenseSum) * 100) : 0;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Budget progress */}
      <div className="ios-card">
        <div className="ios-card-body" onClick={() => onNavigate?.('metas')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TargetIcon size={16} color="var(--color-meta)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Meta do Mês</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{budgetPercentage}%</span>
          </div>
          <div style={{
            width: '100%', height: 6, borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden'
          }}>
            <div style={{
              width: `${budgetPercentage}%`, height: '100%', borderRadius: 3,
              background: budgetPercentage > 90 ? '#ff453a' : 'var(--color-meta)',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>R$ 0</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>R$ 3.500</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="ios-section-header">
        <span className="ios-section-title">Últimas Transações</span>
        <button className="ios-section-action" onClick={() => onNavigate?.('transactions')}>
          Ver todas
        </button>
      </div>

      <div className="ios-grouped-list stagger">
        {recentList.map((t) => (
          <div
            key={t.id}
            className="ios-list-item"
            onClick={() => onNavigate?.('transactions')}
          >
            <div className="ios-list-item-icon" style={{
              background: t.type === 'income' ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
              color: t.type === 'income' ? '#30d158' : '#ff453a',
            }}>
              {t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </div>
            <div className="ios-list-item-content">
              <div className="ios-list-item-title">{t.description}</div>
              <div className="ios-list-item-subtitle">{t.date}</div>
            </div>
            <span className="ios-tx-amount" style={{
              color: t.type === 'income' ? '#30d158' : '#ff453a',
            }}>
              {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
            </span>
            <ChevronRight size={14} color="var(--text-quaternary)" />
          </div>
        ))}
      </div>
    </>
  );
};
