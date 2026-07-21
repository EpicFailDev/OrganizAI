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

  // Filtered categories based on selected transaction type
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  // Reset category when type changes
  useEffect(() => {
    setCategoryId('');
    setSubcategoryId('');
  }, [type]);

  // Fetch subcategories when category changes
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
      // Limit file size to 5MB
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

      // Upload receipt/comprovante if file selected
      if (attachment) {
        setUploading(true);
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${familyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, attachment, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        setUploading(false);
      }

      const cleanAmount = Number(amount.replace(',', '.'));

      // Insert transaction into database
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

      // Reset Form
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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-card modal-content" 
        style={{ maxWidth: '540px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', color: '#fff', fontWeight: '800', letterSpacing: '-0.02em' }}>
              Novo Lançamento Familiar
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.15rem' }}>Preencha os dados da transação para o rateio do casal</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: 'var(--color-expense)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            lineHeight: '1.4'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Toggle Type (Income / Expense) */}
          <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setType('expense')}
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: type === 'expense' ? 'var(--color-expense-bg)' : 'transparent',
                color: type === 'expense' ? 'var(--color-expense)' : 'var(--text-secondary)',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'var(--font-title)',
                fontSize: '0.88rem',
                transition: 'all var(--transition-fast)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: type === 'expense' ? 'rgba(244, 63, 94, 0.2)' : 'transparent'
              }}
            >
              Despesa (Saída)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: type === 'income' ? 'var(--color-income-bg)' : 'transparent',
                color: type === 'income' ? 'var(--color-income)' : 'var(--text-secondary)',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'var(--font-title)',
                fontSize: '0.88rem',
                transition: 'all var(--transition-fast)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: type === 'income' ? 'rgba(16, 185, 129, 0.2)' : 'transparent'
              }}
            >
              Receita (Entrada)
            </button>
          </div>

          {/* Date and Amount inputs */}
          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Date */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} color="var(--color-primary)" /> Data
              </label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <DollarSign size={14} color="var(--color-primary)" /> Valor
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '0.9rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>R$</span>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.3rem' }}
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ClipboardList size={14} color="var(--color-primary)" /> Descrição do Lançamento
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Combustível, Delivery Jantar, Venda Doces..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Category & Subcategory selection */}
          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Category */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Tag size={14} color="var(--color-primary)" /> Categoria
              </label>
              <select
                className="form-select"
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
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Tag size={14} color="var(--color-primary)" /> Subcategoria (Opcional)
              </label>
              <select
                className="form-select"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={!categoryId || subcategories.length === 0}
              >
                <option value="">Nenhuma</option>
                {subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Receipt File Upload */}
          <div className="form-group">
            <label className="form-label">Comprovante / Recibo (Opcional)</label>
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.75rem',
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              transition: 'all var(--transition-normal)'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.02)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Upload size={22} style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                {attachment ? attachment.name : 'Selecionar imagem do comprovante'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Formatos aceitos: PNG, JPG, PDF (Limite: 5MB)
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  {uploading ? 'Enviando Recibo...' : 'Processando...'}
                </>
              ) : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
