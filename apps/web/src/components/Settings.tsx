import React, { useState } from 'react';
import {
  User,
  Users,
  Tags,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Save,
  Moon,
  Sun,
  DollarSign,
  Bell,
  BellOff,
  Check,
  Car,
  Store,
  Briefcase,
  LogOut,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAppSettings, type ThemeMode, type CurrencyCode } from '../AppSettings';
import { CategoryManager } from './CategoryManager';
import { FamilySettings } from './FamilySettings';

type SectionId = 'profile' | 'family' | 'categories' | 'app';

interface SettingsProps {
  profileId: string;
  initialName: string;
  initialProfession?: string;
  familyId: string | null;
  familyName: string;
  userId: string;
  onRefreshProfile: () => Promise<void>;
  onRefreshFamily: () => Promise<void>;
  onLogout: () => void;
  categories: any[];
  onRefreshCategories: () => Promise<void>;
}

const PROFESSIONS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'motorista', label: 'Motorista', icon: <Car size={16} /> },
  { id: 'vendedor', label: 'Vendedor', icon: <Store size={16} /> },
  { id: 'outro', label: 'Outro', icon: <Briefcase size={16} /> },
];

export const Settings: React.FC<SettingsProps> = ({
  profileId,
  initialName,
  initialProfession,
  familyId,
  familyName,
  userId,
  onRefreshProfile,
  onRefreshFamily,
  onLogout,
  categories,
  onRefreshCategories,
}) => {
  const [active, setActive] = useState<SectionId | null>(null);
  const [name, setName] = useState(initialName || '');
  const [profession, setProfession] = useState(initialProfession || 'outro');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { theme, setTheme, currency, setCurrency, notifications, setNotifications } = useAppSettings();

  const sections = [
    {
      id: 'profile' as const,
      title: 'Perfil',
      subtitle: 'Seu nome e tipo de atividade',
      icon: <User size={20} />,
      color: 'var(--color-primary)',
    },
    {
      id: 'family' as const,
      title: 'Família',
      subtitle: 'Conexão e sincronização',
      icon: <Users size={20} />,
      color: 'var(--color-secondary)',
    },
    {
      id: 'categories' as const,
      title: 'Categorias',
      subtitle: 'Gerencie categorias e subcategorias',
      icon: <Tags size={20} />,
      color: '#ff9500',
    },
    {
      id: 'app' as const,
      title: 'Preferências do App',
      subtitle: 'Tema, moeda e notificações',
      icon: <SlidersHorizontal size={20} />,
      color: '#64d2ff',
    },
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setErrorMsg('');
    setSaved(false);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: name.trim(), profession })
        .eq('id', profileId);
      if (error) throw error;
      setSaved(true);
      await onRefreshProfile();
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  // ── Section navigation ──
  if (active) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="ios-section-action"
            onClick={() => setActive(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}
          >
            <ChevronLeft size={16} /> Voltar
          </button>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {sections.find((s) => s.id === active)?.title}
          </h1>
        </div>

        {active === 'profile' && (
          <>
            <form onSubmit={handleSaveProfile} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Nome de exibição</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de atividade</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  {PROFESSIONS.map((p) => {
                    const isSel = profession === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setProfession(p.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.85rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${isSel ? 'var(--color-primary)' : 'var(--border-color)'}`,
                          background: isSel ? 'var(--color-primary-glow)' : 'transparent',
                          color: isSel ? 'var(--color-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-title)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {p.icon}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', color: 'var(--color-expense)', fontSize: '0.85rem' }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {saved ? <><Check size={16} /> Salvo!</> : <><Save size={16} /> Salvar Perfil</>}
              </button>
            </form>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-expense)', borderColor: 'rgba(244,63,94,0.2)', background: 'var(--color-expense-bg)' }}
            >
              <LogOut size={16} /> Sair da Conta
            </button>
          </>
        )}

        {active === 'family' && (
          <FamilySettings
            familyId={familyId}
            familyName={familyName}
            userId={userId}
            onRefreshFamily={onRefreshFamily}
          />
        )}

        {active === 'categories' && (
          <CategoryManager
            categories={categories}
            familyId={familyId || ''}
            onRefreshCategories={onRefreshCategories}
          />
        )}

        {active === 'app' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Theme */}
            <div className="ios-card">
              <div className="ios-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="ios-list-item-icon" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>
                    {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Aparência</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{theme === 'dark' ? 'Tema escuro' : 'Tema claro'}</div>
                  </div>
                </div>
                <div className="ios-segment" style={{ width: 'auto' }}>
                  <button
                    className={`ios-segment-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark' as ThemeMode)}
                    type="button"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Moon size={14} /> Escuro
                  </button>
                  <button
                    className={`ios-segment-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light' as ThemeMode)}
                    type="button"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Sun size={14} /> Claro
                  </button>
                </div>
              </div>
            </div>

            {/* Currency */}
            <div className="ios-card">
              <div className="ios-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="ios-list-item-icon" style={{ background: 'var(--color-meta-bg)', color: 'var(--color-meta)' }}>
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Moeda</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Usada nos valores do app</div>
                  </div>
                </div>
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '110px' }}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                >
                  <option value="BRL">R$ (BRL)</option>
                  <option value="USD">$ (USD)</option>
                  <option value="EUR">€ (EUR)</option>
                </select>
              </div>
            </div>

            {/* Notifications */}
            <div className="ios-card">
              <div className="ios-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="ios-list-item-icon" style={{ background: notifications ? 'var(--color-primary-glow)' : 'rgba(142,142,147,0.12)', color: notifications ? 'var(--color-primary)' : 'var(--text-tertiary)' }}>
                    {notifications ? <Bell size={18} /> : <BellOff size={18} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notificações</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{notifications ? 'Ativadas' : 'Desativadas'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifications(!notifications)}
                  aria-label="Alternar notificações"
                  style={{
                    width: 50,
                    height: 30,
                    borderRadius: 9999,
                    border: 'none',
                    cursor: 'pointer',
                    padding: 3,
                    background: notifications ? 'var(--color-primary)' : 'rgba(120,120,128,0.32)',
                    transition: 'background var(--transition-fast)',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: notifications ? 23 : 3,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left var(--transition-fast)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Hub (lista de seções) ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Configurações
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Organize seu perfil, família, categorias e preferências do app.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className="ios-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.1rem 1.25rem',
              cursor: 'pointer',
              borderLeft: `3px solid ${s.color}`,
              textAlign: 'left',
            }}
          >
            <div
              className="ios-list-item-icon"
              style={{ background: 'transparent', color: s.color, border: `1px solid ${s.color}30`, width: 40, height: 40 }}
            >
              {s.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.subtitle}</div>
            </div>
            <ChevronRight size={18} color="var(--text-quaternary)" />
          </button>
        ))}
      </div>
    </div>
  );
};
