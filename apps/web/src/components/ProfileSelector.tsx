import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2 } from 'lucide-react';

interface ProfileSelectorProps {
  onAuthSuccess: () => void;
}

interface ProfileOption {
  id: string;
  name: string;
  email: string;
  password: string;
  color: string;
  icon: string;
}

const profiles: ProfileOption[] = [
  {
    id: 'gui',
    name: 'Guilherme',
    email: 'gui@organizai.local',
    password: 'OrganizAI2026!',
    color: '#10b981',
    icon: '👨'
  },
  {
    id: 'jen',
    name: 'Jenifer',
    email: 'jen@organizai.local',
    password: 'OrganizAI2026!',
    color: '#8b5cf6',
    icon: '👩'
  }
];

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onAuthSuccess }) => {
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectProfile = async (profile: ProfileOption) => {
    setLoadingProfile(profile.id);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: profile.password,
      });

      if (error) throw error;
      onAuthSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao acessar. Tente novamente.');
    } finally {
      setLoadingProfile(null);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      padding: '1.5rem',
      background: 'radial-gradient(circle at center, #111827 0%, #07090e 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Visual background glowing elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '15%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        filter: 'blur(50px)',
        animation: 'float 6s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '10%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        animation: 'float 8s ease-in-out infinite alternate',
        pointerEvents: 'none'
      }} />

      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '3rem 2.5rem',
        boxShadow: 'var(--shadow-lg), 0 0 40px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 5
      }}>
        {/* Brand Icon Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-primary-glow)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
            width: '54px',
            height: '54px',
            marginBottom: '1rem',
            boxShadow: 'var(--glow-primary)',
            animation: 'float 4s ease-in-out infinite'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 900, marginBottom: '0.45rem', color: '#fff', letterSpacing: '-0.04em' }}>
            Organiz<span style={{ color: 'var(--color-primary)', textShadow: '0 0 12px rgba(16,185,129,0.3)' }}>AI</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '320px', lineHeight: '1.5' }}>
            Quem está usando agora?
          </p>
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
            lineHeight: '1.4',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            {errorMsg}
          </div>
        )}

        {/* Profile Cards */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleSelectProfile(profile)}
              disabled={loadingProfile !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem 1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid rgba(255, 255, 255, 0.08)`,
                borderRadius: 'var(--radius-md)',
                cursor: loadingProfile ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: loadingProfile && loadingProfile !== profile.id ? 0.5 : 1,
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                if (!loadingProfile) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = profile.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 20px ${profile.color}20`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Avatar Circle */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: `${profile.color}15`,
                border: `2px solid ${profile.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                flexShrink: 0
              }}>
                {loadingProfile === profile.id ? (
                  <Loader2 size={24} className="spinner" style={{ color: profile.color }} />
                ) : (
                  profile.icon
                )}
              </div>

              {/* Name and subtitle */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: '0.15rem'
                }}>
                  {profile.name}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  Toque para acessar
                </div>
              </div>

              {/* Arrow indicator */}
              <div style={{
                color: profile.color,
                opacity: loadingProfile === profile.id ? 0 : 0.6,
                transition: 'opacity 0.2s'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer text */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          lineHeight: '1.5'
        }}>
          Dados compartilhados entre os dois perfis
        </div>
      </div>
    </div>
  );
};
