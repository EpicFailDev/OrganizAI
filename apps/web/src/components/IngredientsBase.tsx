import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Save,
  Check,
  Loader2,
  Search,
  Package
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { parseNumber } from '../utils';

interface IngredientRow {
  id: string;
  name: string;
  /** Valores mantidos como string para o usuário digitar "12,90" (vírgula pt-BR) sem perder o zero à esquerda. */
  package_grams: string;
  package_cost: string;
  isNew?: boolean;
}

interface IngredientsBaseProps {
  familyId: string;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * TABELA 1 - BASE · Custo dos Ingredientes
 * Réplica da planilha "DOCE DE RUA.xlsx": a Jenifer atualiza aqui o
 * custo e a quantidade das embalagens sem sair do app.
 */
export const IngredientsBase: React.FC<IngredientsBaseProps> = ({ familyId }) => {
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchIngredients = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredients_base')
      .select('*')
      .eq('family_id', familyId)
      .order('name');

    if (!error && data) {
      setRows(data.map((r: any) => ({
        id: r.id,
        name: r.name,
        package_grams: String(r.package_grams ?? ''),
        package_cost: String(r.package_cost ?? '')
      })));
    }
    setDirtyIds(new Set());
    setDeletedIds([]);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const updateRow = (id: string, field: 'name' | 'package_grams' | 'package_cost', value: string) => {
    setRows(prev => prev.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
    setDirtyIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const addRow = () => {
    const id = generateId();
    setRows(prev => [...prev, { id, name: '', package_grams: '', package_cost: '', isNew: true }]);
    setDirtyIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const removeRow = (id: string) => {
    const row = rows.find(r => r.id === id);
    if (row && !row.isNew) {
      if (!window.confirm(`Remover "${row.name}" da tabela base?`)) return;
      setDeletedIds(prev => [...prev, id]);
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const saveAll = async () => {
    const empty = rows.find(r => !r.name.trim());
    if (empty) {
      alert('Preencha o nome de todos os ingredientes antes de salvar.');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      for (const id of deletedIds) {
        await supabase.from('ingredients_base').delete().eq('id', id);
      }
      for (const row of rows) {
        const payload = {
          name: row.name.trim(),
          package_grams: parseNumber(row.package_grams),
          package_cost: parseNumber(row.package_cost)
        };
        if (row.isNew) {
          await supabase.from('ingredients_base').insert({
            family_id: familyId,
            ...payload
          });
        } else if (dirtyIds.has(row.id)) {
          await supabase.from('ingredients_base').update({
            ...payload,
            updated_at: new Date().toISOString()
          }).eq('id', row.id);
        }
      }
      await fetchIngredients();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err.message || 'tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const hasChanges = dirtyIds.size > 0 || deletedIds.length > 0;
  const totalInvested = useMemo(
    () => rows.reduce((s, r) => s + parseNumber(r.package_cost), 0),
    [rows]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Cabeçalho estilo Excel */}
      <div style={{
        background: 'linear-gradient(135deg, #e91e63 0%, #f44336 100%)',
        padding: '1.25rem',
        borderRadius: '10px 10px 0 0',
        color: '#fff',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(233, 30, 99, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontStyle: 'italic', fontWeight: 700, fontSize: '1.25rem' }}>
          <Database size={20} />
          TABELA 1 - BASE · Custo dos Ingredientes
        </div>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', opacity: 0.92 }}>
          Atualize aqui o custo e a quantidade das embalagens — a calculadora usa esses valores!
        </p>
      </div>

      {/* Barra de ferramentas */}
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.6rem 0.75rem'
      }}>
        <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-quaternary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ingrediente..."
            style={{
              width: '100%',
              background: 'rgba(118, 118, 128, 0.12)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 0.75rem 0.55rem 2rem',
              color: 'var(--text-primary)',
              fontSize: '0.88rem'
            }}
          />
        </div>
        <button
          onClick={addRow}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(33, 150, 243, 0.12)',
            border: '1px solid rgba(33, 150, 243, 0.35)',
            color: '#2196f3',
            borderRadius: '8px',
            padding: '0.55rem 0.9rem',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={15} /> Novo
        </button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <Package size={13} /> {rows.length} ingrediente{rows.length === 1 ? '' : 's'} na base
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <Database size={13} /> Total em estoque: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalInvested)}</b>
        </span>
      </div>

      {/* Tabela */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(120px, 1.6fr) 0.8fr 0.8fr 44px',
          gap: '0.5rem',
          padding: '0.7rem 0.75rem',
          background: 'linear-gradient(135deg, #e91e63 0%, #f44336 100%)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.74rem',
          textAlign: 'center'
        }}>
          <div style={{ textAlign: 'left' }}>Ingrediente (A)</div>
          <div>Gramas da embalagem (B)</div>
          <div>Custo (C)</div>
          <div />
        </div>

        {/* Body */}
        <div style={{ maxHeight: '430px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <Loader2 size={24} className="spinner" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Database size={44} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <p>{search ? 'Nenhum ingrediente encontrado.' : 'Nenhum ingrediente cadastrado ainda.'}</p>
              {!search && (
                <p style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
                  Clique em "Novo" para adicionar o primeiro.
                </p>
              )}
            </div>
          ) : filteredRows.map((row, index) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 1.6fr) 0.8fr 0.8fr 44px',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderBottom: '1px solid var(--border-color)',
                background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                alignItems: 'center'
              }}
            >
              <input
                className="ing-base-cell"
                type="text"
                value={row.name}
                onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                placeholder="Ingrediente"
              />
              <input
                className="ing-base-cell"
                type="text"
                inputMode="decimal"
                value={row.package_grams}
                onChange={(e) => updateRow(row.id, 'package_grams', e.target.value)}
                placeholder="0"
              />
              <input
                className="ing-base-cell"
                type="text"
                inputMode="decimal"
                value={row.package_cost}
                onChange={(e) => updateRow(row.id, 'package_cost', e.target.value)}
                placeholder="0,00"
              />
              <button
                onClick={() => removeRow(row.id)}
                title="Remover ingrediente"
                style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  color: '#f44336',
                  borderRadius: '6px',
                  padding: '0.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de salvar */}
      {hasChanges && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0 0.75rem' }}>
          <button
            onClick={saveAll}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: saved ? '#4caf50' : 'var(--color-primary)',
              color: '#000',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem 1.75rem',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)'
            }}
          >
            {saving ? <Loader2 size={18} className="spinner" /> : saved ? <Check size={18} /> : <Save size={18} />}
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        </div>
      )}

      {/* Estilo das células azuis (igual à planilha) */}
      <style>{`
        .ing-base-cell {
          background: #e3f2fd !important;
          border: 1px solid #2196f3 !important;
          padding: 0.5rem !important;
          text-align: center !important;
          font-family: 'Arial', sans-serif !important;
          font-size: 0.85rem !important;
          border-radius: 4px !important;
          transition: all 0.2s !important;
          color: #333 !important;
          width: 100%;
          box-sizing: border-box;
        }
        .ing-base-cell:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3) !important;
          background: #bbdefb !important;
        }
        input.ing-base-cell[type="text"] {
          text-align: left !important;
        }
      `}</style>
    </div>
  );
};
