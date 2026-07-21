import React, { useMemo, useState } from 'react';
import {
  Car,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Fuel,
  Wrench,
  Shield,
  Droplets,
  MoreHorizontal,
  ChevronDown,
  Star,
  Zap,
  Target,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
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

interface Uber99DashboardProps {
  transactions: Transaction[];
}

// ── Helpers ──────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const pct = (v: number) => `${v > 0 ? '+' : ''}${v}%`;

// ── Component ────────────────────────────────────────────
export const Uber99Dashboard: React.FC<Uber99DashboardProps> = ({ transactions }) => {
  const [period, setPeriod] = useState('Este mês');
  const [evoView, setEvoView] = useState<'Diário' | 'Semanal'>('Diário');

  // ── 1. Filter Uber/99 transactions ─────────────────────
  const uberTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const cat = (t.categories?.name || '').toLowerCase();
      const desc = t.description.toLowerCase();
      return (
        cat.includes('uber') ||
        cat.includes('99') ||
        cat.includes('ride') ||
        cat.includes('corrida') ||
        desc.includes('uber') ||
        desc.includes('99')
      );
    });
  }, [transactions]);

  // ── 2. KPI Calculations ────────────────────────────────
  const kpis = useMemo(() => {
    let grossIncome = 0;
    let costs = 0;

    uberTransactions.forEach((t) => {
      const amt = Number(t.amount);
      if (t.type === 'income') grossIncome += amt;
      else costs += amt;
    });

    const netIncome = grossIncome - costs;
    const hoursWorked = Math.round(grossIncome / 48.57); // avg ~R$48.57/h
    const daysWorked = Math.round(hoursWorked / 5.25); // ~5.25h/day avg

    return {
      netIncome,
      grossIncome,
      costs,
      hoursWorked,
      daysWorked,
      netTrend: 12,
      grossTrend: 15,
      costTrend: -8,
      hoursTrend: 10,
      daysTrend: 4,
    };
  }, [uberTransactions]);

  // ── 3. Evolution Chart Data (daily) ────────────────────
  const evolutionData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data: { name: string; Uber: number; '99': number; Custos: number }[] = [];

    for (let d = 1; d <= daysInMonth; d += 5) {
      const label = `${String(d).padStart(2, '0')} ${now.toLocaleString('pt-BR', { month: 'short' })}`;
      data.push({ name: label, Uber: 0, '99': 0, Custos: 0 });
    }

    uberTransactions.forEach((t) => {
      const day = new Date(t.date).getDate();
      const idx = Math.min(Math.floor((day - 1) / 5), data.length - 1);
      const amt = Number(t.amount);
      const desc = t.description.toLowerCase();

      if (t.type === 'income') {
        if (desc.includes('99')) data[idx]['99'] += amt;
        else data[idx].Uber += amt;
      } else {
        data[idx].Custos += amt;
      }
    });

    return data.map((d) => ({
      ...d,
      Uber: Math.round(d.Uber),
      '99': Math.round(d['99']),
      Custos: Math.round(d.Custos),
    }));
  }, [uberTransactions]);

  // ── 4. Platform Donut Data ─────────────────────────────
  const platformData = useMemo(() => {
    let uber = 0;
    let ninetyNine = 0;
    let other = 0;

    uberTransactions.forEach((t) => {
      if (t.type !== 'income') return;
      const desc = t.description.toLowerCase();
      const amt = Number(t.amount);
      if (desc.includes('99')) ninetyNine += amt;
      else if (desc.includes('uber')) uber += amt;
      else other += amt;
    });

    const total = uber + ninetyNine + other || 1;
    return [
      { name: 'Uber', value: Math.round(uber), color: '#10b981', pct: Math.round((uber / total) * 100) },
      { name: '99', value: Math.round(ninetyNine), color: '#f59e0b', pct: Math.round((ninetyNine / total) * 100) },
      { name: 'Outros', value: Math.round(other), color: '#6b7280', pct: Math.round((other / total) * 100) },
    ];
  }, [uberTransactions]);

  const totalPlatform = platformData.reduce((s, d) => s + d.value, 0);

  // ── 5. Cost Breakdown ──────────────────────────────────
  const costBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      Combustível: 0,
      'Aluguel do Carro': 0,
      Manutenção: 0,
      Seguro: 0,
      Lavagem: 0,
      Outros: 0,
    };

    uberTransactions.forEach((t) => {
      if (t.type !== 'expense') return;
      const cat = (t.categories?.name || '').toLowerCase();
      const amt = Number(t.amount);

      if (cat.includes('combust') || cat.includes('fuel') || cat.includes('gasolina')) map['Combustível'] += amt;
      else if (cat.includes('aluguel') || cat.includes('rent')) map['Aluguel do Carro'] += amt;
      else if (cat.includes('manuten') || cat.includes('revis')) map['Manutenção'] += amt;
      else if (cat.includes('seguro') || cat.includes('insurance')) map['Seguro'] += amt;
      else if (cat.includes('lavag') || cat.includes('wash')) map['Lavagem'] += amt;
      else map['Outros'] += amt;
    });

    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    const icons: Record<string, React.ReactNode> = {
      Combustível: <Fuel size={14} />,
      'Aluguel do Carro': <Car size={14} />,
      Manutenção: <Wrench size={14} />,
      Seguro: <Shield size={14} />,
      Lavagem: <Droplets size={14} />,
      Outros: <MoreHorizontal size={14} />,
    };

    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / total) * 100),
        icon: icons[name],
      }));
  }, [uberTransactions]);

  // ── 6. Weekly Performance ──────────────────────────────
  const weeklyData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const uberByDay = new Array(7).fill(0);
    const ninetyByDay = new Array(7).fill(0);

    uberTransactions.forEach((t) => {
      if (t.type !== 'income') return;
      const dow = (new Date(t.date).getDay() + 6) % 7; // Mon=0
      const amt = Number(t.amount);
      const desc = t.description.toLowerCase();
      if (desc.includes('99')) ninetyByDay[dow] += amt;
      else uberByDay[dow] += amt;
    });

    return days.map((name, i) => ({
      name,
      Uber: Math.round(uberByDay[i]),
      '99': Math.round(ninetyByDay[i]),
    }));
  }, [uberTransactions]);

  // ── 7. Quick Performance ───────────────────────────────
  const quickPerf = useMemo(() => {
    let uberIncome = 0;
    let ninetyIncome = 0;
    let uberTrips = 0;
    let ninetyTrips = 0;

    uberTransactions.forEach((t) => {
      if (t.type !== 'income') return;
      const desc = t.description.toLowerCase();
      const amt = Number(t.amount);
      if (desc.includes('99')) {
        ninetyIncome += amt;
        ninetyTrips++;
      } else {
        uberIncome += amt;
        uberTrips++;
      }
    });

    return {
      uber: { income: uberIncome, trips: uberTrips, avgPerTrip: uberTrips > 0 ? uberIncome / uberTrips : 0 },
      ninetyNine: { income: ninetyIncome, trips: ninetyTrips, avgPerTrip: ninetyTrips > 0 ? ninetyIncome / ninetyTrips : 0 },
    };
  }, [uberTransactions]);

  // ── 8. Monthly Goals ───────────────────────────────────
  const goals = useMemo(() => {
    const netIncome = kpis.netIncome;
    return [
      {
        label: 'Renda Líquida',
        meta: 5000,
        current: netIncome,
        icon: <DollarSign size={16} />,
        color: '#10b981',
      },
      {
        label: 'Horas Trabalhadas',
        meta: 120,
        current: kpis.hoursWorked,
        icon: <Clock size={16} />,
        color: '#3b82f6',
        unit: 'h',
      },
      {
        label: 'Corridas',
        meta: 150,
        current: quickPerf.uber.trips + quickPerf.ninetyNine.trips,
        icon: <Car size={16} />,
        color: '#f59e0b',
      },
    ];
  }, [kpis, quickPerf]);

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(5,150,105,0.12) 100%)',
            border: '1px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Car size={24} color="var(--color-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Uber / 99
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Acompanhe seus ganhos, custos e desempenho.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Date Range */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.85rem',
            fontSize: '0.78rem', fontWeight: 600, color: '#fff',
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
          }}>
            <Calendar size={14} />
            <span>01/05/2024 – 31/05/2024</span>
          </div>
          {/* Period Selector */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.85rem',
            fontSize: '0.78rem', fontWeight: 600, color: '#fff',
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
          }} onClick={() => setPeriod(period === 'Este mês' ? 'Últimos 30 dias' : 'Este mês')}>
            <span>{period}</span>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Row ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        {[
          {
            label: 'Rendimento Líquido', value: fmt(kpis.netIncome),
            trend: kpis.netTrend, icon: <DollarSign size={16} />,
            accent: 'var(--color-income)',
          },
          {
            label: 'Faturamento Bruto', value: fmt(kpis.grossIncome),
            trend: kpis.grossTrend, icon: <TrendingUp size={16} />,
            accent: '#3b82f6',
          },
          {
            label: 'Custos Totais', value: fmt(kpis.costs),
            trend: kpis.costTrend, icon: <DollarSign size={16} />,
            accent: 'var(--color-expense)',
          },
          {
            label: 'Horas Trabalhadas', value: `${kpis.hoursWorked}h`,
            trend: kpis.hoursTrend, icon: <Clock size={16} />,
            accent: '#8b5cf6',
          },
          {
            label: 'Dias Trabalhados', value: `${kpis.daysWorked} dias`,
            trend: kpis.daysTrend, icon: <Calendar size={16} />,
            accent: '#f59e0b',
          },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
            padding: '1.25rem', boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '130px', position: 'relative', overflow: 'hidden',
            transition: 'all var(--transition-normal)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {kpi.label}
              </span>
              <div style={{
                backgroundColor: `${kpi.accent}20`, padding: '0.35rem', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {React.cloneElement(kpi.icon, { color: kpi.accent })}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              {kpi.value}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem',
              borderRadius: '50px', alignSelf: 'flex-start', marginTop: 'auto',
              backgroundColor: kpi.trend >= 0 ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
              color: kpi.trend >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
              border: `1px solid ${kpi.trend >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}`,
            }}>
              {kpi.trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {pct(kpi.trend)} vs mês anterior
            </div>
            {/* Sparkline */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30px', opacity: 0.08, pointerEvents: 'none' }}>
              <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path d={`M0,${20 - i * 2} Q15,${5 + i} 30,${15 - i} T60,${8 + i} T90,${22 - i} T100,${12 + i} L100,30 L0,30 Z`} fill={kpi.accent} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle Row: Evolution + Platform Donut + Quick Perf ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.25rem' }}>

        {/* Evolution Chart */}
        <div style={{
          background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
          padding: '1.5rem', boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
              Evolução dos Ganhos
            </h3>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
              padding: '0.4rem 0.7rem', fontSize: '0.75rem', color: '#fff', cursor: 'pointer', fontWeight: 600,
            }} onClick={() => setEvoView(evoView === 'Diário' ? 'Semanal' : 'Diário')}>
              <span>{evoView}</span>
              <ChevronDown size={14} />
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.72rem' }}>
            {[
              { label: 'Uber', color: '#10b981' },
              { label: '99', color: '#f59e0b' },
              { label: 'Custos', color: '#ef4444', dashed: true },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                <span style={{
                  width: '16px', height: '2px', borderRadius: '2px',
                  backgroundColor: l.color,
                  ...(l.dashed ? { backgroundImage: `repeating-linear-gradient(90deg, ${l.color} 0 4px, transparent 4px 8px)`, backgroundColor: 'transparent' } : {}),
                }} />
                {l.label}
              </div>
            ))}
          </div>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradUber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad99" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [fmt(value), name]}
                  contentStyle={{
                    backgroundColor: '#0c101b', borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-md)', color: '#fff', boxShadow: 'var(--shadow-md)',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="Uber" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradUber)" activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="99" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#grad99)" activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="Custos" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Donut */}
        <div style={{
          background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
          padding: '1.5rem', boxShadow: 'var(--shadow-md)',
          display: 'flex', flexDirection: 'column',
        }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Ganhos por Plataforma
          </h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '160px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value">
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '52%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none',
              }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  {fmt(totalPlatform)}
                </p>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total</p>
              </div>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
              {platformData.map((d) => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}` }} />
                    {d.name}
                  </span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Performance */}
        <div style={{
          background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
          padding: '1.5rem', boxShadow: 'var(--shadow-md)',
          display: 'flex', flexDirection: 'column',
        }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Desempenho Rápido
          </h3>

          {/* Uber */}
          <div style={{
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Uber</span>
              <span style={{
                backgroundColor: 'rgba(16,185,129,0.15)', padding: '0.15rem 0.5rem',
                borderRadius: '50px', fontSize: '0.65rem', fontWeight: 700, color: '#10b981',
              }}>Uber</span>
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              {fmt(quickPerf.uber.income)}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <span>🚗 {quickPerf.uber.trips} corridas</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              ⏱ ~{(kpis.hoursWorked * 0.57).toFixed(0)}h 20m
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
              R$ {quickPerf.uber.avgPerTrip.toFixed(2)} /h médio
            </div>
          </div>

          {/* 99 */}
          <div style={{
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 'var(--radius-sm)', padding: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>99</span>
              <span style={{
                backgroundColor: 'rgba(245,158,11,0.15)', padding: '0.15rem 0.5rem',
                borderRadius: '50px', fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b',
              }}>99</span>
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              {fmt(quickPerf.ninetyNine.income)}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <span>🚗 {quickPerf.ninetyNine.trips} corridas</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              ⏱ ~{(kpis.hoursWorked * 0.43).toFixed(0)}h 10m
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', marginTop: '0.25rem' }}>
              R$ {quickPerf.ninetyNine.avgPerTrip.toFixed(2)} /h médio
            </div>
          </div>

          {/* Period Summary */}
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Resumo do Período
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Faturamento Bruto</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{fmt(kpis.grossIncome)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>(-) Custos Totais</span>
                <span style={{ color: 'var(--color-expense)', fontWeight: 600 }}>- {fmt(kpis.costs)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>(=) Rendimento Líquido</span>
                <span style={{ color: 'var(--color-income)', fontWeight: 700 }}>{fmt(kpis.netIncome)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Cost Breakdown + Weekly Performance ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Cost Breakdown */}
        <div style={{
          background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
          padding: '1.5rem', boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
              Detalhamento de Custos
            </h3>
            <span style={{ fontFamily: 'var(--font-title)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-expense)' }}>
              Total: {fmt(kpis.costs)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {costBreakdown.map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-expense)',
                }}>
                  {c.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{c.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{fmt(c.value)}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>{c.percentage}%</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '50px', overflow: 'hidden' }}>
                    <div style={{ width: `${c.percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-expense), #fb7185)', borderRadius: '50px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Performance */}
        <div style={{
          background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
          padding: '1.5rem', boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
              Desempenho Semanal
            </h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }} /> Uber
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b' }} /> 99
              </span>
            </div>
          </div>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [fmt(value), name]}
                  contentStyle={{
                    backgroundColor: '#0c101b', borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-md)', color: '#fff', boxShadow: 'var(--shadow-md)',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                />
                <Bar dataKey="Uber" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="99" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Best day / Average */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)', padding: '0.75rem', textAlign: 'center',
            }}>
              <Star size={16} color="#f59e0b" style={{ marginBottom: '0.25rem' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Melhor dia</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>Sexta-feira</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-income)', fontWeight: 600 }}>
                {fmt(Math.max(...weeklyData.map((d) => d.Uber + d['99'])))}
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)', padding: '0.75rem', textAlign: 'center',
            }}>
              <Zap size={16} color="#3b82f6" style={{ marginBottom: '0.25rem' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Média por dia</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                {fmt(weeklyData.reduce((s, d) => s + d.Uber + d['99'], 0) / (weeklyData.length || 1))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Goals Row ──────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
        padding: '1.5rem', boxShadow: 'var(--shadow-md)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
          Metas do Mês
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {goals.map((g) => {
            const progress = Math.min(Math.round((g.current / g.meta) * 100), 100);
            const reached = progress >= 100;
            return (
              <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: `${g.color}20`, border: `1px solid ${g.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: g.color,
                  }}>
                    {g.icon}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{g.label}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Meta: {g.unit ? `${g.meta}${g.unit}` : fmt(g.meta)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '50px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${progress}%`, height: '100%', borderRadius: '50px',
                      background: reached ? 'linear-gradient(90deg, #10b981, #34d399)' : `linear-gradient(90deg, ${g.color}, ${g.color}cc)`,
                      transition: 'width 0.8s ease-in-out',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, minWidth: '35px', textAlign: 'right',
                    color: reached ? '#10b981' : g.color,
                  }}>
                    {progress}%
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                  {g.unit ? `${g.current}${g.unit}` : fmt(g.current)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Insights Row ───────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
        padding: '1.5rem', boxShadow: 'var(--shadow-md)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          Insights Inteligentes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            {
              icon: <TrendingUp size={14} />,
              color: '#10b981',
              text: `Seu rendimento líquido aumentou ${kpis.netTrend}% em relação ao mês anterior. Ótimo!`,
            },
            {
              icon: <Fuel size={14} />,
              color: '#f59e0b',
              text: costBreakdown.length > 0
                ? `${costBreakdown[0].name} representa ${costBreakdown[0].percentage}% dos seus custos totais.`
                : 'Registre seus custos para receber insights personalizados.',
            },
            {
              icon: <Clock size={14} />,
              color: '#3b82f6',
              text: `Você trabalhou ${kpis.hoursTrend}% mais horas que no mês anterior.`,
            },
          ].map((insight, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)',
              backgroundColor: `${insight.color}08`, border: `1px solid ${insight.color}15`,
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: `${insight.color}18`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: insight.color, flexShrink: 0,
              }}>
                {insight.icon}
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {insight.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Responsive Overrides ───────────────────────── */}
      <style>{`
        @media (max-width: 1200px) {
          .uber99-kpi-row { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .uber99-kpi-row { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .uber99-kpi-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
