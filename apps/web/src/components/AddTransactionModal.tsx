import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { X, Upload, Loader2, DollarSign } from 'lucide-react';

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
      setErrorMsg('Selecione uma categoria.');
      return;
    }
    if (!amount || isNaN(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0) {
      setErrorMsg('Valor inválido.');
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
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ animation: 'spin 0.2s linear 1' /* simplified entry animation */ }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: '700' }}>
            Novo Lançamento
          </h2>
          <button className="modal-close" onClick={onClose} style={{ position: 'static' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: 'var(--color-expense)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Toggle Type (Income / Expense) */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setType('expense')}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid',
                borderColor: type === 'expense' ? 'var(--color-expense)' : 'var(--border-color)',
                backgroundColor: type === 'expense' ? 'var(--color-expense-bg)' : 'transparent',
                color: type === 'expense' ? 'var(--color-expense)' : 'var(--text-secondary)',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'var(--font-title)',
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)'
              }}
            >
              Despesa (Saída)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid',
                borderColor: type === 'income' ? 'var(--color-income)' : 'var(--border-color)',
                backgroundColor: type === 'income' ? 'var(--color-income-bg)' : 'transparent',
                color: type === 'income' ? 'var(--color-income)' : 'var(--text-secondary)',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'var(--font-title)',
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)'
              }}
            >
              Receita (Entrada)
            </button>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Amount */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Valor</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2rem' }}
                  placeholder="R$ 0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Descrição / Lançamento</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Uber, Feira, Salgados..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Category */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoria</label>
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
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subcategoria (Opcional)</label>
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

          {/* File Upload (Receipt Image) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Comprovante / Recibo (Opcional)</label>
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              transition: 'all var(--transition-fast)'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Upload size={24} style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                {attachment ? attachment.name : 'Selecionar imagem do recibo (PNG, JPG, PDF)'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Limite: 5MB
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  {uploading ? 'Enviando Recibo...' : 'Salvando...'}
                </>
              ) : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
