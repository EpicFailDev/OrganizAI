import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionsList } from './components/TransactionsList';
import { CategoryManager } from './components/CategoryManager';
import { FamilySettings } from './components/FamilySettings';
import { AddTransactionModal } from './components/AddTransactionModal';
import { Loader2, Users } from 'lucide-react';

interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  family_id?: string | null;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  subcategory_id?: string;
  created_by: string;
  attachment_url?: string;
  categories?: { name: string; color?: string };
  subcategories?: { name: string };
  profiles?: { display_name: string };
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // App States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState('dashboard');
  
  // Modals & UI States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // 1. Auth Subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch User Profile and Family Group Info
  const fetchProfileAndFamily = async (userId: string) => {
    try {
      // Get profile
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profError) throw profError;
      setProfile(profData);

      // Get family group link
      const { data: memData, error: memError } = await supabase
        .from('family_members')
        .select('*, family_groups(*)')
        .eq('profile_id', userId)
        .maybeSingle();

      if (memError) throw memError;

      if (memData) {
        setFamilyId(memData.family_id);
        setFamilyName(memData.family_groups?.name || 'Minha Família');
      } else {
        setFamilyId(null);
        setFamilyName('');
      }
    } catch (err: any) {
      console.error('Erro ao buscar perfil/família:', err.message);
    }
  };

  // 3. Fetch categories and transactions
  const fetchFinancialData = async () => {
    if (!session?.user?.id) return;
    setLoadingData(true);

    try {
      // Fetch categories (global + family custom)
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .or(`family_id.is.null,family_id.eq.${familyId || '00000000-0000-0000-0000-000000000000'}`);

      if (catError) throw catError;
      setCategories(catData || []);

      if (familyId) {
        // Fetch transactions for this family
        const { data: transData, error: transError } = await supabase
          .from('transactions')
          .select('*, categories(name, color), subcategories(name), profiles(display_name)')
          .eq('family_id', familyId)
          .order('date', { ascending: false });

        if (transError) throw transError;
        setTransactions(transData || []);
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados financeiros:', err.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Trigger loading details upon login
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfileAndFamily(session.user.id);
    } else {
      setProfile(null);
      setFamilyId(null);
      setFamilyName('');
      setCategories([]);
      setTransactions([]);
    }
  }, [session]);

  // Trigger reloading transactions when familyId changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchFinancialData();
    }
  }, [familyId]);

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchFinancialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir transação.');
    }
  };

  const handleRefreshFamily = async () => {
    if (session?.user?.id) {
      await fetchProfileAndFamily(session.user.id);
    }
  };

  const handleRefreshCategories = async () => {
    await fetchFinancialData();
  };

  if (!authChecked) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        color: '#fff'
      }}>
        <Loader2 size={32} className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        currentView={view}
        setView={setView}
        onLogout={() => setSession(null)}
        onAddTransactionClick={() => setIsAddOpen(true)}
      />

      {/* Main viewport */}
      <main className="main-content">
        {!familyId && view !== 'family' ? (
          /* Empty Family warning block */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            textAlign: 'center',
            gap: '1.5rem',
            padding: '2rem'
          }}>
            <div style={{
              backgroundColor: 'var(--color-primary-glow)',
              color: 'var(--color-primary)',
              padding: '1.5rem',
              borderRadius: '50%'
            }}>
              <Users size={48} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                Conecte sua família!
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', lineHeight: '1.5', fontSize: '0.95rem' }}>
                Para lançar receitas e despesas e compartilhar o saldo com sua esposa, você precisa primeiro criar ou participar de um Grupo Familiar.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setView('family')}>
              Configurar Família
            </button>
          </div>
        ) : (
          /* Active View switch */
          <>
            {loadingData && (
              <div style={{
                position: 'fixed',
                top: '1.5rem',
                right: '1.5rem',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                <Loader2 size={14} className="spinner" /> Atualizando...
              </div>
            )}

            {view === 'dashboard' && (
              <Dashboard 
                transactions={transactions} 
                profileName={profile?.display_name}
              />
            )}

            {view === 'transactions' && (
              <TransactionsList
                transactions={transactions}
                categories={categories}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {view === 'categories' && (
              <CategoryManager
                categories={categories}
                familyId={familyId || ''}
                onRefreshCategories={handleRefreshCategories}
              />
            )}

            {view === 'family' && (
              <FamilySettings
                familyId={familyId}
                familyName={familyName}
                userId={session.user.id}
                onRefreshFamily={handleRefreshFamily}
              />
            )}
          </>
        )}
      </main>

      {/* Add Transaction Modal */}
      {session.user && familyId && (
        <AddTransactionModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          categories={categories}
          familyId={familyId}
          userId={session.user.id}
          onSuccess={fetchFinancialData}
        />
      )}
    </div>
  );
}

export default App;
