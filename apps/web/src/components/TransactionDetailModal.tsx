import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { X, Edit3, Trash2, Save, Loader2, Calendar, DollarSign, Tag, Clock, User, FileText, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../utils';

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

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
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

interface TransactionDetailModalProps {
  transaction: Transaction;
  categories: Category[];
  familyId: string;
  userId: string;
  onClose: () => void;
  onUpdate: (id: string, updates: TransactionUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  categories,
  familyId,
  userId,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [date, setDate] = useState(transaction.date);
  const [time, setTime] = useState(transaction.time || '');
  const [type, setType] = useState(transaction.type);
  const [description, setDescription] = useState(transaction.description);
  const [categoryId, setCategoryId] = useState(transaction.category_id);
  const [subcategoryId, setSubcategoryId] = useState(transaction.subcategory_id || '');
  const [amount, setAmount] = useState(transaction.amount.toString().replace('.', ','));
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId('');
      return;
    }
    const fetchSubcategories = async () => {
      const { data } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId);
      setSubcategories(data || []);
    };
    fetchSubcategories();
    setSubcategoryId('');
  }, [categoryId]);

  useEffect(() => {
    if (!isEditing && subcategories.length > 0 && transaction.subcategory_id) {
      setSubcategoryId(transaction.subcategory_id);
    }
  }, [isEditing]);

  const handleCancelEdit = () => {
    setDate(transaction.date);
    setTime(transaction.time || '');
    setType(transaction.type);
    setDescription(transaction.description);
    setCategoryId(transaction.category_id);
    setSubcategoryId(transaction.subcategory_id || '');
    setAmount(transaction.amount.toString().replace('.', ','));
    setErrorMsg('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!categoryId) { setErrorMsg('Selecione uma categoria.'); return; }
    const cleanAmount = Number(amount.replace(',', '.'));
    if (!amount || isNaN(cleanAmount) || cleanAmount <= 0) { setErrorMsg('Valor inválido.'); return; }
    if (!description.trim()) { setErrorMsg('Descrição obrigatória.'); return; }

    setLoading(true);
    setErrorMsg('');
    try {
      await onUpdate(transaction.id, {
        date,
        time: time || undefined,
        description: description.trim(),
        type,
        amount: cleanAmount,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
      });
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setLoading(true);
    try {
      await onDelete(transaction.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir.');
      setLoading(false);
    }
  };

  const isOwner = transaction.created_by === userId;

  const infoRow = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card" style={{
        position: 'relative',
        maxWidth: '560px',
        width: '100%',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        boxShadow: 'var(--shadow-lg), 0 0 60px rgba(0,0,0,0.6)',
        maxHeight: '90vh',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className={`badge ${type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                {type === 'income' ? 'Entrada' : 'Saída'}
              </span>
              {!isEditing && transaction.categories && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.78rem', fontWeight: 600,
                  color: transaction.categories.color || '#fff'
                }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: transaction.categories.color || '#9E9E9E',
                    boxShadow: `0 0 6px ${transaction.categories.color || '#9e9e9e'}`
                  }} />
                  {transaction.categories.name}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
              {isEditing ? 'Editar Lançamento' : transaction.description}
            </h3>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.6rem 1rem',
            color: 'var(--color-expense)',
            fontSize: '0.82rem',
            marginBottom: '1rem'
          }}>{errorMsg}</div>
        )}

        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {/* Type toggle */}
            <div style={{ display: 'flex', gap: '0.6rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <button type="button" onClick={() => setType('expense')} style={{
                flex: 1, padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: 'none',
                backgroundColor: type === 'expense' ? 'var(--color-expense-bg)' : 'transparent',
                color: type === 'expense' ? 'var(--color-expense)' : 'var(--text-secondary)',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                border: '1px solid', borderColor: type === 'expense' ? 'rgba(244,63,94,0.2)' : 'transparent'
              }}>Despesa</button>
              <button type="button" onClick={() => setType('income')} style={{
                flex: 1, padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: 'none',
                backgroundColor: type === 'income' ? 'var(--color-income-bg)' : 'transparent',
                color: type === 'income' ? 'var(--color-income)' : 'var(--text-secondary)',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                border: '1px solid', borderColor: type === 'income' ? 'rgba(16,185,129,0.2)' : 'transparent'
              }}>Receita</button>
            </div>

            {/* Date, Time, Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Data</label>
                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Horário</label>
                <input type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Valor (R$)</label>
                <input type="text" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Descrição</label>
              <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }} />
            </div>

            {/* Category & Subcategory */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Categoria</label>
                <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>
                  <option value="">Selecione...</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Subcategoria</label>
                <select className="form-select" value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} disabled={!categoryId || subcategories.length === 0} style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>
                  <option value="">Nenhuma</option>
                  {subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Edit actions */}
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button className="btn-secondary" onClick={handleCancelEdit} disabled={loading} style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}>
                <ArrowLeft size={14} /> Cancelar
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}>
                {loading ? <><Loader2 size={14} className="spinner" /> Salvando...</> : <><Save size={14} /> Salvar</>}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {/* Info rows */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', padding: '0.25rem 1rem', marginBottom: '1rem' }}>
              {infoRow('Valor', <span style={{ fontWeight: 800, fontSize: '1.05rem', color: transaction.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)' }}>
                {transaction.type === 'income' ? '+' : '-'} {formatCurrency(Number(transaction.amount))}
              </span>)}
              {infoRow('Data', new Date(transaction.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}
              {infoRow('Horário', transaction.time || <span style={{ color: 'var(--text-muted)' }}>—</span>)}
              {infoRow('Categoria', <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {transaction.categories?.color && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: transaction.categories.color, boxShadow: `0 0 6px ${transaction.categories.color}` }} />}
                {transaction.categories?.name || <span style={{ color: 'var(--text-muted)' }}>Sem categoria</span>}
              </span>)}
              {infoRow('Subcategoria', transaction.subcategories?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>)}
              {infoRow('Membro', <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.6rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                  {(transaction.profiles?.display_name || 'U').substring(0, 2).toUpperCase()}
                </span>
                {transaction.profiles?.display_name?.split(' ')[0] || 'Membro'}
              </span>)}
            </div>

            {/* Receipt items */}
            {transaction.receipt_items && transaction.receipt_items.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Itens da Nota ({transaction.receipt_items.length})
                </h4>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Item</th>
                        <th style={{ textAlign: 'center', padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Qtd</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Preço</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaction.receipt_items.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '0.4rem 0.75rem', color: '#fff', fontSize: '0.82rem', fontWeight: 500 }}>{item.item_name}</td>
                          <td style={{ padding: '0.4rem 0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.quantity}</td>
                          <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatCurrency(Number(item.unit_price))}</td>
                          <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', color: 'var(--color-expense)', fontWeight: 600, fontSize: '0.82rem' }}>{formatCurrency(Number(item.total_price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total</span>
                    <span style={{ fontSize: '0.95rem', color: 'var(--color-primary)', fontWeight: 800 }}>
                      {formatCurrency(transaction.receipt_items.reduce((sum, i) => sum + Number(i.total_price), 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Attachment */}
            {transaction.attachment_url && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Comprovante
                </h4>
                <img src={transaction.attachment_url} alt="Comprovante"
                  style={{ width: '100%', maxHeight: '200px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                  onClick={() => window.open(transaction.attachment_url, '_blank')} />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              {isOwner && (
                <button className="btn-secondary" onClick={() => setIsEditing(true)} style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}>
                  <Edit3 size={14} /> Editar
                </button>
              )}
              {isOwner && (
                <button onClick={handleDelete} disabled={loading} style={{
                  flex: 1, padding: '0.6rem', fontSize: '0.85rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  background: confirmDelete ? 'var(--color-expense-bg)' : 'rgba(255,255,255,0.03)',
                  color: confirmDelete ? 'var(--color-expense)' : 'var(--text-secondary)',
                  border: `1px solid ${confirmDelete ? 'rgba(244,63,94,0.2)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-sm)', fontWeight: 700
                }}>
                  {loading ? <><Loader2 size={14} className="spinner" /> Excluindo...</>
                    : confirmDelete ? 'Tem certeza?'
                    : <><Trash2 size={14} /> Excluir</>}
                </button>
              )}
              {confirmDelete && !loading && (
                <button className="btn-secondary" onClick={() => setConfirmDelete(false)} style={{ padding: '0.6rem', fontSize: '0.85rem' }}>
                  <X size={14} /> Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
