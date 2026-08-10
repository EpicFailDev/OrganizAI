import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator,
  Package,
  ShoppingBag,
  BarChart3,
  TrendingDown,
  ShoppingCart,
  Plus,
  Loader2,
  X,
  Check,
  Database,
  Percent,
  Store
} from 'lucide-react';
import { api } from '../lib/apiClient';
import { parseNumber, formatCurrency } from '../utils';
import { PricingCalculator } from './PricingCalculator';
import { IngredientsBase } from './IngredientsBase';

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  categories?: { name: string; color?: string };
}

interface Product {
  id: string;
  name: string;
  recipe_id?: string | null;
  selling_price?: number | null;
  cost_price?: number | null;
  unit?: string | null;
  active?: boolean | null;
}

interface Sale {
  id: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price?: number | null;
  profit?: number | null;
  sale_date: string;
  sale_time?: string | null;
  customer_name?: string | null;
  notes?: string | null;
  products?: { name: string } | null;
}

interface VendasProps {
  familyId: string;
  userId: string;
  transactions: Transaction[];
  profileName?: string;
}

type TabType = 'calculator' | 'base' | 'products' | 'sales' | 'reports';

const formatShortDate = (value: string) => {
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return value;
  return `${m[3]}/${m[2]}`;
};

export const Vendas: React.FC<VendasProps> = ({
  familyId,
  userId,
  transactions: _transactions,
  profileName
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', selling_price: '', unit: 'un' });
  const [newSale, setNewSale] = useState({ product_id: '', quantity: '1', customer_name: '' });
  const [saving, setSaving] = useState(false);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!familyId) return;
    const { data, error } = await api.listProducts(familyId);

    if (!error && data) setProducts(data);
  }, [familyId]);

  // Fetch sales
  const fetchSales = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);

    // Paginado: o PostgREST corta em max_rows (default 1000)
    const PAGE_SIZE = 1000;
    let all: Sale[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await api.listSales({ family_id: familyId, from, limit: PAGE_SIZE });

      if (error) break;
      all = all.concat(data || []);
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    setSales(all);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, [fetchProducts, fetchSales]);

  // Create product
  const createProduct = useCallback(async () => {
    if (!newProduct.name) return;
    setSaving(true);

    const parsedPrice = parseNumber(newProduct.selling_price);

    const { error } = await api.createProduct({
      family_id: familyId,
      name: newProduct.name,
      selling_price: parsedPrice > 0 ? parsedPrice : null,
      unit: newProduct.unit
    });

    if (!error) {
      setShowProductModal(false);
      setNewProduct({ name: '', selling_price: '', unit: 'un' });
      fetchProducts();
    }
    setSaving(false);
  }, [newProduct, familyId, fetchProducts]);

  // Create sale
  const createSale = useCallback(async () => {
    if (!newSale.product_id || !newSale.quantity) return;
    setSaving(true);

    const product = products.find(p => p.id === newSale.product_id);
    const quantity = parseInt(newSale.quantity) || 1;
    const unitPrice = product?.selling_price || 0;
    const totalPrice = unitPrice * quantity;
    const costPrice = product?.cost_price || 0;
    const profit = totalPrice - (costPrice * quantity);

    const { error } = await api.createSale({
      family_id: familyId,
      product_id: newSale.product_id,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      cost_price: costPrice * quantity,
      profit,
      sale_date: new Date().toISOString().split('T')[0],
      sale_time: new Date().toTimeString().split(' ')[0],
      customer_name: newSale.customer_name || null,
      created_by: userId
    });

    if (!error) {
      setShowSaleModal(false);
      setNewSale({ product_id: '', quantity: '1', customer_name: '' });
      fetchSales();
    }
    setSaving(false);
  }, [newSale, products, familyId, userId, fetchSales]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    let totalSales = 0;
    let totalCosts = 0;
    let totalUnits = 0;

    sales.forEach(s => {
      totalSales += Number(s.total_price);
      totalCosts += Number(s.cost_price || 0);
      totalUnits += Number(s.quantity || 0);
    });

    const profit = totalSales - totalCosts;
    const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

    return { totalSales, totalCosts, profit, margin, totalUnits };
  }, [sales]);

  // Top products by revenue
  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string; revenue: number; count: number }> = {};

    sales.forEach(s => {
      const name = s.products?.name || 'Produto';
      if (!s.product_id) return;
      if (!productMap[s.product_id]) {
        productMap[s.product_id] = { name, revenue: 0, count: 0 };
      }
      productMap[s.product_id].revenue += Number(s.total_price);
      productMap[s.product_id].count += s.quantity;
    });

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  const hasSales = sales.length > 0;

  const tabs = [
    { id: 'calculator' as TabType, label: 'Calculadora', icon: Calculator },
    { id: 'base' as TabType, label: 'Base', icon: Database },
    { id: 'products' as TabType, label: 'Produtos', icon: Package },
    { id: 'sales' as TabType, label: 'Vendas', icon: ShoppingBag },
    { id: 'reports' as TabType, label: 'Relatórios', icon: BarChart3 },
  ];

  // ---- shared inline style helpers (iOS dark tokens) ----
  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden'
  };

  const sectionTitle: React.CSSProperties = {
    margin: 0,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '-0.01em'
  };

  const EmptyState: React.FC<{ icon: React.ReactNode; title: string; hint: string; action?: React.ReactNode }> = ({
    icon, title, hint, action
  }) => (
    <div style={{
      padding: '2.5rem 1.25rem',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.65rem'
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 'var(--radius-full)',
        background: 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)'
      }}>
        {icon}
      </div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{title}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: 260, lineHeight: 1.45 }}>{hint}</div>
      {action}
    </div>
  );

  const pillButton = (onClick: () => void, label: string): React.ReactElement => (
    <button
      onClick={onClick}
      style={{
        background: 'var(--color-primary)',
        color: '#00250d',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        padding: '0.5rem 0.9rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontFamily: 'var(--font-title)',
        fontWeight: 700,
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 10px var(--color-primary-glow)'
      }}
    >
      <Plus size={16} strokeWidth={2.6} />
      {label}
    </button>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* ---------- HERO: saudação + faturamento ---------- */}
      <div style={{
        ...card,
        background: 'linear-gradient(160deg, rgba(48,209,88,0.20) 0%, rgba(48,209,88,0.05) 55%, rgba(28,28,30,0.9) 100%)',
        border: '1px solid rgba(48,209,88,0.22)',
        padding: '1.1rem 1.15rem 1.2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              {profileName ? `Olá, ${profileName.split(' ')[0]}` : 'Meu negócio'}
            </p>
            <div style={{
              fontFamily: 'var(--font-title)',
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginTop: '0.2rem'
            }}>
              {formatCurrency(kpis.totalSales)}
            </div>
            <p style={{ margin: '0.15rem 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              {hasSales
                ? `Faturamento de ${sales.length} venda${sales.length > 1 ? 's' : ''} registrada${sales.length > 1 ? 's' : ''}`
                : 'Nenhuma venda registrada ainda'}
            </p>
          </div>
          <div style={{
            width: 46,
            height: 46,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(48,209,88,0.16)',
            border: '1px solid rgba(48,209,88,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Store size={22} color="var(--color-primary)" />
          </div>
        </div>

        {/* Lucro / Margem inline */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '0.9rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lucro
            </div>
            <div style={{
              fontFamily: 'var(--font-title)',
              fontWeight: 700,
              fontSize: '1.02rem',
              color: kpis.profit >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
            }}>
              {formatCurrency(kpis.profit)}
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Margem
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.02rem', color: 'var(--color-meta)' }}>
              {kpis.margin.toFixed(1)}%
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Unidades
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
              {kpis.totalUnits}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- KPIs secundários (2 colunas no mobile) ---------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.65rem'
      }}>
        {[
          { label: 'Custos', value: formatCurrency(kpis.totalCosts), icon: <TrendingDown size={15} />, color: 'var(--color-expense)', bg: 'var(--color-expense-bg)' },
          { label: 'Ticket médio', value: formatCurrency(hasSales ? kpis.totalSales / sales.length : 0), icon: <ShoppingCart size={15} />, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
          { label: 'Produtos', value: `${products.length}`, icon: <Package size={15} />, color: 'var(--color-secondary)', bg: 'rgba(10,132,255,0.12)' },
          { label: 'Retorno', value: kpis.totalCosts > 0 ? `${((kpis.profit / kpis.totalCosts) * 100).toFixed(0)}%` : '—', icon: <Percent size={15} />, color: 'var(--color-income)', bg: 'var(--color-income-bg)' },
        ].map((kpi, i) => (
          <div key={i} style={{ ...card, padding: '0.8rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{kpi.label}</span>
              <div style={{
                background: kpi.bg,
                width: 26,
                height: 26,
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: kpi.color,
                flexShrink: 0
              }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-title)',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Segmented tabs (scroll horizontal) ---------- */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          padding: '0.3rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 'var(--radius-full)',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '0 0 auto',
                padding: '0.55rem 0.9rem',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                background: active ? 'var(--color-primary)' : 'transparent',
                color: active ? '#00250d' : 'var(--text-secondary)',
                fontFamily: 'var(--font-title)',
                fontSize: '0.8rem',
                fontWeight: active ? 700 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)'
              }}
            >
              <tab.icon size={15} strokeWidth={active ? 2.5 : 2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ---------- Tab Content ---------- */}
      <div style={{ width: '100%' }}>
        {activeTab === 'calculator' && (
          <PricingCalculator familyId={familyId} userId={userId} />
        )}

        {activeTab === 'base' && (
          <IngredientsBase familyId={familyId} />
        )}

        {activeTab === 'products' && (
          <div style={card}>
            <div style={{
              padding: '0.9rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <h3 style={sectionTitle}>Produtos</h3>
              {products.length > 0 && pillButton(() => setShowProductModal(true), 'Novo')}
            </div>

            {products.length === 0 ? (
              <EmptyState
                icon={<Package size={28} />}
                title="Nenhum produto cadastrado"
                hint="Cadastre seus salgados e doces com preço de venda para registrar vendas rapidamente."
                action={pillButton(() => setShowProductModal(true), 'Cadastrar produto')}
              />
            ) : (
              <div>
                {products.map((product, idx) => {
                  const margin = product.selling_price && product.cost_price
                    ? ((product.selling_price - product.cost_price) / product.selling_price) * 100
                    : null;
                  return (
                    <div key={product.id} style={{
                      padding: '0.85rem 1rem',
                      borderTop: idx === 0 ? 'none' : '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          flexShrink: 0,
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(48,209,88,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Package size={17} color="var(--color-primary)" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontSize: '0.92rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            por {product.unit}
                            {product.cost_price ? ` • custo ${formatCurrency(product.cost_price)}` : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {product.selling_price != null && (
                          <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-title)' }}>
                            {formatCurrency(product.selling_price)}
                          </div>
                        )}
                        {margin !== null && (
                          <div style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: margin >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
                          }}>
                            {margin.toFixed(0)}% margem
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div style={card}>
            <div style={{
              padding: '0.9rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <h3 style={sectionTitle}>Registro de vendas</h3>
              {hasSales && pillButton(() => setShowSaleModal(true), 'Nova venda')}
            </div>

            {loading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} className="spinner" />
              </div>
            ) : !hasSales ? (
              <EmptyState
                icon={<ShoppingBag size={28} />}
                title="Nenhuma venda registrada"
                hint={products.length === 0
                  ? 'Cadastre um produto primeiro — depois registre suas vendas em 2 toques.'
                  : 'Registre sua primeira venda para acompanhar faturamento, lucro e margem.'}
                action={products.length === 0
                  ? pillButton(() => setActiveTab('products'), 'Ir para Produtos')
                  : pillButton(() => setShowSaleModal(true), 'Registrar venda')}
              />
            ) : (
              <div>
                {sales.map((sale, idx) => (
                  <div key={sale.id} style={{
                    padding: '0.85rem 1rem',
                    borderTop: idx === 0 ? 'none' : '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-income-bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: 'var(--color-income)',
                          lineHeight: 1.1
                        }}>
                          {formatShortDate(sale.sale_date)}
                        </span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          fontSize: '0.92rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {sale.products?.name || 'Produto'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {sale.quantity}x {formatCurrency(Number(sale.unit_price))}
                          {sale.customer_name && ` • ${sale.customer_name}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-title)' }}>
                        {formatCurrency(Number(sale.total_price))}
                      </div>
                      {sale.profit !== null && (
                        <div style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: Number(sale.profit) >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
                        }}>
                          {Number(sale.profit) >= 0 ? '+' : ''}{formatCurrency(Number(sale.profit))} lucro
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={card}>
            <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={sectionTitle}>Top produtos por receita</h3>
            </div>

            {topProducts.length === 0 ? (
              <EmptyState
                icon={<BarChart3 size={28} />}
                title="Sem dados para relatório"
                hint="Assim que você registrar vendas, o ranking de produtos aparece aqui."
              />
            ) : (
              <div style={{ padding: '1rem' }}>
                {topProducts.map((product, idx) => {
                  const maxRevenue = topProducts[0]?.revenue || 1;
                  const percentage = (product.revenue / maxRevenue) * 100;
                  return (
                    <div key={idx} style={{ marginBottom: idx === topProducts.length - 1 ? 0 : '1.1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem', gap: '0.6rem' }}>
                        <span style={{
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          <span style={{ color: 'var(--text-tertiary)', marginRight: '0.4rem' }}>{idx + 1}</span>
                          {product.name}
                        </span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'var(--font-title)', fontSize: '0.9rem', flexShrink: 0 }}>
                          {formatCurrency(product.revenue)}
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: 'rgba(255,255,255,0.07)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--color-primary), #64d2ff)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width var(--transition-normal)'
                        }} />
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                        {product.count} unidade{product.count > 1 ? 's' : ''} vendida{product.count > 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="ios-sheet-overlay open" onClick={() => setShowProductModal(false)}>
          <div className="ios-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-header">
              <span className="ios-sheet-title">Novo Produto</span>
              <button className="ios-sheet-close" onClick={() => setShowProductModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ios-sheet-body">
              <div className="ios-input-group" style={{ marginBottom: '1rem' }}>
                <label className="ios-input-label">Nome do Produto</label>
                <input
                  className="ios-input"
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Coxinha, Brigadeiro..."
                />
              </div>
              <div className="ios-input-group" style={{ marginBottom: '1rem' }}>
                <label className="ios-input-label">Preço de Venda (R$)</label>
                <input
                  className="ios-input"
                  type="number"
                  inputMode="decimal"
                  value={newProduct.selling_price}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, selling_price: e.target.value }))}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="ios-input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="ios-input-label">Unidade</label>
                <select
                  className="ios-select"
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                >
                  <option value="un">Unidade</option>
                  <option value="kg">Quilograma</option>
                  <option value="g">Grama</option>
                  <option value="dz">Dúzia</option>
                </select>
              </div>
              <button
                className="ios-btn ios-btn-primary"
                onClick={createProduct}
                disabled={!newProduct.name || saving}
              >
                {saving ? <Loader2 size={18} className="spinner" /> : <Check size={18} />}
                {saving ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="ios-sheet-overlay open" onClick={() => setShowSaleModal(false)}>
          <div className="ios-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-header">
              <span className="ios-sheet-title">Nova Venda</span>
              <button className="ios-sheet-close" onClick={() => setShowSaleModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ios-sheet-body">
              <div className="ios-input-group" style={{ marginBottom: '1rem' }}>
                <label className="ios-input-label">Produto</label>
                <select
                  className="ios-select"
                  value={newSale.product_id}
                  onChange={(e) => setNewSale(prev => ({ ...prev, product_id: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.selling_price ? `- ${formatCurrency(p.selling_price)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stepper de quantidade — mais rápido no mobile */}
              <div className="ios-input-group" style={{ marginBottom: '1rem' }}>
                <label className="ios-input-label">Quantidade</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewSale(prev => ({
                      ...prev,
                      quantity: String(Math.max(1, (parseInt(prev.quantity) || 1) - 1))
                    }))}
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-primary)',
                      fontSize: '1.3rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    −
                  </button>
                  <input
                    className="ios-input"
                    type="number"
                    inputMode="numeric"
                    style={{ textAlign: 'center', flex: 1 }}
                    value={newSale.quantity}
                    onChange={(e) => setNewSale(prev => ({ ...prev, quantity: e.target.value }))}
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => setNewSale(prev => ({
                      ...prev,
                      quantity: String((parseInt(prev.quantity) || 0) + 1)
                    }))}
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(48,209,88,0.3)',
                      background: 'var(--color-income-bg)',
                      color: 'var(--color-primary)',
                      fontSize: '1.3rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="ios-input-group" style={{ marginBottom: '1.25rem' }}>
                <label className="ios-input-label">Cliente (opcional)</label>
                <input
                  className="ios-input"
                  type="text"
                  value={newSale.customer_name}
                  onChange={(e) => setNewSale(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>

              {/* Preview */}
              {newSale.product_id && (() => {
                const p = products.find(x => x.id === newSale.product_id);
                const qty = parseInt(newSale.quantity) || 1;
                const total = (p?.selling_price || 0) * qty;
                const cost = (p?.cost_price || 0) * qty;
                const lucro = total - cost;
                return (
                  <div style={{
                    background: 'var(--color-income-bg)',
                    border: '1px solid rgba(48,209,88,0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Total da venda</span>
                      <span style={{
                        fontFamily: 'var(--font-title)',
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        color: 'var(--color-primary)'
                      }}>
                        {formatCurrency(total)}
                      </span>
                    </div>
                    {p?.cost_price ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Lucro estimado</span>
                        <span style={{ fontWeight: 600, color: lucro >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                          {formatCurrency(lucro)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })()}

              <button
                className="ios-btn ios-btn-primary"
                onClick={createSale}
                disabled={!newSale.product_id || !newSale.quantity || saving}
              >
                {saving ? <Loader2 size={18} className="spinner" /> : <Check size={18} />}
                {saving ? 'Registrando...' : 'Registrar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
