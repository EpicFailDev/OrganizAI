import React, { useMemo } from 'react';
import { 
  Wallet, 
  Search, 
  Bell, 
  ChevronDown, 
  Target,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  TrendingUp,
  TrendingDown,
  Target as TargetIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
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

  // 1. Core Calculations
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

  // 2. Cash Flow Chart Data (last 30 days grouped in 5 steps)
  const cashFlowData = useMemo(() => {
    const data = [
      { name: '01 Mai', Entradas: 0, Saídas: 0, Saldo: 0 },
      { name: '08 Mai', Entradas: 0, Saídas: 0, Saldo: 0 },
      { name: '15 Mai', Entradas: 0, Saídas: 0, Saldo: 0 },
      { name: '22 Mai', Entradas: 0, Saídas: 0, Saldo: 0 },
      { name: '31 Mai', Entradas: 0, Saídas: 0, Saldo: 0 },
    ];

    transactions.forEach(t => {
      const amt = Number(t.amount);
      const day = new Date(t.date).getDate();
      let index = 4;
      if (day <= 7) index = 0;
      else if (day <= 14) index = 1;
      else if (day <= 21) index = 2;
      else if (day <= 28) index = 3;

      if (t.type === 'income') {
        data[index].Entradas += amt;
      } else {
        data[index].Saídas += amt;
      }
    });

    let runningBalance = 0;
    return data.map(item => {
      runningBalance += (item.Entradas - item.Saídas);
      return {
        ...item,
        Entradas: Math.round(item.Entradas),
        Saídas: Math.round(item.Saídas),
        Saldo: Math.round(runningBalance)
      };
    });
  }, [transactions]);

  // 3. Donut Chart (Distribuição de Gastos)
  const donutChartData = useMemo(() => {
    const expenseMap: Record<string, { name: string; value: number; color: string }> = {};

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const categoryName = t.categories?.name || 'Outros';
        const color = t.categories?.color || '#6b7280';
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
      return [
        { name: 'Transporte', value: 1327, color: '#1e3a5f' },
        { name: 'Alimentação', value: 1031, color: '#2563eb' },
        { name: 'Casa', value: 853, color: '#3b82f6' },
        { name: 'Saúde', value: 426, color: '#60a5fa' },
        { name: 'Lazer', value: 341, color: '#93c5fd' },
        { name: 'Outros', value: 286, color: '#bfdbfe' },
      ];
    }
    return data;
  }, [transactions]);

  const totalExpenseSum = useMemo(() => {
    return donutChartData.reduce((sum, item) => sum + item.value, 0);
  }, [donutChartData]);

  // 4. Category Accounts
  const categoryAccounts = useMemo(() => {
    const map: Record<string, { name: string; amount: number; color: string }> = {};

    transactions.forEach(t => {
      const categoryName = t.categories?.name || 'Outros';
      const color = t.categories?.color || '#6b7280';
      const amount = Number(t.amount);

      if (map[categoryName]) {
        map[categoryName].amount += amount;
      } else {
        map[categoryName] = { name: categoryName, amount, color };
      }
    });

    const list = Object.values(map).sort((a, b) => b.amount - a.amount);
    const totalAll = list.reduce((sum, item) => sum + item.amount, 0);

    if (list.length === 0) {
      return [
        { name: 'Uber / 99', amount: 5820, color: '#10b981', percentage: 46 },
        { name: 'Salgados (Vendas)', amount: 4250, color: '#f59e0b', percentage: 34 },
        { name: 'Outras entradas', amount: 2470, color: '#3b82f6', percentage: 20 }
      ];
    }

    return list.map(item => ({
      ...item,
      percentage: totalAll > 0 ? Math.round((item.amount / totalAll) * 100) : 0
    }));
  }, [transactions]);

  // 5. Recent Transactions
  const recentList = useMemo(() => {
    const list = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);

    if (list.length === 0) {
      return [
        { id: '1', description: '99 Pop - Corrida', date: 'Hoje, 10:45', type: 'income' as const, amount: 28.40, categoryName: 'Uber / 99', color: '#10b981', creator: 'Guilherme' },
        { id: '2', description: 'Venda de Salgados', date: 'Hoje, 09:15', type: 'income' as const, amount: 150.00, categoryName: 'Salgados', color: '#f59e0b', creator: 'Guilherme' },
        { id: '3', description: 'Combustível', date: 'Hoje, 08:30', type: 'expense' as const, amount: 120.00, categoryName: 'Transporte', color: '#ef4444', creator: 'Guilherme' },
        { id: '4', description: 'Mercado', date: 'Ontem, 18:20', type: 'expense' as const, amount: 89.50, categoryName: 'Alimentação', color: '#ef4444', creator: 'Guilherme' }
      ];
    }

    return list.map(t => ({
      id: t.id,
      description: t.description,
      date: new Date(t.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
      type: t.type,
      amount: Number(t.amount),
      categoryName: t.categories?.name || 'Geral',
      color: t.categories?.color || '#9ca3af',
      creator: t.profiles?.display_name ? t.profiles.display_name.split(' ')[0] : 'Usuário'
    }));
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Budget percentage for meta card
  const budgetPercentage = useMemo(() => {
    const limit = 3500;
    if (stats.expense <= 0) return 0;
    const pct = Math.round((stats.expense / limit) * 100);
    return Math.min(pct, 100);
  }, [stats]);

  // Mock trends
  const balanceTrend = 12;
  const incomeTrend = 8;
  const expenseTrend = 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Olá, {name}! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Aqui está o resumo financeiro da sua família.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar" 
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '50px',
                padding: '0.55rem 1rem 0.55rem 2.25rem',
                width: '200px',
                fontSize: '0.85rem',
                color: '#fff',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'all var(--transition-fast)'
              }}
            />
          </div>

          {/* Notifications */}
          <div style={{
            position: 'relative',
            cursor: 'pointer',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            padding: '0.55rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
            onClick={() => onNavigate?.('dashboard')}
          >
            <Bell size={18} color="var(--text-secondary)" />
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              backgroundColor: 'var(--color-primary)',
              borderRadius: '50%',
              width: '8px',
              height: '8px'
            }} />
          </div>

          {/* Profile */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer'
          }}
            onClick={() => onNavigate?.('family')}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}>
              {name.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {name} <ChevronDown size={14} color="var(--text-secondary)" />
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Administrador</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.45rem 0.85rem',
          fontSize: '0.78rem',
          fontWeight: '600',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer'
        }}
          onClick={() => onNavigate?.('calendario')}
        >
          <span>01/05/2024 - 31/05/2024</span>
          <Calendar size={14} />
        </div>
      </div>

      {/* Four KPI Cards Row */}
      <div className="dashboard-kpis">
        {/* 1. Saldo Total - Green card */}
        <div className="kpi-card-mock saldo-total" onClick={() => onNavigate?.('transactions')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">
            <span>Saldo Total</span>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '0.35rem', borderRadius: '50%' }}>
              <Wallet size={16} color="#fff" />
            </div>
          </div>
          <div className="kpi-val">
            {formatCurrency(stats.balance)}
          </div>
          <div className="kpi-trend up" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}>
            <TrendingUp size={12} /> {balanceTrend}% vs mês anterior
          </div>
          {/* Mini sparkline */}
          <div className="kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', opacity: 0.15 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,20 Q15,5 30,15 T60,8 T90,22 T100,12 L100,30 L0,30 Z" fill="#ffffff" />
            </svg>
          </div>
        </div>

        {/* 2. Total de Entradas */}
        <div className="kpi-card-mock" onClick={() => onNavigate?.('entradas')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">
            <span>Total de Entradas</span>
            <div style={{ backgroundColor: 'var(--color-income-bg)', padding: '0.35rem', borderRadius: '50%' }}>
              <Download size={16} color="var(--color-income)" />
            </div>
          </div>
          <div className="kpi-val" style={{ color: 'var(--color-income)' }}>
            {formatCurrency(stats.income)}
          </div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> {incomeTrend}% vs mês anterior
          </div>
          <div className="kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', opacity: 0.08 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,25 Q20,8 40,20 T80,4 T100,15 L100,30 L0,30 Z" fill="var(--color-income)" />
            </svg>
          </div>
        </div>

        {/* 3. Total de Saídas */}
        <div className="kpi-card-mock" onClick={() => onNavigate?.('saidas')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">
            <span>Total de Saídas</span>
            <div style={{ backgroundColor: 'var(--color-expense-bg)', padding: '0.35rem', borderRadius: '50%' }}>
              <ArrowUpRight size={16} color="var(--color-expense)" />
            </div>
          </div>
          <div className="kpi-val" style={{ color: 'var(--color-expense)' }}>
            {formatCurrency(stats.expense)}
          </div>
          <div className="kpi-trend down">
            <TrendingDown size={12} /> {expenseTrend}% vs mês anterior
          </div>
          <div className="kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', opacity: 0.08 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,15 Q25,25 50,8 T90,18 T100,28 L100,30 L0,30 Z" fill="var(--color-expense)" />
            </svg>
          </div>
        </div>

        {/* 4. Meta do mês */}
        <div className="kpi-card-mock" onClick={() => onNavigate?.('metas')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">
            <span>Meta do mês</span>
            <div style={{ backgroundColor: 'var(--color-meta-bg)', padding: '0.35rem', borderRadius: '50%' }}>
              <TargetIcon size={16} color="var(--color-meta)" />
            </div>
          </div>
          <div className="kpi-val" style={{ color: '#ffffff' }}>
            R$ 3.500,00
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span>{budgetPercentage}%</span>
            </div>
            <div className="kpi-progress-container" style={{ margin: 0, height: '6px' }}>
              <div className="kpi-progress-bar" style={{ 
                width: `${budgetPercentage}%`, 
                backgroundColor: budgetPercentage > 90 ? 'var(--color-expense)' : 'var(--color-meta)' 
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Charts Grid */}
      <div className="section-grid">
        {/* Fluxo de Caixa Line Chart */}
        <div className="dashboard-card">
          <div className="card-header-mock">
            <div>
              <h3 className="card-title-mock">Fluxo de Caixa</h3>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.45rem 0.75rem',
              fontSize: '0.75rem',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600'
            }}
              onClick={() => onNavigate?.('relatorios')}
            >
              <span>Este mês</span>
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: '16px', height: '2px', backgroundColor: 'var(--color-income)', borderRadius: '2px' }} />
              Entradas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: '16px', height: '2px', backgroundColor: 'var(--color-expense)', borderRadius: '2px' }} />
              Saídas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: '16px', height: '2px', backgroundColor: '#ffffff', borderRadius: '2px' }} />
              Saldo
            </div>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#fff" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v >= 1000 ? v / 1000 + 'k' : v}`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value))]}
                  contentStyle={{ 
                    backgroundColor: '#0c101b', 
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    boxShadow: 'var(--shadow-md)'
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="Entradas" stroke="var(--color-income)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEntradas)" activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Saídas" stroke="var(--color-expense)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaidas)" activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Saldo" stroke="#ffffff" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaldo)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Gastos Donut Chart */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-mock" style={{ marginBottom: '0.5rem' }}>
            <div>
              <h3 className="card-title-mock">Distribuição de Gastos</h3>
            </div>
            <div style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem' }}
              onClick={() => onNavigate?.('relatorios')}
            >⋯</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem' }}>
            <div style={{ width: '100%', height: '160px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={donutChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute',
                top: '52%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {formatCurrency(totalExpenseSum)}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total</p>
              </div>
            </div>

            {/* Legends list */}
            <div className="chart-legend-container" style={{ width: '100%', maxHeight: '120px', overflowY: 'auto' }}>
              {donutChartData.map((item, idx) => {
                const percentage = totalExpenseSum > 0 ? Math.round((item.value / totalExpenseSum) * 100) : 0;
                return (
                  <div className="chart-legend-row" key={idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigate?.('transactions')}
                  >
                    <span className="chart-legend-label">
                      <span className="chart-legend-dot" style={{ backgroundColor: item.color, color: item.color }} />
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
        {/* Contas por Categoria */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-mock" style={{ marginBottom: '1rem' }}>
            <div>
              <h3 className="card-title-mock">Contas por Categoria</h3>
            </div>
            <span
              style={{ fontSize: '0.78rem', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => onNavigate?.('transactions')}
            >
              Ver todas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {categoryAccounts.map((account, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', cursor: 'pointer' }}
                onClick={() => onNavigate?.('transactions')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: 600 }}>
                  <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: account.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#fff'
                    }}>
                      {account.name.substring(0, 2).toUpperCase()}
                    </span>
                    {account.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {formatCurrency(account.amount)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem', minWidth: '35px', textAlign: 'right' }}>
                      {account.percentage}%
                    </span>
                  </div>
                </div>
                <div className="kpi-progress-container" style={{ margin: 0, height: '6px' }}>
                  <div className="kpi-progress-bar" style={{
                    width: `${account.percentage}%`,
                    backgroundColor: account.color || 'var(--color-primary)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas Transações */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-mock" style={{ marginBottom: '1rem' }}>
            <div>
              <h3 className="card-title-mock">Últimas Transações</h3>
            </div>
            <span
              style={{ fontSize: '0.78rem', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => onNavigate?.('transactions')}
            >
              Ver todas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
            {recentList.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-color)',
                  transition: 'all var(--transition-fast)',
                  cursor: 'pointer'
                }}
                onClick={() => onNavigate?.('transactions')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: t.type === 'income' ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                    color: t.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)',
                    border: '1px solid',
                    borderColor: t.type === 'income' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}>
                    {t.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                      {t.description}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                        {t.date} • <span style={{ color: t.color }}>{t.categoryName}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
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
