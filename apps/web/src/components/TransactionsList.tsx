import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { 
  Search, 
  Trash2, 
  Image as ImageIcon, 
  Filter,
  X,
  FileText,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatCurrency } from '../utils';
import { getSignedAttachmentUrl } from '../lib/storage';
import { TransactionDetailModal } from './TransactionDetailModal';
import { SwipeableRow } from './SwipeableRow';

interface Transaction {
  id: string;
  date: string;
  time?: string;
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

interface TransactionUpdate {
  date: string;
  time?: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  subcategory_id?: string | null;
}

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  onDeleteTransaction: (id: string) => Promise<void>;
  onUpdateTransaction: (id: string, updates: TransactionUpdate) => Promise<void>;
  presetType?: 'income' | 'expense' | 'all';
  presetSearch?: string;
  familyId: string;
  userId: string;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  categories,
  onDeleteTransaction,
  onUpdateTransaction,
  presetType = 'all',
  presetSearch = '',
  familyId,
  userId
}) => {
  const [searchInput, setSearchInput] = useState(presetSearch);
  const searchTerm = useDeferredValue(searchInput);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'all'>(presetType);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerReceiptItems, setViewerReceiptItems] = useState<{ transaction: Transaction; items: ReceiptItem[] } | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);

  const openViewer = async (value?: string) => {
    if (!value) return;
    setViewerLoading(true);
    setViewerImage(null);
    const url = await getSignedAttachmentUrl(value);
    setViewerImage(url);
    setViewerLoading(false);
  };

  useEffect(() => {
    setSearchInput(presetSearch);
    setSelectedType(presetType);
  }, [presetSearch, presetType]);

  const filteredTransactions = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return transactions.filter(t => {
      const matchSearch = !searchTerm || t.description.toLowerCase().includes(lowerSearch) ||
                          t.categories?.name?.toLowerCase().includes(lowerSearch) ||
                          t.subcategories?.name?.toLowerCase().includes(lowerSearch);
      const matchCategory = selectedCategory === '' || t.category_id === selectedCategory;
      const matchType = selectedType === 'all' || t.type === selectedType;
      let matchDate = true;
      const tDate = t.date ? t.date.split('T')[0] : '';
      if (startDate) matchDate = tDate >= startDate;
      if (matchDate && endDate) matchDate = tDate <= endDate;
      return matchSearch && matchCategory && matchType && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedCategory, selectedType, startDate, endDate]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      const amt = Number(t.amount);
      if (t.type === 'income') income += amt;
      else expense += amt;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      const dateKey = new Date(t.date).toLocaleDateString('pt-BR', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedCategory('');
    setSelectedType('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchInput || selectedCategory || selectedType !== 'all' || startDate || endDate;

  return (
    <>
      {/* Summary bar */}
      {filteredTransactions.length > 0 && (
        <div style={{
          display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem',
          background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-md)',
          border: '0.5px solid var(--border-color)',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Entradas</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#30d158' }}>
              {formatCurrency(totals.income)}
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--separator)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Saídas</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ff453a' }}>
              {formatCurrency(totals.expense)}
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--separator)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Saldo</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: totals.balance >= 0 ? '#30d158' : '#ff453a' }}>
              {formatCurrency(totals.balance)}
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="ios-search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar transações..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
          >
            <X size={16} />
          </button>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: hasActiveFilters ? 'var(--color-primary)' : 'none',
            border: 'none',
            color: hasActiveFilters ? '#000' : 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Filter size={16} />
        </button>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="ios-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.85rem' }}>
          {/* Type filter pills */}
          <div className="ios-segment">
            <button
              className={`ios-segment-btn ${selectedType === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedType('all')}
            >
              Todos
            </button>
            <button
              className={`ios-segment-btn ${selectedType === 'income' ? 'active' : ''}`}
              onClick={() => setSelectedType('income')}
            >
              Entradas
            </button>
            <button
              className={`ios-segment-btn ${selectedType === 'expense' ? 'active' : ''}`}
              onClick={() => setSelectedType('expense')}
            >
              Saídas
            </button>
          </div>

          {/* Category filter */}
          <select
            className="ios-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Date range */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="date" className="ios-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }} />
            <input type="date" className="ios-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }} />
          </div>

          {hasActiveFilters && (
            <button onClick={handleClearFilters} style={{
              background: 'none', border: 'none', color: '#ff453a', fontSize: '0.82rem',
              fontWeight: 600, cursor: 'pointer', textAlign: 'center', padding: '0.25rem',
            }}>
              Limpar Filtros
            </button>
          )}
        </div>
      )}

      {/* Transaction list */}
      {filteredTransactions.length === 0 ? (
        <div className="ios-empty">
          <div className="ios-empty-icon">
            <Search size={28} />
          </div>
          <h3 className="ios-empty-title">Nenhuma transação</h3>
          <p className="ios-empty-desc">
            Nenhum lançamento encontrado com os filtros selecionados.
          </p>
        </div>
      ) : (
        Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
          <div key={dateLabel}>
            <div className="ios-section-header">
              <span className="ios-section-title" style={{ textTransform: 'none' }}>{dateLabel}</span>
            </div>
            <div className="ios-grouped-list stagger">
              {txs.map((t) => (
                <SwipeableRow
                  key={t.id}
                  onEdit={() => setSelectedTransaction(t)}
                  onDelete={() => setConfirmDelete(t)}
                >
                <div
                  className="ios-list-item"
                  onClick={() => setSelectedTransaction(t)}
                >
                  <div className="ios-list-item-icon" style={{
                    background: t.type === 'income' ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                    color: t.type === 'income' ? '#30d158' : '#ff453a',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    {t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div className="ios-list-item-content" style={{ minWidth: 0 }}>
                    <div className="ios-list-item-title" style={{ fontSize: '0.95rem' }}>
                      {t.description}
                    </div>
                    <div className="ios-list-item-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{t.time || new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {t.categories?.name && (
                        <>
                          <span>·</span>
                          <span style={{ color: t.categories?.color || 'var(--text-secondary)' }}>{t.categories.name}</span>
                        </>
                      )}
                      {t.attachment_url && (
                        <ImageIcon size={11} color="#30d158" style={{ marginLeft: 2 }} />
                      )}
                      {t.receipt_items && t.receipt_items.length > 0 && (
                        <FileText size={11} color="#007aff" style={{ marginLeft: 2 }} />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                    <span style={{
                      fontFamily: 'var(--font-title)',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: t.type === 'income' ? '#30d158' : 'var(--text-primary)',
                    }}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                    </span>
                    {t.profiles?.display_name && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-quaternary)' }}>
                        {t.profiles.display_name.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>
                </SwipeableRow>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onDelete={onDeleteTransaction}
          onUpdate={onUpdateTransaction}
          categories={categories}
          familyId={familyId}
          userId={userId}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="ios-sheet-overlay open" onClick={() => setConfirmDelete(null)}>
          <div className="ios-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: 'auto' }}>
            <div className="ios-sheet-handle"><div className="ios-sheet-handle-bar" /></div>
            <div style={{ padding: '1.25rem 1.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(255, 69, 58, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Trash2 size={22} color="#ff453a" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
                Excluir transação?
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                "{confirmDelete.description}" — Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-xs)',
                    border: 'none', background: 'rgba(255,255,255,0.08)',
                    color: 'var(--text-primary)', fontFamily: 'var(--font-title)',
                    fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await onDeleteTransaction(confirmDelete.id);
                    setConfirmDelete(null);
                  }}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-xs)',
                    border: 'none', background: '#ff453a',
                    color: '#fff', fontFamily: 'var(--font-title)',
                    fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer',
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Items Detail Modal */}
      {viewerReceiptItems && (
        <div className="ios-sheet-overlay open" onClick={() => setViewerReceiptItems(null)}>
          <div className="ios-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-handle">
              <div className="ios-sheet-handle-bar" />
            </div>
            <div className="ios-sheet-header">
              <h3 className="ios-sheet-title">Itens da Nota</h3>
              <button className="ios-sheet-close" onClick={() => setViewerReceiptItems(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="ios-sheet-body">
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                {viewerReceiptItems.transaction.description} · {new Date(viewerReceiptItems.transaction.date).toLocaleDateString('pt-BR')}
              </p>
              <div className="ios-grouped-list">
                {viewerReceiptItems.items.map((item) => (
                  <div key={item.id} className="ios-list-item" style={{ cursor: 'default' }}>
                    <div className="ios-list-item-content">
                      <div className="ios-list-item-title" style={{ fontSize: '0.88rem' }}>{item.item_name}</div>
                      <div className="ios-list-item-subtitle">
                        {item.quantity}x {formatCurrency(Number(item.unit_price))}
                      </div>
                    </div>
                    <span className="ios-list-item-value" style={{ color: '#ff453a' }}>
                      {formatCurrency(Number(item.total_price))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {viewerImage && (
        <div className="ios-sheet-overlay open" onClick={() => setViewerImage(null)} style={{ alignItems: 'center' }}>
          <div className="ios-sheet" style={{ maxWidth: '90vw', maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-handle">
              <div className="ios-sheet-handle-bar" />
            </div>
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <img src={viewerImage} alt="Comprovante" style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)' }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
