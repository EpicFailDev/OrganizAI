import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Search, 
  Bell, 
  ChevronDown, 
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
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
}

interface DashboardProps {
  transactions: Transaction[];
  profileName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, profileName }) => {
  const name = profileName || 'Guilherme';

  // 1. Calculations
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'income') {
        income += amount;
      } else {
        expense += amount;
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [transactions]);

  // 2. Line Chart data (Fluxo de Caixa)
  const lineChartData = useMemo(() => {
    // Generate dates for current month
    const dataMap: Record<string, { name: string; Entradas: number; Saídas: number; Saldo: number }> = {};
    const dates = ['01 Mai', '08 Mai', '15 Mai', '22 Mai', '31 Mai'];
    
    dates.forEach(d => {
      dataMap[d] = { name: d, Entradas: 0, Saídas: 0, Saldo: 0 };
    });

    // Populate mock points around real values for illustration matching
    dataMap['01 Mai'] = { name: '01 Mai', Entradas: 2000, Saídas: 1000, Saldo: 1000 };
    dataMap['08 Mai'] = { name: '08 Mai', Entradas: 4500, Saídas: 2200, Saldo: 2300 };
    dataMap['15 Mai'] = { name: '15 Mai', Entradas: 7200, Saídas: 3500, Saldo: 3700 };
    dataMap['22 Mai'] = { name: '22 Mai', Entradas: 9800, Saídas: 3800, Saldo: 6000 };
    dataMap['31 Mai'] = { name: '31 Mai', Entradas: stats.income || 12540, Saídas: stats.expense || 4264, Saldo: stats.balance || 8275 };

    return Object.values(dataMap);
  }, [stats]);

  // 3. Donut Chart (Distribuição de Gastos)
  const donutChartData = useMemo(() => {
    const expenseMap: Record<string, { name: string; value: number; color: string }> = {};

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const categoryName = t.categories?.name || 'Outros';
        const color = t.categories?.color || '#9E9E9E';
        const amount = Number(t.amount);

        if (expenseMap[categoryName]) {
          expenseMap[categoryName].value += amount;
        } else {
          expenseMap[categoryName] = { name: categoryName, value: amount, color };
        }
      }
    });

    const data = Object.values(expenseMap).sort((a, b) => b.value - a.value);
    
    if (data.length === 0) {
      // Fallback data matching mockup precisely if empty
      return [
        { name: 'Transporte', value: 3100, color: '#0ea5e9' },
        { name: 'Alimentação', value: 2400, color: '#0f172a' },
        { name: 'Casa', value: 2000, color: '#14b8a6' },
        { name: 'Saúde', value: 1000, color: '#f43f5e' },
        { name: 'Lazer', value: 800, color: '#f59e0b' },
        { name: 'Outros', value: 700, color: '#94a3b8' }
      ];
    }
    return data;
  }, [transactions]);

  // Total expenses sum for percentage legends
  const totalExpenseSum = useMemo(() => {
    return donutChartData.reduce((sum, item) => sum + item.value, 0);
  }, [donutChartData]);

  // 4. Accounts by Category (Contas por Categoria) - left progress list
  const categoryAccounts = useMemo(() => {
    const categoryMap: Record<string, { name: string; amount: number; color: string }> = {};

    transactions.forEach(t => {
      const categoryName = t.categories?.name || 'Outros';
      const color = t.categories?.color || '#9E9E9E';
      const amount = Number(t.amount);

      if (categoryMap[categoryName]) {
        categoryMap[categoryName].amount += amount;
      } else {
        categoryMap[categoryName] = { name: categoryName, amount, color };
      }
    });

    const sortedList = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
    
    if (sortedList.length === 0) {
      // Mock data matching mockup exactly
      return [
        { name: 'Uber / 99', amount: 5820, percentage: 46 },
        { name: 'Salgados (Vendas)', amount: 4250, percentage: 34 },
        { name: 'Outras entradas', amount: 2470, percentage: 20 }
      ];
    }

    const totalAll = sortedList.reduce((sum, item) => sum + item.amount, 0);
    return sortedList.map(item => ({
      name: item.name,
      amount: item.amount,
      percentage: totalAll > 0 ? Math.round((item.amount / totalAll) * 100) : 0
    }));
  }, [transactions]);

  // 5. Recent Transactions
  const recentList = useMemo(() => {
    const list = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);

    if (list.length === 0) {
      // Mock data matching mockup exactly
      return [
        { id: '1', description: '99 Pop - Corrida', date: 'Hoje, 10:45', type: 'income', amount: 28.40, categoryName: 'Uber / 99' },
        { id: '2', description: 'Venda de Salgados', date: 'Hoje, 09:15', type: 'income', amount: 150.00, categoryName: 'Vendas' },
        { id: '3', description: 'Combustível', date: 'Hoje, 08:30', type: 'expense', amount: 120.00, categoryName: 'Transporte' },
        { id: '4', description: 'Mercado', date: 'Ontem, 18:20', type: 'expense', amount: 89.50, categoryName: 'Alimentação' }
      ];
    }

    return list.map(t => ({
      id: t.id,
      description: t.description,
      date: new Date(t.date).toLocaleDateString('pt-BR') + ' • ' + (t.type === 'income' ? 'Entrada' : 'Saída'),
      type: t.type,
      amount: Number(t.amount),
      categoryName: t.categories?.name || 'Geral'
    }));
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Header bar with search, notifications, profile */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Olá, {name}! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
            Aqui está o resumo financeiro da sua família.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Search bar */}
          <div className="search-wrapper">
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
            <input type="text" className="search-input" placeholder="Buscar" />
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Bell size={20} color="var(--text-secondary)" />
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '0.6rem',
              fontWeight: 700,
              borderRadius: '50%',
              width: '14px',
              height: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>1</span>
          </div>

          {/* Profile Details */}
          <div className="header-profile">
            <div className="header-avatar">
              {name.substring(0, 1).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {name} <ChevronDown size={14} />
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Administrador</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date filter row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0.25rem 0' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 1rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer'
        }}>
          <span>01/05/2024 - 31/05/2024</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
        </div>
      </div>

      {/* Four KPI Cards row */}
      <div className="dashboard-kpis">
        {/* 1. Saldo Total */}
        <div className="kpi-card-mock saldo-total">
          <div className="kpi-label">
            <span>Saldo Total</span>
            <Wallet size={16} />
          </div>
          <div className="kpi-val">
            {formatCurrency(stats.balance || 8275.40)}
          </div>
          <div className="kpi-trend" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            ▲ 12% vs mês anterior
          </div>
          {/* Wave decor */}
          <div className="kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', opacity: 0.15 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,20 Q15,5 30,15 T60,10 T90,25 T100,15 L100,30 L0,30 Z" fill="#ffffff" />
            </svg>
          </div>
        </div>

        {/* 2. Total de Entradas */}
        <div className="kpi-card-mock">
          <div className="kpi-label">
            <span>Total de Entradas</span>
            <TrendingUp size={16} color="var(--color-income)" />
          </div>
          <div className="kpi-val" style={{ color: 'var(--color-income)' }}>
            {formatCurrency(stats.income || 12540.00)}
          </div>
          <div className="kpi-trend up">
            ▲ 8% vs mês anterior
          </div>
          {/* Wave decor */}
          <div className="kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', opacity: 0.08 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,25 Q20,10 40,20 T80,5 T100,15 L100,30 L0,30 Z" fill="var(--color-income)" />
            </svg>
          </div>
        </div>

        {/* 3. Total de Saídas */}
        <div className="kpi-card-mock">
          <div className="kpi-label">
            <span>Total de Saídas</span>
            <TrendingDown size={16} color="var(--color-expense)" />
          </div>
          <div className="kpi-val" style={{ color: 'var(--color-expense)' }}>
            {formatCurrency(stats.expense || 4264.60)}
          </div>
          <div className="kpi-trend down">
            ▼ 5% vs mês anterior
          </div>
          {/* Wave decor */}
          <div className="kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', opacity: 0.08 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,15 Q25,25 50,10 T90,20 T100,28 L100,30 L0,30 Z" fill="var(--color-expense)" />
            </svg>
          </div>
        </div>

        {/* 4. Meta do Mês */}
        <div className="kpi-card-mock">
          <div className="kpi-label">
            <span>Meta do mês</span>
            <Target size={16} color="var(--color-meta)" />
          </div>
          <div className="kpi-val" style={{ color: '#0f172a' }}>
            R$ 3.500,00
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <div className="kpi-progress-container" style={{ width: '80%' }}>
              <div className="kpi-progress-bar" style={{ width: '75%', backgroundColor: 'var(--color-meta)' }} />
            </div>
            <span>75%</span>
          </div>
        </div>
      </div>

      {/* Middle Charts Grid */}
      <div className="section-grid">
        {/* Fluxo de Caixa Line Chart */}
        <div className="dashboard-card">
          <div className="card-header-mock">
            <h3 className="card-title-mock">Fluxo de Caixa</h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: '600'
            }}>
              <span>Este mês</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `R$${v >= 1000 ? v / 1000 + 'k' : v}`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value))]}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: 'var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}
                />
                <Line type="monotone" dataKey="Entradas" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Saldo" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Gastos Donut Chart */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-mock">
            <h3 className="card-title-mock">Distribuição de Gastos</h3>
            <span style={{ color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 800 }}>•••</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
            {/* Donut chart layout */}
            <div style={{ width: '150px', height: '150px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={donutChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
              {/* Central text displaying sum */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatCurrency(totalExpenseSum || 4264.60)}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total</p>
              </div>
            </div>

            {/* Legends list */}
            <div className="chart-legend-container" style={{ flex: 1, paddingLeft: '1.5rem' }}>
              {donutChartData.map((item, idx) => {
                const percentage = totalExpenseSum > 0 ? Math.round((item.value / totalExpenseSum) * 100) : 0;
                return (
                  <div className="chart-legend-row" key={idx}>
                    <span className="chart-legend-label">
                      <span className="chart-legend-dot" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="chart-legend-value">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section Grid */}
      <div className="section-grid">
        {/* Contas por Categoria list with progress bars */}
        <div className="dashboard-card">
          <div className="card-header-mock">
            <h3 className="card-title-mock">Contas por Categoria</h3>
            <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '750', cursor: 'pointer' }}>Ver todas</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {categoryAccounts.map((account, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{account.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(account.amount)} <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.25rem' }}>{account.percentage}%</span>
                  </span>
                </div>
                <div className="kpi-progress-container" style={{ margin: 0, height: '6px' }}>
                  <div className="kpi-progress-bar" style={{
                    width: `${account.percentage}%`,
                    backgroundColor: idx === 0 ? '#15803d' : idx === 1 ? '#f59e0b' : '#3b82f6'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas Transações list */}
        <div className="dashboard-card">
          <div className="card-header-mock">
            <h3 className="card-title-mock">Últimas Transações</h3>
            <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '750', cursor: 'pointer' }}>Ver todas</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentList.map((t) => (
              <div 
                key={t.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '0.85rem',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: t.type === 'income' ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                    color: t.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}>
                    {t.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t.description}
                    </h4>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {t.date}
                    </p>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: t.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'
                }}>
                  {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
