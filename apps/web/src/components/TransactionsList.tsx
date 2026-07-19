import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Image as ImageIcon, 
  Calendar,
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
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  categories,
  onDeleteTransaction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Image Viewer State
  const [viewerImage, setViewerImage] = useState<string | null>(null);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
          Lançamentos
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Visualize e filtre todas as transações cadastradas
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
          <Filter size={18} /> Filtros de Busca
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
          gap: '1rem'
        }} className="filters-grid">
          {/* Text Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.25rem' }}
              placeholder="Buscar por descrição, categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <select 
            className="form-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
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
            <Calendar size={16} style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="date"
              className="form-input"
              style={{ width: '100%', paddingRight: '2rem' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="date"
              className="form-input"
              style={{ width: '100%', paddingRight: '2rem' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {(searchTerm || selectedCategory || selectedType !== 'all' || startDate || endDate) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleClearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-expense)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <X size={14} /> Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet / Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Nenhuma transação encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Subcategoria</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th>Usuário</th>
                  <th style={{ textAlign: 'center' }}>Recibo</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ fontWeight: '600', color: '#fff' }}>
                      {t.description}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.85rem',
                        color: t.categories?.color || '#fff'
                      }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: t.categories?.color || '#9E9E9E'
                        }} />
                        {t.categories?.name}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {t.subcategories?.name || '-'}
                    </td>
                    <td>
                      <span className={`badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                        {t.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontWeight: '700',
                      color: t.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'
                    }}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {t.profiles?.display_name || 'Usuário'}
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
                            padding: '0.25rem',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-glow)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <ImageIcon size={18} />
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir o lançamento "${t.description}"?`)) {
                            onDeleteTransaction(t.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-expense)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-expense-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Spreadsheet totals summary */}
      {filteredTransactions.length > 0 && (
        <div className="glass-card" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 2rem',
          backgroundColor: 'rgba(15, 22, 36, 0.8)'
        }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Entradas:</span>
              <p style={{ color: 'var(--color-income)', fontWeight: '700', fontSize: '1.1rem' }}>
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Saídas:</span>
              <p style={{ color: 'var(--color-expense)', fontWeight: '700', fontSize: '1.1rem' }}>
                {formatCurrency(totals.expense)}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saldo dos Filtros:</span>
            <p style={{
              color: totals.balance >= 0 ? '#fff' : 'var(--color-expense)',
              fontWeight: '800',
              fontSize: '1.35rem',
              fontFamily: 'var(--font-title)'
            }}>
              {formatCurrency(totals.balance)}
            </p>
          </div>
        </div>
      )}

      {/* Image Viewer lightbox */}
      {viewerImage && (
        <div className="modal-overlay" onClick={() => setViewerImage(null)}>
          <div className="glass-card" style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center'
          }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close" 
              onClick={() => setViewerImage(null)}
              style={{ top: '0.5rem', right: '0.5rem' }}
            >
              <X size={20} />
            </button>
            <h4 style={{ alignSelf: 'flex-start', color: '#fff', fontSize: '1rem' }}>
              Comprovante / Recibo
            </h4>
            <img 
              src={viewerImage} 
              alt="Comprovante" 
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: 'var(--radius-sm)',
                objectFit: 'contain'
              }} 
            />
            <a 
              href={viewerImage} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <FileText size={16} /> Abrir em nova aba
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
