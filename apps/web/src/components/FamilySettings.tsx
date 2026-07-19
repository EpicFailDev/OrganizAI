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
      // 1. Create group
      const { data: groupData, error: groupError } = await supabase
        .from('family_groups')
        .insert({ name: newFamilyName })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Add current user as admin
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
      // 1. Verify group exists
      const { data: groupData, error: groupError } = await supabase
        .from('family_groups')
        .select('*')
        .eq('id', joinFamilyId)
        .single();

      if (groupError || !groupData) throw new Error('Grupo familiar não encontrado. Verifique o ID.');

      // 2. Insert member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: joinFamilyId,
          profile_id: userId,
          role: 'member'
        });

      if (memberError) throw memberError;

      setSuccessMsg(`Você entrou no grupo familiar "${groupData.name}"!`);
      await onRefreshFamily();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao entrar no grupo familiar.');
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
    if (!window.confirm('Tem certeza que deseja sair do grupo familiar? Você não terá mais acesso às transações compartilhadas.')) return;
    
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
      setSuccessMsg('Você saiu do grupo familiar.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao sair do grupo familiar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
          Família Compartilhada
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Configure a conexão financeira com sua esposa e gerencie os membros
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

      {successMsg && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          color: 'var(--color-income)',
          fontSize: '0.85rem'
        }}>
          {successMsg}
        </div>
      )}

      {!familyId ? (
        /* Setup / Welcome flow */
        <div className="grid-2">
          {/* Create Family */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Plus size={18} color="var(--color-primary)" /> Criar Novo Grupo Familiar
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Crie um novo grupo para centralizar o controle. Você será o administrador e poderá convidar sua esposa compartilhando o ID gerado.
            </p>

            <form onSubmit={handleCreateFamily} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Grupo Familiar</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Família Silva"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                Criar Grupo
              </button>
            </form>
          </div>

          {/* Join Family */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Users size={18} color="var(--color-primary)" /> Participar de um Grupo Existente
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Se sua esposa já configurou o grupo familiar, insira o ID compartilhado por ela para vincular sua conta e começarem a controlar juntos.
            </p>

            <form onSubmit={handleJoinFamily} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ID do Grupo Familiar (UUID)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={joinFamilyId}
                  onChange={(e) => setJoinFamilyId(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-secondary" style={{ width: '100%' }} disabled={loading}>
                Entrar no Grupo
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Family Info Dashboard */
        <div className="grid-2">
          {/* Family Group details */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.25rem' }}>
                {familyName}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Grupo ativo vinculado</p>
            </div>

            {/* Sharing ID card */}
            <div style={{
              backgroundColor: 'rgba(15, 22, 36, 0.8)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Compartilhe o ID para sua esposa participar:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <code style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: 'var(--color-primary)',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}>
                  {familyId}
                </code>
                <button
                  onClick={handleCopyId}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: '#fff',
                    display: 'flex'
                  }}
                >
                  {copied ? <Check size={16} color="var(--color-income)" /> : <Clipboard size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <button 
                onClick={handleLeaveFamily}
                className="btn-secondary" 
                style={{ 
                  width: '100%', 
                  borderColor: 'rgba(244, 63, 94, 0.2)', 
                  color: 'var(--color-expense)'
                }}
              >
                <UserMinus size={16} /> Sair do Grupo Familiar
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
              <Users size={18} color="var(--color-primary)" /> Membros da Família
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {members.map(member => (
                <div 
                  key={member.profile_id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary-glow)',
                      color: 'var(--color-primary)',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem'
                    }}>
                      {(member.profiles?.display_name || 'U').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>
                        {member.profiles?.display_name || 'Usuário'}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Entrou em {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: member.role === 'admin' ? 'var(--color-primary)' : 'var(--text-secondary)',
                    backgroundColor: member.role === 'admin' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.03)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px'
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
