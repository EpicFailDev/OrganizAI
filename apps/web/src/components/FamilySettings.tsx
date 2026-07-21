import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, Shield, Clipboard, Check, UserMinus } from 'lucide-react';

interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface Member {
  family_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  profiles?: Profile;
}

interface FamilySettingsProps {
  familyId: string | null;
  familyName: string;
  userId: string;
  onRefreshFamily: () => Promise<void>;
}

export const FamilySettings: React.FC<FamilySettingsProps> = ({
  familyId,
  familyName,
  userId,
  onRefreshFamily
}) => {
  const [newFamilyName, setNewFamilyName] = useState('');
  const [joinFamilyId, setJoinFamilyId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchMembers = async () => {
    if (!familyId) return;
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*, profiles(*)')
        .eq('family_id', familyId);

      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar membros:', err.message);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [familyId]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Create family group
      const { data: groupData, error: groupError } = await supabase
        .from('family_groups')
        .insert({ name: newFamilyName })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Link current user as administrator of the group
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: groupData.id,
          profile_id: userId,
          role: 'admin'
        });

      if (memberError) throw memberError;

      setSuccessMsg('Grupo familiar criado com sucesso!');
      await onRefreshFamily();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar grupo familiar.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinFamilyId) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Check if family group with given ID exists
      const { data: groupData, error: groupError } = await supabase
        .from('family_groups')
        .select('*')
        .eq('id', joinFamilyId)
        .single();

      if (groupError || !groupData) throw new Error('Grupo familiar não encontrado. Certifique-se de que o ID é válido.');

      // 2. Check if user is already a member of this family
      const { data: checkMember } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', joinFamilyId)
        .eq('profile_id', userId)
        .maybeSingle();

      if (checkMember) throw new Error('Você já faz parte deste grupo familiar.');

      // 3. Link current user as member of family
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: joinFamilyId,
          profile_id: userId,
          role: 'member'
        });

      if (memberError) throw memberError;

      setSuccessMsg(`Você ingressou no grupo familiar "${groupData.name}" com sucesso!`);
      await onRefreshFamily();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao ingressar no grupo familiar.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!familyId) return;
    navigator.clipboard.writeText(familyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveFamily = async () => {
    if (!window.confirm('Deseja realmente se desvincular deste grupo familiar? Você perderá o acesso a todas as transações compartilhadas.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyId)
        .eq('profile_id', userId);

      if (error) throw error;
      
      setMembers([]);
      await onRefreshFamily();
      setSuccessMsg('Você se desvinculou do grupo familiar.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao sair do grupo familiar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>
          Sincronização Familiar
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Conecte a sua conta com a de seu cônjuge para realizar o controle de finanças compartilhado do lar
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
          lineHeight: '1.4'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          color: 'var(--color-income)',
          fontSize: '0.85rem',
          lineHeight: '1.4'
        }}>
          ✓ {successMsg}
        </div>
      )}

      {!familyId ? (
        /* Unlinked flow (Setup) */
        <div className="grid-2">
          {/* Create Family */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Plus size={18} color="var(--color-primary)" /> Criar Grupo do Casal
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Inicie um novo grupo para gerenciar as contas da sua casa. Você será o administrador e poderá gerar o código de convite para compartilhar com sua esposa.
            </p>

            <form onSubmit={handleCreateFamily} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div className="form-group">
                <label className="form-label">Nome do Grupo Financeiro</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Finanças Guilherme & Esposa"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loading}>
                Criar e Ativar Grupo
              </button>
            </form>
          </div>

          {/* Join Family */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Users size={18} color="var(--color-primary)" /> Participar de Grupo Existente
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Se o seu parceiro(a) já criou o grupo familiar, insira o ID único compartilhado para sincronizar suas receitas e despesas instantaneamente.
            </p>

            <form onSubmit={handleJoinFamily} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div className="form-group">
                <label className="form-label">Código de Conexão Familiar (ID do Grupo)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Copie e cole o ID completo (UUID)"
                  value={joinFamilyId}
                  onChange={(e) => setJoinFamilyId(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '0.8rem' }} disabled={loading}>
                Conectar ao Grupo
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Family active Info view */
        <div className="grid-2">
          {/* Family Group detail card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Conexão Financeira Ativa</span>
              <h3 style={{ fontSize: '1.45rem', color: '#fff', marginTop: '0.15rem', fontWeight: 800 }}>
                {familyName}
              </h3>
            </div>

            {/* Sharing ID card block */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.15rem'
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'block' }}>
                Código do Grupo para Conexão de Cônjuge:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
                <code style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.82rem',
                  color: 'var(--color-primary)',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  border: '1px solid rgba(255,255,255,0.03)',
                  fontFamily: 'monospace',
                  fontWeight: 600
                }}>
                  {familyId}
                </code>
                <button
                  onClick={handleCopyId}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '0.65rem',
                    cursor: 'pointer',
                    color: '#fff',
                    display: 'flex',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
                >
                  {copied ? <Check size={16} color="var(--color-income)" /> : <Clipboard size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <button 
                onClick={handleLeaveFamily}
                className="btn-secondary" 
                style={{ 
                  width: '100%', 
                  borderColor: 'rgba(244, 63, 94, 0.15)', 
                  color: 'var(--color-expense)',
                  backgroundColor: 'rgba(244, 63, 94, 0.02)',
                  padding: '0.8rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-expense-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.02)'}
              >
                <UserMinus size={16} /> Desvincular e Sair do Grupo
              </button>
            </div>
          </div>

          {/* Members list card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Users size={18} color="var(--color-primary)" /> Integrantes do Grupo Financeiro
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {members.map(member => (
                <div 
                  key={member.profile_id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.15rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-color)',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary-glow)',
                      color: 'var(--color-primary)',
                      border: '1px solid rgba(16,185,129,0.15)',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem'
                    }}>
                      {(member.profiles?.display_name || 'U').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.92rem', fontWeight: '700', color: '#ffffff' }}>
                        {member.profiles?.display_name || 'Usuário'}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        Ingresso: {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: member.role === 'admin' ? 'var(--color-primary)' : 'var(--text-secondary)',
                    backgroundColor: member.role === 'admin' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid',
                    borderColor: member.role === 'admin' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                    padding: '0.25rem 0.55rem',
                    borderRadius: 'var(--radius-xs)'
                  }}>
                    {member.role === 'admin' && <Shield size={12} />}
                    {member.role === 'admin' ? 'Administrador' : 'Membro'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
