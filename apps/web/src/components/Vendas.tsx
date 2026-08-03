import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator,
  Package,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Plus,
  Loader2,
  X,
  Check,
  Database
} from 'lucide-react';
import { supabase } from '../supabaseClient';
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
  recipe_id: string | null;
  selling_price: number | null;
  cost_price: number | null;
  unit: string;
  active: boolean;
}

interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number | null;
  profit: number | null;
  sale_date: string;
  sale_time: string | null;
  customer_name: string | null;
  notes: string | null;
  products?: { name: string };
}

interface VendasProps {
  familyId: string;
  userId: string;
  transactions: Transaction[];
  profileName?: string;
}

type TabType = 'calculator' | 'base' | 'products' | 'sales' | 'reports';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('family_id', familyId)
      .order('name');

    if (!error && data) setProducts(data);
  }, [familyId]);

  // Fetch sales
  const fetchSales = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('sales')
      .select('*, products(name)')
      .eq('family_id', familyId)
      .order('sale_date', { ascending: false })
      .limit(100);

    if (!error && data) setSales(data);
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

    const { error } = await supabase
      .from('products')
      .insert({
        family_id: familyId,
        name: newProduct.name,
        selling_price: parseFloat(newProduct.selling_price) || null,
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

    const { error } = await supabase
      .from('sales')
      .insert({
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

    return {
      totalSales,
      totalCosts,
      profit,
      margin,
      totalUnits
    };
  }, [sales]);

  // Top products by revenue
  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string; revenue: number; count: number }> = {};
    
    sales.forEach(s => {
      const name = s.products?.name || 'Produto';
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

  const tabs = [
    { id: 'calculator' as TabType, label: 'Calculadora', icon: Calculator },
    { id: 'base' as TabType, label: 'Base', icon: Database },
    { id: 'products' as TabType, label: 'Produtos', icon: Package },
    { id: 'sales' as TabType, label: 'Vendas', icon: ShoppingBag },
    { id: 'reports' as TabType, label: 'Relatórios', icon: BarChart3 },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(233, 30, 99, 0.25) 0%, rgba(244, 67, 54, 0.12) 100%)',
            border: '1px solid rgba(233, 30, 99, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calculator size={24} color="var(--color-primary)" />
          </div>
          <div>
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 800, 
              color: '#fff', 
              letterSpacing: '-0.02em' 
            }}>
              {profileName ? `Olá, ${profileName.split(' ')[0]}!` : 'Vendas'}
            </h1>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.82rem' 
            }}>
              Sua calculadora de gastos, vendas e lucro dos salgados
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem'
      }}>
        {[
          { label: 'Unidades Vendidas', value: `${kpis.totalUnits}`, icon: <ShoppingCart size={16} />, color: '#ff9800' },
          { label: 'Total Vendas', value: formatCurrency(kpis.totalSales), icon: <DollarSign size={16} />, color: '#4caf50' },
          { label: 'Custos', value: formatCurrency(kpis.totalCosts), icon: <TrendingDown size={16} />, color: '#f44336' },
          { label: 'Lucro', value: formatCurrency(kpis.profit), icon: <TrendingUp size={16} />, color: kpis.profit >= 0 ? '#4caf50' : '#f44336' },
          { label: 'Margem', value: `${kpis.margin.toFixed(1)}%`, icon: <BarChart3 size={16} />, color: '#2196f3' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{kpi.label}</span>
              <div style={{ backgroundColor: `${kpi.color}20`, padding: '0.3rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.cloneElement(kpi.icon, { color: kpi.color } as any)}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-xs)',
        padding: '4px',
        gap: '0'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === tab.id ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font-title)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ width: '100%' }}>
        {activeTab === 'calculator' && (
          <PricingCalculator familyId={familyId} userId={userId} />
        )}

        {activeTab === 'base' && (
          <IngredientsBase familyId={familyId} />
        )}

        {activeTab === 'products' && (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Produtos Cadastrados</h3>
              <button
                onClick={() => setShowProductModal(true)}
                style={{
                  background: 'var(--color-primary)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 'bold',
                  fontSize: '0.82rem'
                }}
              >
                <Plus size={16} />
                Novo Produto
              </button>
            </div>

            {products.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Nenhum produto cadastrado ainda</p>
              </div>
            ) : (
              <div>
                {products.map(product => (
                  <div key={product.id} style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{product.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{product.unit}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {product.selling_price && (
                        <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          {formatCurrency(product.selling_price)}
                        </div>
                      )}
                      {product.cost_price && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Custo: {formatCurrency(product.cost_price)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Registro de Vendas</h3>
              <button
                onClick={() => setShowSaleModal(true)}
                style={{
                  background: 'var(--color-primary)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 'bold',
                  fontSize: '0.82rem'
                }}
              >
                <Plus size={16} />
                Nova Venda
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Loader2 size={24} className="spinner" />
              </div>
            ) : sales.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <ShoppingBag size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Nenhuma venda registrada ainda</p>
              </div>
            ) : (
              <div>
                {sales.map(sale => (
                  <div key={sale.id} style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>
                        {sale.products?.name || 'Produto'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {sale.quantity}x {formatCurrency(Number(sale.unit_price))}
                        {sale.customer_name && ` • ${sale.customer_name}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        {formatCurrency(Number(sale.total_price))}
                      </div>
                      {sale.profit !== null && (
                        <div style={{ fontSize: '0.75rem', color: Number(sale.profit) >= 0 ? '#4caf50' : '#f44336' }}>
                          Lucro: {formatCurrency(Number(sale.profit))}
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
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Top Produtos por Receita</h3>
            </div>

            {topProducts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <BarChart3 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Dados insuficientes para relatórios</p>
              </div>
            ) : (
              <div style={{ padding: '1rem' }}>
                {topProducts.map((product, idx) => {
                  const maxRevenue = topProducts[0]?.revenue || 1;
                  const percentage = (product.revenue / maxRevenue) * 100;
                  return (
                    <div key={idx} style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{product.name}</span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          {formatCurrency(product.revenue)}
                        </span>
                      </div>
                      <div style={{ 
                        width: '100%', 
                        height: '8px', 
                        background: 'rgba(255,255,255,0.1)', 
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #e91e63, #f44336)',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {product.count} unidades vendidas
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
                  placeholder="Ex: Salgado, Doce..."
                />
              </div>
              <div className="ios-input-group" style={{ marginBottom: '1rem' }}>
                <label className="ios-input-label">Preço de Venda (R$)</label>
                <input
                  className="ios-input"
                  type="number"
                  value={newProduct.selling_price}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, selling_price: e.target.value }))}
                  placeholder="0.00"
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
              <div className="ios-input-group" style={{ marginBottom: '1rem' }}>
                <label className="ios-input-label">Quantidade</label>
                <input
                  className="ios-input"
                  type="number"
                  value={newSale.quantity}
                  onChange={(e) => setNewSale(prev => ({ ...prev, quantity: e.target.value }))}
                  min="1"
                />
              </div>
              <div className="ios-input-group" style={{ marginBottom: '1.5rem' }}>
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
              {newSale.product_id && (
                <div style={{
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total:</span>
                    <span style={{ fontWeight: 'bold', color: '#4caf50' }}>
                      {formatCurrency(
                        (products.find(p => p.id === newSale.product_id)?.selling_price || 0) * (parseInt(newSale.quantity) || 1)
                      )}
                    </span>
                  </div>
                </div>
              )}

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
