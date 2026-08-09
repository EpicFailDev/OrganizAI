import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { api } from '../lib/apiClient';
import { parseNumber } from '../utils';
import {
  X, Upload, Loader2, Calendar, Fuel, ShoppingCart, Cookie, Coffee, Car, Sparkles, MapPin, ClipboardList,
} from 'lucide-react';

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

type SmartMode = 'fuel' | 'market' | 'salgados' | 'uber' | null;

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const parseNum = (s: string): number => {
  if (!s) return 0;
  let clean = s.replace(/\s/g, '');
  if (clean.includes(',')) {
    // pt-BR: ponto = separador de milhar, vírgula = decimal
    clean = clean.replace(/\./g, '').replace(',', '.');
  }
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toAmountString = (n: number) => n.toFixed(2).replace('.', ',');

const FUEL_TYPES = ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel', 'GNV'];

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
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Smart fields — Combustível
  const [fuelOdometer, setFuelOdometer] = useState('');
  const [fuelType, setFuelType] = useState(FUEL_TYPES[0]);
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');

  // Smart fields — Mercado
  const [marketPlace, setMarketPlace] = useState('');
  const [marketItems, setMarketItems] = useState('');

  // Smart fields — Salgados
  const [salgadosQty, setSalgadosQty] = useState('');
  const [salgadosPrice, setSalgadosPrice] = useState('3,50');
  const [refriQty, setRefriQty] = useState('');
  const [refriPrice, setRefriPrice] = useState('4,00');
  const [cafeQty, setCafeQty] = useState('');
  const [cafePrice, setCafePrice] = useState('3,00');

  // Smart fields — Uber / 99
  const [uberOdometer, setUberOdometer] = useState('');
  const [uberKm, setUberKm] = useState('');
  const [uberRides, setUberRides] = useState('');
  const [uberValorKm, setUberValorKm] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  useEffect(() => {
    setCategoryId('');
    setSubcategoryId('');
    resetSmartFields();
    setAmountTouched(false);
    setDescriptionTouched(false);
  }, [type]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId('');
      return;
    }
    const fetchSubcategories = async () => {
      try {
        const { data, error } = await api.listSubcategories(categoryId);
        if (error) throw error;
        setSubcategories(data || []);
      } catch (err: any) {
        console.error('Erro ao buscar subcategorias:', err.message);
      }
    };
    fetchSubcategories();
    setSubcategoryId('');
  }, [categoryId]);

  useEffect(() => {
    setSubcategoryId('');
    resetSmartFields();
    setAmountTouched(false);
    if (!descriptionTouched) setDescription('');
    setDescriptionTouched(false);
  }, [categoryId]);

  const selectedCategory = useMemo(
    () => filteredCategories.find(c => c.id === categoryId),
    [filteredCategories, categoryId]
  );
  const selectedSubcategory = useMemo(
    () => subcategories.find(s => s.id === subcategoryId),
    [subcategories, subcategoryId]
  );

  const smartMode = useMemo<SmartMode>(() => {
    if (!selectedCategory) return null;
    const hay = normalize(`${selectedCategory.name} ${selectedSubcategory?.name || ''}`);
    if (type === 'expense') {
      if (/(combust|gasolina|etanol|diesel|posto|abastec)/.test(hay)) return 'fuel';
      if (/(mercado|supermerc|feira|merc|compras)/.test(hay)) return 'market';
    } else {
      if (/(salgado|doces|lanche|venda|refrigerante|cafe)/.test(hay)) return 'salgados';
      if (/(uber|99|trabalho|motorista|corrida|taxi)/.test(hay)) return 'uber';
    }
    return null;
  }, [selectedCategory, selectedSubcategory, type]);

  function resetSmartFields() {
    setFuelOdometer('');
    setFuelType(FUEL_TYPES[0]);
    setFuelPricePerLiter('');
    setFuelLiters('');
    setMarketPlace('');
    setMarketItems('');
    setSalgadosQty('');
    setRefriQty('');
    setCafeQty('');
    setUberOdometer('');
    setUberKm('');
    setUberRides('');
    setUberValorKm('');
  }

  // Valor calculado automaticamente com base nos campos inteligentes
  const computedAmount = useMemo(() => {
    if (smartMode === 'fuel' && fuelLiters && fuelPricePerLiter) {
      return round2(parseNum(fuelLiters) * parseNum(fuelPricePerLiter));
    }
    if (smartMode === 'salgados') {
      const total =
        parseNum(salgadosQty) * parseNum(salgadosPrice) +
        parseNum(refriQty) * parseNum(refriPrice) +
        parseNum(cafeQty) * parseNum(cafePrice);
      return total > 0 ? round2(total) : null;
    }
    if (smartMode === 'uber' && uberKm && uberValorKm) {
      return round2(parseNum(uberKm) * parseNum(uberValorKm));
    }
    return null;
  }, [smartMode, fuelLiters, fuelPricePerLiter, salgadosQty, salgadosPrice, refriQty, refriPrice, cafeQty, cafePrice, uberKm, uberValorKm]);

  useEffect(() => {
    if (computedAmount !== null && !amountTouched) {
      setAmount(toAmountString(computedAmount));
    }
  }, [computedAmount, amountTouched]);

  // Cálculo bidirecional: se o usuário preencher total + litros, deriva o preço/litro;
  // se preencher total + preço, deriva os litros (combustível) ou km (uber).
  useEffect(() => {
    if (smartMode !== 'fuel') return;
    const liters = parseNum(fuelLiters);
    const price = parseNum(fuelPricePerLiter);
    const amt = parseNum(amount);
    if (!fuelPricePerLiter && liters > 0 && amt > 0) {
      setFuelPricePerLiter(toAmountString(round2(amt / liters)));
    } else if (!fuelLiters && price > 0 && amt > 0) {
      setFuelLiters(toAmountString(round2(amt / price)));
    }
  }, [smartMode, fuelLiters, fuelPricePerLiter, amount]);

  useEffect(() => {
    if (smartMode !== 'uber') return;
    const km = parseNum(uberKm);
    const rate = parseNum(uberValorKm);
    const amt = parseNum(amount);
    if (!uberValorKm && km > 0 && amt > 0) {
      setUberValorKm(toAmountString(round2(amt / km)));
    } else if (!uberKm && rate > 0 && amt > 0) {
      setUberKm(toAmountString(round2(amt / rate)));
    }
  }, [smartMode, uberKm, uberValorKm, amount]);

  // Descrição gerada automaticamente
  const generatedDescription = useMemo(() => {
    if (smartMode === 'fuel') {
      const parts = ['Abastecimento'];
      if (fuelType) parts.push(fuelType);
      if (fuelLiters) parts.push(`${fuelLiters} L`);
      if (fuelPricePerLiter) parts.push(`R$ ${fuelPricePerLiter}/L`);
      return parts.join(' • ');
    }
    if (smartMode === 'market') {
      const parts = ['Mercado'];
      if (marketPlace) parts.push(marketPlace);
      if (marketItems) parts.push(marketItems);
      return parts.join(' • ');
    }
    if (smartMode === 'salgados') {
      const parts = ['Venda de salgados'];
      if (salgadosQty) parts.push(`${salgadosQty} salgados`);
      if (refriQty) parts.push(`${refriQty} refris`);
      if (cafeQty) parts.push(`${cafeQty} cafés`);
      return parts.join(' • ');
    }
    if (smartMode === 'uber') {
      const parts = ['Uber / 99'];
      if (uberKm) parts.push(`${uberKm} km`);
      if (uberRides) parts.push(`${uberRides} corridas`);
      return parts.join(' • ');
    }
    return '';
  }, [smartMode, fuelType, fuelLiters, fuelPricePerLiter, marketPlace, marketItems, salgadosQty, refriQty, cafeQty, uberKm, uberRides]);

  useEffect(() => {
    if (smartMode && generatedDescription && !descriptionTouched) {
      setDescription(generatedDescription);
    }
  }, [generatedDescription, smartMode, descriptionTouched]);

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

  const buildReceiptItems = (transactionId: string) => {
    const items: any[] = [];
    if (smartMode === 'fuel' && parseNum(fuelLiters) > 0) {
      items.push({
        transaction_id: transactionId,
        family_id: familyId,
        item_name: `Combustível (${fuelType})`,
        quantity: parseNum(fuelLiters),
        unit_price: parseNum(fuelPricePerLiter),
        total_price: round2(parseNum(fuelLiters) * parseNum(fuelPricePerLiter)),
        line_number: 1,
      });
    }
    if (smartMode === 'salgados') {
      let line = 1;
      if (parseNum(salgadosQty) > 0) {
        items.push({
          transaction_id: transactionId, family_id: familyId,
          item_name: 'Salgados', quantity: parseNum(salgadosQty),
          unit_price: parseNum(salgadosPrice),
          total_price: round2(parseNum(salgadosQty) * parseNum(salgadosPrice)),
          line_number: line++,
        });
      }
      if (parseNum(refriQty) > 0) {
        items.push({
          transaction_id: transactionId, family_id: familyId,
          item_name: 'Refrigerantes', quantity: parseNum(refriQty),
          unit_price: parseNum(refriPrice),
          total_price: round2(parseNum(refriQty) * parseNum(refriPrice)),
          line_number: line++,
        });
      }
      if (parseNum(cafeQty) > 0) {
        items.push({
          transaction_id: transactionId, family_id: familyId,
          item_name: 'Cafés', quantity: parseNum(cafeQty),
          unit_price: parseNum(cafePrice),
          total_price: round2(parseNum(cafeQty) * parseNum(cafePrice)),
          line_number: line++,
        });
      }
    }
    if (smartMode === 'uber' && parseNum(uberKm) > 0 && parseNum(uberValorKm) > 0) {
      items.push({
        transaction_id: transactionId, family_id: familyId,
        item_name: 'Uber/99 (km)', quantity: parseNum(uberKm),
        unit_price: parseNum(uberValorKm),
        total_price: round2(parseNum(uberKm) * parseNum(uberValorKm)),
        line_number: 1,
      });
    }
    return items;
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
    const cleanAmount = Math.abs(parseNumber(amount));
    if (!amount || cleanAmount <= 0) {
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

      const finalDescription = description.trim() || generatedDescription || 'Lançamento';
      const { data: inserted, error: insertError } = await api.createTransaction({
        family_id: familyId,
        date,
        description: finalDescription,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        type,
        amount: cleanAmount,
        created_by: userId,
        attachment_url: attachmentUrl || null
      });

      if (insertError) throw insertError;

      // Salva itens inteligentes (combustível / salgados / uber) como receipt_items
      const receiptItems = buildReceiptItems(inserted?.id || '');
      if (receiptItems.length > 0) {
        const { error: itemsError } = await api.createReceiptItems(receiptItems);
        if (itemsError) throw itemsError;
      }

      setDescription('');
      setDescriptionTouched(false);
      setCategoryId('');
      setSubcategoryId('');
      setAmount('');
      setAmountTouched(false);
      setAttachment(null);
      resetSmartFields();

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

  const autoChip = computedAmount !== null && !amountTouched;

  const renderSmartSection = () => {
    if (smartMode === 'fuel') {
      return (
        <div key="fuel" className="ios-smart-card">
          <div className="ios-smart-header">
            <span className="ios-smart-header-icon" style={{ background: '#30d158' }}>
              <Fuel size={16} />
            </span>
            Abastecimento
          </div>
          <div className="ios-smart-grid">
            <div className="ios-input-group">
              <label className="ios-input-label">Odômetro (km)</label>
              <input type="text" inputMode="numeric" className="ios-input" placeholder="Ex: 124.500"
                value={fuelOdometer} onChange={(e) => setFuelOdometer(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
            <div className="ios-input-group">
              <label className="ios-input-label">Tipo de combustível</label>
              <select className="ios-select" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="ios-input-group">
              <label className="ios-input-label">Preço por litro (R$)</label>
              <input type="text" inputMode="decimal" className="ios-input" placeholder="Ex: 5,89"
                value={fuelPricePerLiter} onChange={(e) => setFuelPricePerLiter(e.target.value.replace(/[^\d.,]/g, ''))} />
            </div>
            <div className="ios-input-group">
              <label className="ios-input-label">Litros</label>
              <input type="text" inputMode="decimal" className="ios-input" placeholder="Ex: 45,0"
                value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value.replace(/[^\d.,]/g, ''))} />
            </div>
          </div>
          {computedAmount !== null ? (
            <div className="ios-smart-calc">
              <Sparkles size={14} />
              {fuelLiters} L × R$ {fuelPricePerLiter}/L = R$ {fmtBRL(computedAmount)}
            </div>
          ) : (
            <div className="ios-smart-note">
              Preencha o preço por litro e a quantidade — o valor total é calculado automaticamente.
            </div>
          )}
        </div>
      );
    }

    if (smartMode === 'market') {
      return (
        <div key="market" className="ios-smart-card">
          <div className="ios-smart-header">
            <span className="ios-smart-header-icon" style={{ background: '#0a84ff' }}>
              <ShoppingCart size={16} />
            </span>
            Compra no mercado
          </div>
          <div className="ios-input-group">
            <label className="ios-input-label">Onde (opcional)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MapPin size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-tertiary)' }} />
              <input type="text" className="ios-input" style={{ paddingLeft: '2.3rem' }}
                placeholder="Ex: Atacadão, Extra..." value={marketPlace}
                onChange={(e) => setMarketPlace(e.target.value)} />
            </div>
          </div>
          <div className="ios-input-group">
            <label className="ios-input-label">O que comprou (opcional)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <ClipboardList size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-tertiary)' }} />
              <input type="text" className="ios-input" style={{ paddingLeft: '2.3rem' }}
                placeholder="Ex: arroz, feijão, frutas..." value={marketItems}
                onChange={(e) => setMarketItems(e.target.value)} />
            </div>
          </div>
          <div className="ios-smart-note" style={{ color: 'var(--color-meta)' }}>
            Dica: anexe a nota fiscal como comprovante abaixo 👇
          </div>
        </div>
      );
    }

    if (smartMode === 'salgados') {
      const itemRow = (icon: React.ReactNode, label: string, qty: string, onQty: (v: string) => void, price: string, onPrice: (v: string) => void, placeholder: string) => (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem', alignItems: 'end' }}>
          <div className="ios-input-group">
            <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {icon} {label}
            </label>
            <input type="text" inputMode="numeric" className="ios-input" placeholder={placeholder}
              value={qty} onChange={(e) => onQty(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
          <div className="ios-input-group">
            <label className="ios-input-label">Preço</label>
            <input type="text" inputMode="decimal" className="ios-input" value={price}
              onChange={(e) => onPrice(e.target.value.replace(/[^\d.,]/g, ''))} />
          </div>
          <div className="ios-input-group">
            <label className="ios-input-label">Total</label>
            <div className="ios-input" style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
              R$ {fmtBRL(round2(parseNum(qty) * parseNum(price)))}
            </div>
          </div>
        </div>
      );

      return (
        <div key="salgados" className="ios-smart-card">
          <div className="ios-smart-header">
            <span className="ios-smart-header-icon" style={{ background: '#ff9f0a' }}>
              <Cookie size={16} />
            </span>
            Venda de salgados
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {itemRow(<Cookie size={13} />, 'Salgados', salgadosQty, setSalgadosQty, salgadosPrice, setSalgadosPrice, 'Ex: 20')}
            {itemRow(<Coffee size={13} />, 'Refrigerantes', refriQty, setRefriQty, refriPrice, setRefriPrice, 'Ex: 5')}
            {itemRow(<Coffee size={13} />, 'Cafés', cafeQty, setCafeQty, cafePrice, setCafePrice, 'Ex: 8')}
          </div>
          {computedAmount !== null ? (
            <div className="ios-smart-calc">
              <Sparkles size={14} />
              Total calculado: R$ {fmtBRL(computedAmount)}
            </div>
          ) : (
            <div className="ios-smart-note">
              Informe as quantidades vendidas — o total é calculado automaticamente.
            </div>
          )}
        </div>
      );
    }

    if (smartMode === 'uber') {
      return (
        <div key="uber" className="ios-smart-card">
          <div className="ios-smart-header">
            <span className="ios-smart-header-icon" style={{ background: '#0a84ff' }}>
              <Car size={16} />
            </span>
            Corridas Uber / 99
          </div>
          <div className="ios-smart-grid">
            <div className="ios-input-group">
              <label className="ios-input-label">Odômetro (km)</label>
              <input type="text" inputMode="numeric" className="ios-input" placeholder="Ex: 89.200"
                value={uberOdometer} onChange={(e) => setUberOdometer(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
            <div className="ios-input-group">
              <label className="ios-input-label">Km rodados</label>
              <input type="text" inputMode="decimal" className="ios-input" placeholder="Ex: 120"
                value={uberKm} onChange={(e) => setUberKm(e.target.value.replace(/[^\d.,]/g, ''))} />
            </div>
            <div className="ios-input-group">
              <label className="ios-input-label">Corridas realizadas</label>
              <input type="text" inputMode="numeric" className="ios-input" placeholder="Ex: 8"
                value={uberRides} onChange={(e) => setUberRides(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
            <div className="ios-input-group">
              <label className="ios-input-label">Valor por km (R$)</label>
              <input type="text" inputMode="decimal" className="ios-input" placeholder="Ex: 2,50"
                value={uberValorKm} onChange={(e) => setUberValorKm(e.target.value.replace(/[^\d.,]/g, ''))} />
            </div>
          </div>
          {computedAmount !== null ? (
            <div className="ios-smart-calc">
              <Sparkles size={14} />
              {uberKm} km × R$ {uberValorKm}/km = R$ {fmtBRL(computedAmount)}
            </div>
          ) : (
            <div className="ios-smart-note">
              Informe km rodados e o valor por km — o total é calculado automaticamente.
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`ios-sheet-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div
        className="ios-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
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

            {/* Amount — destaque principal */}
            <div className="ios-input-group">
              <label className="ios-input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Valor
                {autoChip && <span className="ios-auto-chip"><Sparkles size={11} /> Auto</span>}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  position: 'absolute', left: '0.85rem',
                  fontSize: '1.3rem', fontWeight: 700,
                  color: 'var(--text-tertiary)',
                }}>R$</span>
                <input
                  type="text"
                  className={`ios-input ${autoChip ? 'ios-amount-auto' : ''}`}
                  style={{
                    paddingLeft: '2.3rem', fontSize: '1.7rem', fontWeight: 800,
                    fontFamily: 'var(--font-title)',
                    background: smartMode ? 'rgba(48, 209, 88, 0.06)' : 'rgba(118, 118, 128, 0.12)',
                    border: smartMode ? '0.5px solid rgba(48, 209, 88, 0.25)' : 'none',
                  }}
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => { setAmountTouched(true); setAmount(e.target.value); }}
                  required
                />
              </div>
            </div>

            {/* Category — segunda posição */}
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

            {/* Smart dynamic section */}
            {smartMode && renderSmartSection()}

            {/* Description */}
            <div className="ios-input-group">
              <label className="ios-input-label">Descrição</label>
              <input
                type="text"
                className="ios-input"
                placeholder="Ex: Combustível, Mercado..."
                value={description}
                onChange={(e) => { setDescriptionTouched(true); setDescription(e.target.value); }}
              />
            </div>

            {/* Date */}
            <div className="ios-input-group">
              <label className="ios-input-label">Data</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="date"
                  className="ios-input"
                  style={{ paddingRight: '2.5rem' }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <Calendar size={16} style={{ position: 'absolute', right: '0.85rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* File upload */}
            <div className="ios-input-group">
              <label className="ios-input-label">Comprovante (opcional)</label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem', background: 'rgba(118, 118, 128, 0.12)',
                borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                transition: 'background var(--transition-fast), box-shadow var(--transition-fast)',
                border: smartMode === 'market' ? '1px dashed rgba(100, 210, 255, 0.5)' : '1px dashed rgba(255,255,255,0.12)',
                boxShadow: smartMode === 'market' && !attachment ? '0 0 0 4px rgba(100, 210, 255, 0.08)' : 'none',
              }}>
                <Upload size={18} color="var(--color-primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', color: attachment ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {attachment ? attachment.name : 'Selecionar arquivo'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-quaternary)' }}>
                    {smartMode === 'market' ? 'Nota fiscal / cupom (PNG, JPG ou PDF, máx. 5MB)' : 'PNG, JPG ou PDF (máx. 5MB)'}
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
