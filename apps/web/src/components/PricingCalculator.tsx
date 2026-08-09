import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Save, 
  Plus, 
  Trash2, 
  Check,
  Loader2
} from 'lucide-react';
import { api } from '../lib/apiClient';
import { parseNumber } from '../utils';

interface RecipeItem {
  id: string;
  ingredient_name: string;
  package_grams?: number;
  package_cost?: number;
  used_grams?: number;
  sort_order?: number;
}

interface BaseIngredient {
  id: string;
  name: string;
  package_grams: number;
  package_cost: number;
}

interface Recipe {
  id: string;
  name: string;
  yield_quantity: number;
  packaging_cost: number;
  notes?: string | null;
  created_at?: string;
}

interface PricingCalculatorProps {
  familyId: string;
  userId: string;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);


export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  familyId,
  userId
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('Nova Receita');
  const [pricingDate, setPricingDate] = useState(
    new Date().toLocaleDateString('pt-BR')
  );
  const [yieldQuantity, setYieldQuantity] = useState(10);
  const [packagingCost, setPackagingCost] = useState(0);
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Tabela Base de Ingredientes (autocomplete) ──
  const [baseIngredients, setBaseIngredients] = useState<BaseIngredient[]>([]);
  const [suggestForId, setSuggestForId] = useState<string | null>(null);
  // Posição (fixa) do dropdown, calculada a partir do input — renderizado via portal no <body>
  // para não ser cortado pelo overflow da tabela nem deslocado por transforms do ViewStack
  const [suggestRect, setSuggestRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const blurTimerRef = useRef<number | null>(null);

  // Fetch recipes from Supabase
  const fetchRecipes = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);

    const { data, error } = await api.listRecipes(familyId);

    if (!error && data) {
      setRecipes(data);
      // Select first recipe if none selected
      if (!selectedRecipeId && data.length > 0) {
        setSelectedRecipeId(data[0].id);
      }
    }
    setLoading(false);
  }, [familyId, selectedRecipeId]);

  // Fetch recipe items when recipe is selected
  const fetchRecipeItems = useCallback(async () => {
    if (!selectedRecipeId) {
      setItems([]);
      return;
    }

    const { data: recipe } = await api.getRecipe(selectedRecipeId);

    if (recipe) {
      setRecipeName(recipe.name);
      setYieldQuantity(recipe.yield_quantity);
      setPackagingCost(recipe.packaging_cost);
      setNotes(recipe.notes || '');
    }

    const { data: itemsData } = await api.getRecipeItems(selectedRecipeId);

    if (itemsData) {
      setItems(itemsData);
    }
  }, [selectedRecipeId]);

  useEffect(() => {
    fetchRecipes();
  }, [familyId]);

  useEffect(() => {
    fetchRecipeItems();
  }, [selectedRecipeId]);

  // Fetch Tabela Base de Ingredientes da família
  useEffect(() => {
    if (!familyId) return;
    api.listIngredients(familyId).then(({ data, error }) => {
      if (!error && data) setBaseIngredients(data as BaseIngredient[]);
    });
  }, [familyId]);

  // Fecha o dropdown ao rolar a página (position:fixed não acompanha o scroll)
  useEffect(() => {
    if (!suggestForId) return;
    const close = () => setSuggestForId(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [suggestForId]);

  // Limpa o timer do blur ao desmontar
  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  // Create new recipe
  const createNewRecipe = useCallback(async () => {
    const { data, error } = await api.createRecipe({
      family_id: familyId,
      name: 'Nova Receita',
      created_by: userId,
      yield_quantity: 10,
      packaging_cost: 0
    });

    if (!error && data) {
      setRecipes(prev => [data, ...prev]);
      setSelectedRecipeId(data.id);
    }
  }, [familyId, userId]);

  const calculations = useMemo(() => {
    const itemsWithCost = items.map(item => {
      const grams = item.package_grams || 0;
      const costPerGram = grams > 0
        ? (item.package_cost || 0) / grams
        : 0;
      const ingredientCost = costPerGram * (item.used_grams || 0);
      return { ...item, costPerGram, ingredientCost };
    });

    const totalIngredients = itemsWithCost.reduce(
      (sum, item) => sum + item.ingredientCost, 0
    );
    const fixedCosts = totalIngredients * 0.25;
    const withFixedCosts = totalIngredients + fixedCosts;
    const withProfit = withFixedCosts * 3;
    const pricePerUnit = yieldQuantity > 0 ? withProfit / yieldQuantity : 0;
    const finalPrice = pricePerUnit + packagingCost;

    return {
      itemsWithCost,
      totalIngredients,
      fixedCosts,
      withFixedCosts,
      withProfit,
      pricePerUnit,
      finalPrice
    };
  }, [items, yieldQuantity, packagingCost]);

  // Save recipe
  const saveRecipe = useCallback(async () => {
    if (!selectedRecipeId) return;
    setSaving(true);

    // Update recipe metadata
    await api.updateRecipe(selectedRecipeId, {
      name: recipeName,
      yield_quantity: yieldQuantity,
      packaging_cost: packagingCost,
      notes,
      updated_at: new Date().toISOString()
    });

    // Replace items (delete + insert in a single call)
    if (items.length > 0) {
      const itemsToReplace = items.map((item, index) => ({
        ingredient_name: item.ingredient_name,
        package_grams: item.package_grams,
        package_cost: item.package_cost,
        used_grams: item.used_grams,
        sort_order: index
      }));

      await api.replaceRecipeItems(selectedRecipeId, itemsToReplace);
    }

    // Update products cost price if linked
    const totalCost = calculations.totalIngredients;
    const costPerUnit = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;

    await api.updateProductCostsByRecipe(selectedRecipeId, costPerUnit);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // Refresh recipes list
    fetchRecipes();
  }, [selectedRecipeId, recipeName, yieldQuantity, packagingCost, notes, items, calculations, fetchRecipes]);

  // Delete recipe
  const deleteRecipe = useCallback(async () => {
    if (!selectedRecipeId) return;
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;

    await api.deleteRecipe(selectedRecipeId);

    setSelectedRecipeId(null);
    fetchRecipes();
  }, [selectedRecipeId, fetchRecipes]);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      id: generateId(),
      ingredient_name: '',
      package_grams: 0,
      package_cost: 0,
      used_grams: 0
    }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, field: keyof RecipeItem, value: string | number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  }, []);

  // Sugestões da Tabela Base conforme o que a Jenifer digita
  const getSuggestions = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return baseIngredients
      .filter(b => b.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [baseIngredients]);

  // Aplica o ingrediente da Base: nome + custo + gramas da embalagem
  const applyBaseIngredient = useCallback((itemId: string, base: BaseIngredient) => {
    updateItem(itemId, 'ingredient_name', base.name);
    updateItem(itemId, 'package_cost', base.package_cost);
    updateItem(itemId, 'package_grams', base.package_grams);
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setSuggestForId(null);
  }, [updateItem]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 size={24} className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #e91e63 0%, #f44336 100%)',
        padding: '1.5rem',
        borderRadius: '12px',
        color: 'white',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontStyle: 'italic',
          fontSize: '1.75rem',
          fontWeight: 700
        }}>
          ** Calculadora de Precificação **
        </h1>
      </div>

      {/* Instructions */}
      <div style={{
        background: '#fff3e0',
        padding: '1rem',
        border: '2px dashed #ff9800',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '0.95rem',
        color: '#333'
      }}>
        Complete <strong style={{ color: '#2196f3' }}>somente</strong> as{' '}
        <span style={{ color: '#2196f3', fontWeight: 'bold' }}>células em azul</span>,
        a tabela faz o resto!
        <br />
        <span style={{ color: '#2196f3', fontSize: '0.85rem' }}>
          💡 Dica: digite o nome do ingrediente e escolha na <b>Tabela Base</b> — custo e gramas da embalagem são preenchidos sozinhos.
        </span>
        <span style={{ 
          float: 'right', 
          color: '#e91e63',
          fontWeight: 'bold',
          fontStyle: 'italic'
        }}>
          {'>>> Vá até o final da página para ler as instruções'}
        </span>
      </div>

      {/* Recipe Selector */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: 'var(--bg-card)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.78rem', 
            fontWeight: 600, 
            color: 'var(--text-secondary)',
            marginBottom: '0.25rem'
          }}>
            RECEITA:
          </label>
          <select
            value={selectedRecipeId || ''}
            onChange={(e) => setSelectedRecipeId(e.target.value || null)}
            style={{
              width: '100%',
              background: 'rgba(118, 118, 128, 0.12)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          >
            <option value="">Selecione uma receita...</option>
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={createNewRecipe}
          style={{
            background: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#2196f3',
            fontWeight: 'bold',
            marginTop: '1.5rem'
          }}
        >
          <Plus size={16} />
          Nova
        </button>

        {selectedRecipeId && (
          <button
            onClick={deleteRecipe}
            style={{
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#f44336',
              fontWeight: 'bold',
              marginTop: '1.5rem'
            }}
          >
            <Trash2 size={16} />
            Excluir
          </button>
        )}
      </div>

      {/* Recipe Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        background: 'var(--bg-card)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.78rem', 
            fontWeight: 600, 
            color: 'var(--text-secondary)',
            marginBottom: '0.25rem'
          }}>
            Nome da Receita:
          </label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="excel-input-cell"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.78rem', 
            fontWeight: 600, 
            color: 'var(--text-secondary)',
            marginBottom: '0.25rem'
          }}>
            Data:
          </label>
          <input
            type="text"
            value={pricingDate}
            onChange={(e) => setPricingDate(e.target.value)}
            className="excel-input-cell"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          background: 'linear-gradient(135deg, #e91e63 0%, #f44336 100%)',
          padding: '0.75rem',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 60px',
          gap: '0.5rem',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.8rem',
          textAlign: 'center'
        }}>
          <div>Ingredientes (A)</div>
          <div>Custo Embalagem (B)</div>
          <div>Gramas Embalagem (C)</div>
          <div>Gramas Utilizadas (D)</div>
          <div>Quanto Custou (E)</div>
          <div></div>
        </div>

        {/* Table Body */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {calculations.itemsWithCost.map((item, index) => (
            <div 
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 60px',
                gap: '0.5rem',
                padding: '0.5rem',
                borderBottom: '1px solid var(--border-color)',
                background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                alignItems: 'center'
              }}
            >
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={item.ingredient_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateItem(item.id, 'ingredient_name', value);
                    // Preenchimento automático se o nome bater exatamente com a Base
                    const exact = baseIngredients.find(b => b.name.toLowerCase() === value.trim().toLowerCase());
                    if (exact) {
                      updateItem(item.id, 'package_cost', exact.package_cost);
                      updateItem(item.id, 'package_grams', exact.package_grams);
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSuggestRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                    setSuggestForId(item.id);
                  }}
                  onFocus={(e) => {
                    // Cancela um fechamento pendente do blur anterior (troca de linha)
                    if (blurTimerRef.current) {
                      window.clearTimeout(blurTimerRef.current);
                      blurTimerRef.current = null;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSuggestRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                    setSuggestForId(item.id);
                  }}
                  onBlur={() => {
                    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                    blurTimerRef.current = window.setTimeout(() => setSuggestForId(null), 150);
                  }}
                  className="excel-input-cell"
                  placeholder="Digite o ingrediente..."
                />
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={String(item.package_cost ?? '').replace('.', ',')}
                onChange={(e) => updateItem(item.id, 'package_cost', parseNumber(e.target.value))}
                className="excel-input-cell"
                placeholder="0,00"
              />
              <input
                type="text"
                inputMode="decimal"
                value={String(item.package_grams ?? '').replace('.', ',')}
                onChange={(e) => updateItem(item.id, 'package_grams', parseNumber(e.target.value))}
                className="excel-input-cell"
                placeholder="0"
              />
              <input
                type="text"
                inputMode="decimal"
                value={String(item.used_grams ?? '').replace('.', ',')}
                onChange={(e) => updateItem(item.id, 'used_grams', parseNumber(e.target.value))}
                className="excel-input-cell"
                placeholder="0"
              />
              <div className="excel-readonly-cell" style={{ 
                fontWeight: 'bold',
                color: 'var(--color-primary)'
              }}>
                {formatCurrency(item.ingredientCost)}
              </div>
              <button
                onClick={() => removeItem(item.id)}
                style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '4px',
                  padding: '0.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f44336'
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add Item Button */}
        <div style={{
          padding: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={addItem}
            style={{
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: '8px',
              padding: '0.6rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#2196f3',
              fontWeight: 'bold'
            }}
          >
            <Plus size={16} />
            Adicionar Ingrediente
          </button>
        </div>
      </div>

      {/* Dropdown de sugestões da Tabela Base — portal no <body>: escapa do overflow da tabela
          e de transforms do ViewStack (position:fixed seria deslocado por ancestral com transform) */}
      {suggestForId && suggestRect && (() => {
        const current = items.find(i => i.id === suggestForId);
        const suggestions = current ? getSuggestions(current.ingredient_name) : [];
        if (suggestions.length === 0) return null;
        // Garante que o dropdown não estoure a parte de baixo da janela
        const top = Math.min(suggestRect.top, window.innerHeight - 240);
        return createPortal(
          <div style={{
            position: 'fixed', top, left: suggestRect.left, width: suggestRect.width,
            zIndex: 1000, background: 'var(--bg-card)',
            border: '1px solid var(--border-color)', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            maxHeight: 200, overflowY: 'auto'
          }}>
            {suggestions.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBaseIngredient(suggestForId, s)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: '0.5rem', width: '100%', padding: '0.5rem 0.6rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontSize: '0.82rem'
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {s.package_grams}g · {formatCurrency(s.package_cost)}
                </span>
              </button>
            ))}
          </div>,
          document.body
        );
      })()}

      {/* Final Calculations */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #e91e63 0%, #f44336 100%)',
          padding: '1rem',
          color: 'white',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Contas Finais
        </div>

        <div style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontWeight: 'bold' }}>Total Custo de Ingredientes</span>
            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
              {formatCurrency(calculations.totalIngredients)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
            <span>Adiciona 25% (gás, luz, etc)</span>
            <span style={{ fontWeight: 'bold', color: '#ff9800' }}>
              {formatCurrency(calculations.withFixedCosts)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
            <span>Multiplica por 3 (lucro + mão de obra)</span>
            <span style={{ fontWeight: 'bold', color: '#e91e63' }}>
              {formatCurrency(calculations.withProfit)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(33, 150, 243, 0.1)' }}>
            <span style={{ fontWeight: 'bold' }}>Rendimento (unidades) <strong>(F)</strong></span>
            <input
              type="text"
              inputMode="numeric"
              value={yieldQuantity ? String(yieldQuantity) : ''}
              onChange={(e) => setYieldQuantity(parseInt(e.target.value.replace(',', '.')) || 0)}
              className="excel-input-cell"
              style={{ width: '80px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
            <span>Preço por Unidade</span>
            <span style={{ fontWeight: 'bold', color: '#4caf50' }}>
              {formatCurrency(calculations.pricePerUnit)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(33, 150, 243, 0.1)' }}>
            <span>Preço Embalagem Individual</span>
            <input
              type="text"
              inputMode="decimal"
              value={packagingCost ? String(packagingCost).replace('.', ',') : ''}
              onChange={(e) => setPackagingCost(parseNumber(e.target.value))}
              className="excel-input-cell"
              style={{ width: '100px' }}
              placeholder="0,00"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)', borderRadius: '0 0 8px 8px', border: '2px solid #4caf50' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Preço final de venda por unidade</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#4caf50' }}>
              {formatCurrency(calculations.finalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={saveRecipe}
          disabled={!selectedRecipeId || saving}
          style={{
            background: saved ? '#4caf50' : 'var(--color-primary)',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 'bold',
            opacity: !selectedRecipeId || saving ? 0.5 : 1
          }}
        >
          {saving ? <Loader2 size={18} className="spinner" /> : saved ? <Check size={18} /> : <Save size={18} />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Receita'}
        </button>
      </div>

      {/* Notes */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        padding: '1rem'
      }}>
        <label style={{ 
          display: 'block', 
          fontSize: '0.78rem', 
          fontWeight: 600, 
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem'
        }}>
          Observações:
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione observações sobre esta receita..."
          style={{
            width: '100%',
            minHeight: '80px',
            background: 'rgba(118, 118, 128, 0.12)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            resize: 'vertical'
          }}
        />
      </div>

      {/* CSS for Excel-like cells */}
      <style>{`
        .excel-input-cell {
          background: #e3f2fd !important;
          border: 1px solid #2196f3 !important;
          padding: 0.5rem !important;
          text-align: center !important;
          font-family: 'Arial', sans-serif !important;
          font-size: 0.85rem !important;
          border-radius: 4px !important;
          transition: all 0.2s !important;
          color: #333 !important;
        }
        .excel-input-cell:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3) !important;
          background: #bbdefb !important;
        }
        .excel-readonly-cell {
          background: rgba(255,255,255,0.05) !important;
          padding: 0.5rem !important;
          text-align: center !important;
          font-family: 'Arial', sans-serif !important;
          font-size: 0.85rem !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 4px !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
};
