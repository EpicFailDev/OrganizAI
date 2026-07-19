import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Tags, Plus, Trash2, FolderPlus, Tag, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  family_id?: string | null;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

interface CategoryManagerProps {
  categories: Category[];
  familyId: string;
  onRefreshCategories: () => Promise<void>;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  familyId,
  onRefreshCategories
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newSubName, setNewSubName] = useState('');
  
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch subcategories for listing
  const fetchAllSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (err: any) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchAllSubcategories();
  }, [categories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) {
      setErrorMsg('Você precisa fazer parte de um grupo familiar para criar categorias customizadas.');
      return;
    }
    if (!newCatName) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: newCatName,
          type: newCatType,
          color: newCatColor,
          family_id: familyId,
          icon: newCatType === 'income' ? 'payments' : 'shopping_bag'
        });

      if (error) throw error;
      
      setNewCatName('');
      await onRefreshCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar categoria.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !newSubName) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('subcategories')
        .insert({
          category_id: selectedCategoryId,
          name: newSubName
        });

      if (error) throw error;

      setNewSubName('');
      await fetchAllSubcategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar subcategoria.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Excluir esta categoria? Isso também pode excluir lançamentos vinculados!')) return;
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await onRefreshCategories();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir categoria.');
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!window.confirm('Excluir esta subcategoria?')) return;
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAllSubcategories();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir subcategoria.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
          Categorias & Subcategorias
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Gerencie as classificações das suas receitas e despesas
        </p>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          color: 'var(--color-expense)',
          fontSize: '0.85rem'
        }}>
          {errorMsg}
        </div>
      )}

      <div className="grid-2">
        {/* Left column: Category management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Create Category form */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Plus size={18} color="var(--color-primary)" /> Nova Categoria Customizada
            </h3>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Categoria</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Mercado, Presentes..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2" style={{ gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as any)}
                  >
                    <option value="expense">Despesa (Saída)</option>
                    <option value="income">Receita (Entrada)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cor Visual</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      className="form-input"
                      style={{ padding: '0.25rem', width: '45px', height: '40px', cursor: 'pointer' }}
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{newCatColor}</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                Adicionar Categoria
              </button>
            </form>
          </div>

          {/* List categories */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Tags size={18} color="var(--color-primary)" /> Categorias Ativas
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
              {categories.map(cat => (
                <div 
                  key={cat.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: cat.color || '#9E9E9E'
                    }} />
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>{cat.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cat.type === 'income' ? 'Entrada' : 'Saída'} • {cat.family_id ? 'Customizada' : 'Padrão'}
                      </p>
                    </div>
                  </div>
                  
                  {cat.family_id && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-expense)',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Subcategory management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Create Subcategory */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <FolderPlus size={18} color="var(--color-primary)" /> Nova Subcategoria
            </h3>

            <form onSubmit={handleCreateSubcategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Categoria Pai</label>
                <select
                  className="form-select"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.type === 'income' ? 'Entrada' : 'Saída'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Subcategoria</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Combustível, Delivery, Netflix..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading || !selectedCategoryId}>
                Adicionar Subcategoria
              </button>
            </form>
          </div>

          {/* List subcategories grouping by category */}
          <div className="glass-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Tag size={18} color="var(--color-primary)" /> Subcategorias Ativas
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '400px', overflowY: 'auto' }}>
              {categories.map(cat => {
                const catSubs = subcategories.filter(s => s.category_id === cat.id);
                if (catSubs.length === 0) return null;
                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: cat.color || '#9E9E9E'
                      }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {cat.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingLeft: '1rem' }}>
                      {catSubs.map(sub => (
                        <div
                          key={sub.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.8rem',
                            color: '#fff'
                          }}
                        >
                          {sub.name}
                          <button
                            onClick={() => handleDeleteSubcategory(sub.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-expense)',
                              cursor: 'pointer',
                              display: 'flex',
                              padding: '0.1rem',
                              borderRadius: '2px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-expense-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
