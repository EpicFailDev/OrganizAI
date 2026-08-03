import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { X, Upload, Loader2, DollarSign, Calendar, Tag, ClipboardList } from 'lucide-react';

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

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  familyId: string;
  userId: string;
  onSuccess: () => Promise<void>;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  categories,
  familyId,
  userId,
  onSuccess
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  useEffect(() => {
    setCategoryId('');
    setSubcategoryId('');
  }, [type]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId('');
      return;
    }
    const fetchSubcategories = async () => {
      try {
        const { data, error } = await supabase
          .from('subcategories')
          .select('*')
          .eq('category_id', categoryId);
        if (error) throw error;
        setSubcategories(data || []);
      } catch (err: any) {
        console.error('Erro ao buscar subcategorias:', err.message);
      }
    };
    fetchSubcategories();
    setSubcategoryId('');
  }, [categoryId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ser menor que 5MB.');
        return;
      }
      setAttachment(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) {
      setErrorMsg('Você precisa fazer parte de um grupo familiar para lançar.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Selecione uma categoria para prosseguir.');
      return;
    }
    if (!amount || isNaN(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0) {
      setErrorMsg('Insira um valor maior que zero.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let attachmentUrl = '';
      if (attachment) {
        setUploading(true);
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${familyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, attachment, { upsert: true });
        if (uploadError) throw uploadError;
        attachmentUrl = filePath;
        setUploading(false);
      }

      const cleanAmount = Number(amount.replace(',', '.'));
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          family_id: familyId,
          date,
          description,
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          type,
          amount: cleanAmount,
          created_by: userId,
          attachment_url: attachmentUrl || null
        });

      if (insertError) throw insertError;

      setDescription('');
      setCategoryId('');
      setSubcategoryId('');
      setAmount('');
      setAttachment(null);
      
      await onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar o lançamento.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`ios-sheet-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div 
        className="ios-sheet" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '88vh' }}
      >
        {/* Handle */}
        <div className="ios-sheet-handle">
          <div className="ios-sheet-handle-bar" />
        </div>

        {/* Header */}
        <div className="ios-sheet-header">
          <h3 className="ios-sheet-title">Novo Lançamento</h3>
          <button className="ios-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="ios-sheet-body">
          {errorMsg && (
            <div style={{
              backgroundColor: 'rgba(255, 69, 58, 0.12)',
              borderRadius: 'var(--radius-xs)',
              padding: '0.65rem 0.85rem',
              color: '#ff453a',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              lineHeight: 1.4,
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Type Segmented Control */}
            <div className="ios-segment">
              <button
                type="button"
                className={`ios-segment-btn ${type === 'expense' ? 'active' : ''}`}
                onClick={() => setType('expense')}
                style={type === 'expense' ? { color: '#ff453a' } : {}}
              >
                Saída
              </button>
              <button
                type="button"
                className={`ios-segment-btn ${type === 'income' ? 'active' : ''}`}
                onClick={() => setType('income')}
                style={type === 'income' ? { color: '#30d158' } : {}}
              >
                Entrada
              </button>
            </div>

            {/* Amount */}
            <div className="ios-input-group">
              <label className="ios-input-label">Valor</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  position: 'absolute', left: '0.85rem',
                  fontSize: '1.1rem', fontWeight: 700,
                  color: 'var(--text-tertiary)',
                }}>R$</span>
                <input
                  type="text"
                  className="ios-input"
                  style={{ paddingLeft: '2.3rem', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="ios-input-group">
              <label className="ios-input-label">Descrição</label>
              <input
                type="text"
                className="ios-input"
                placeholder="Ex: Combustível, Mercado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Date */}
            <div className="ios-input-group">
              <label className="ios-input-label">Data</label>
              <input
                type="date"
                className="ios-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div className="ios-input-group">
              <label className="ios-input-label">Categoria</label>
              <select
                className="ios-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            {subcategories.length > 0 && (
              <div className="ios-input-group">
                <label className="ios-input-label">Subcategoria</label>
                <select
                  className="ios-select"
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* File upload */}
            <div className="ios-input-group">
              <label className="ios-input-label">Comprovante (opcional)</label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem', background: 'rgba(118, 118, 128, 0.12)',
                borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}>
                <Upload size={18} color="var(--color-primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', color: attachment ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {attachment ? attachment.name : 'Selecionar arquivo'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-quaternary)' }}>
                    PNG, JPG ou PDF (máx. 5MB)
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Submit */}
            <button type="submit" className="ios-btn ios-btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? (
                <>
                  <Loader2 size={18} className="ios-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  {uploading ? 'Enviando...' : 'Salvando...'}
                </>
              ) : 'Confirmar Lançamento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
