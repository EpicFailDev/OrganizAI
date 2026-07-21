import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Image as ImageIcon, 
  Filter,
  X,
  FileText
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  subcategory_id?: string;
  created_by: string;
  attachment_url?: string;
  categories?: { name: string; color?: string };
  subcategories?: { name: string };
  profiles?: { display_name: string };
  receipt_items?: ReceiptItem[];
}

interface ReceiptItem {
  id: string;
  transaction_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_number?: number;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  onDeleteTransaction: (id: string) => Promise<void>;
  presetType?: 'income' | 'expense' | 'all';
  presetSearch?: string;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  categories,
  onDeleteTransaction,
  presetType = 'all',
  presetSearch = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(presetSearch);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'all'>(presetType);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Image Viewer State
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  // Receipt Items Viewer State
  const [viewerReceiptItems, setViewerReceiptItems] = useState<{ transaction: Transaction; items: ReceiptItem[] } | null>(null);

  // Synchronize state when presets change from Sidebar click
  useEffect(() => {
    setSearchTerm(presetSearch);
    setSelectedType(presetType);
  }, [presetSearch, presetType]);

  // Filter logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.subcategories?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = selectedCategory === '' || t.category_id === selectedCategory;
      const matchType = selectedType === 'all' || t.type === selectedType;
      
      let matchDate = true;
      if (startDate) {
        matchDate = matchDate && new Date(t.date) >= new Date(startDate);
      }
      if (endDate) {
        matchDate = matchDate && new Date(t.date) <= new Date(endDate);
      }

      return matchSearch && matchCategory && matchType && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedCategory, selectedType, startDate, endDate]);

  // Total balance for filtered items
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      const amt = Number(t.amount);
      if (t.type === 'income') income += amt;
      else expense += amt;
    });
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>
          Extrato & Lançamentos
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Visualize, filtre, audite e gerencie todas as receitas e despesas registradas
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.95rem', fontWeight: '700' }}>
          <Filter size={18} color="var(--color-primary)" />
          Filtragem Avançada
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
          gap: '1rem'
        }} className="filters-grid">
          {/* Text Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.3rem' }}
              placeholder="Pesquisar por texto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <select 
            className="form-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'income' | 'expense' | 'all')}
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Entradas (Receitas)</option>
            <option value="expense">Saídas (Despesas)</option>
          </select>

          {/* Category Filter */}
          <select 
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type === 'income' ? 'Entrada' : 'Saída'})
              </option>
            ))}
          </select>

          {/* Start Date */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '0.85rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>De</span>
            <input
              type="date"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.2rem' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '0.85rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Até</span>
            <input
              type="date"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.2rem' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {(searchTerm || selectedCategory || selectedType !== 'all' || startDate || endDate) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button 
              onClick={handleClearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-expense)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: '700'
              }}
            >
              <X size={14} /> Limpar Filtros Aplicados
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet / Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Nenhuma transação localizada com os parâmetros selecionados.
          </div>
        ) : (
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Subcategoria</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th>Membro</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Recibo</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Itens</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ fontWeight: '700', color: '#ffffff' }}>
                      {t.description}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: t.categories?.color || '#ffffff'
                      }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: t.categories?.color || '#9E9E9E',
                          boxShadow: `0 0 8px ${t.categories?.color || '#9e9e9e'}`
                        }} />
                        {t.categories?.name}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {t.subcategories?.name || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td>
                      <span className={`badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                        {t.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontWeight: '800',
                      fontSize: '0.95rem',
                      color: t.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'
                    }}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-color)'
                        }}>
                          {(t.profiles?.display_name || 'U').substring(0, 2).toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {t.profiles?.display_name ? t.profiles.display_name.split(' ')[0] : 'Membro'}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {t.attachment_url ? (
                        <button
                          onClick={() => setViewerImage(t.attachment_url || null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            padding: '0.35rem',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(16, 185, 129, 0.04)',
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-glow)'; e.currentTarget.style.color = 'var(--color-primary-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.04)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                        >
                          <ImageIcon size={16} />
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {t.receipt_items && t.receipt_items.length > 0 ? (
                        <button
                          onClick={() => setViewerReceiptItems({ transaction: t, items: t.receipt_items || [] })}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-glow)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.08)'; }}
                        >
                          <FileText size={14} />
                          {t.receipt_items.length}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir permanentemente o lançamento "${t.description}"?`)) {
                            onDeleteTransaction(t.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-expense)',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(244, 63, 94, 0.04)',
                          transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-expense-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.04)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Spreadsheet totals summary card */}
      {filteredTransactions.length > 0 && (
        <div className="glass-card" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 2.5rem',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.6) 0%, rgba(10, 15, 30, 0.8) 100%)',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Entradas Filtradas</span>
              <p style={{ color: 'var(--color-income)', fontWeight: '800', fontSize: '1.25rem', marginTop: '0.15rem' }}>
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Saídas Filtradas</span>
              <p style={{ color: 'var(--color-expense)', fontWeight: '800', fontSize: '1.25rem', marginTop: '0.15rem' }}>
                {formatCurrency(totals.expense)}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Saldo do Período</span>
            <p style={{
              color: totals.balance >= 0 ? 'var(--color-primary)' : 'var(--color-expense)',
              fontWeight: '900',
              fontSize: '1.5rem',
              fontFamily: 'var(--font-title)',
              marginTop: '0.15rem',
              textShadow: totals.balance >= 0 ? '0 0 10px rgba(16,185,129,0.2)' : 'none'
            }}>
              {formatCurrency(totals.balance)}
            </p>
          </div>
        </div>
      )}

      {/* Receipt Items Detail Modal */}
      {viewerReceiptItems && (
        <div className="modal-overlay" onClick={() => setViewerReceiptItems(null)}>
          <div className="glass-card" style={{
            position: 'relative',
            maxWidth: '520px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: 'var(--shadow-lg), 0 0 60px rgba(0,0,0,0.6)'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Itens da Nota Fiscal
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                  {viewerReceiptItems.transaction.description} &middot; {new Date(viewerReceiptItems.transaction.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setViewerReceiptItems(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Preço Unit.</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewerReceiptItems.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.6rem 0', color: '#fff', fontSize: '0.88rem', fontWeight: 500 }}>
                        {item.item_name}
                      </td>
                      <td style={{ padding: '0.6rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '0.6rem 0', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {formatCurrency(Number(item.unit_price))}
                      </td>
                      <td style={{ padding: '0.6rem 0', textAlign: 'right', color: 'var(--color-expense)', fontWeight: 700, fontSize: '0.88rem' }}>
                        {formatCurrency(Number(item.total_price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderTop: '1px solid var(--border-color)', 
              paddingTop: '0.75rem',
              marginTop: '0.25rem'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Total ({viewerReceiptItems.items.length} {viewerReceiptItems.items.length === 1 ? 'item' : 'itens'})
              </span>
              <span style={{ fontSize: '1.15rem', color: 'var(--color-primary)', fontWeight: 800 }}>
                {formatCurrency(viewerReceiptItems.items.reduce((sum, i) => sum + Number(i.total_price), 0))}
              </span>
            </div>

            <button 
              className="btn-secondary" 
              style={{ width: '100%', padding: '0.65rem' }}
              onClick={() => setViewerReceiptItems(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Image Viewer Lightbox */}
      {viewerImage && (
        <div className="modal-overlay" onClick={() => setViewerImage(null)}>
          <div className="glass-card" style={{
            position: 'relative',
            maxWidth: '560px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            alignItems: 'center',
            boxShadow: 'var(--shadow-lg), 0 0 60px rgba(0,0,0,0.6)'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                Comprovante Anexado
              </h4>
              <button 
                className="modal-close" 
                onClick={() => setViewerImage(null)}
              >
                <X size={16} />
              </button>
            </div>

            <img 
              src={viewerImage} 
              alt="Comprovante Financeiro" 
              style={{
                width: '100%',
                maxHeight: '60vh',
                borderRadius: 'var(--radius-md)',
                objectFit: 'contain',
                backgroundColor: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)'
              }} 
            />

            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <a 
                href={viewerImage} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-primary"
                style={{ flex: 1, textDecoration: 'none', padding: '0.65rem' }}
              >
                <FileText size={16} /> Abrir Link Direto
              </a>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '0.65rem' }}
                onClick={() => setViewerImage(null)}
              >
                Fechar Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Table Styles */}
      <style>{`
        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
