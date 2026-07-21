import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ProfileSelector } from './components/ProfileSelector';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionsList } from './components/TransactionsList';
import { CategoryManager } from './components/CategoryManager';
import { FamilySettings } from './components/FamilySettings';
import { AddTransactionModal } from './components/AddTransactionModal';
import { Orcamentos } from './components/Orcamentos';
import { Metas } from './components/Metas';
import { Planejamento } from './components/Planejamento';
import { Relatorios } from './components/Relatorios';
import { Calendario } from './components/Calendario';
import { Uber99Dashboard } from './components/Uber99Dashboard';
import { Loader2, Users, Menu } from 'lucide-react';

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
  receipt_items?: ReceiptItem[];
}

interface ReceiptItem {
  id: string;
  transaction_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_number?: number;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // App States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState('dashboard');
  
  // Modals & UI States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        // Fetch all members names in the family
        const { data: allMembers, error: allMembersError } = await supabase
          .from('family_members')
          .select('*, profiles(display_name)')
          .eq('family_id', memData.family_id);

        if (!allMembersError && allMembers) {
          const names = allMembers.map(m => m.profiles?.display_name || '').filter(Boolean);
          setFamilyMembers(names);
        }
      } else {
        setFamilyId(null);
        setFamilyName('');
        setFamilyMembers([]);
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

        // Fetch receipt items for all transactions
        const txIds = (transData || []).map(t => t.id);
        let receiptItemsMap: Record<string, ReceiptItem[]> = {};
        if (txIds.length > 0) {
          const { data: receiptData } = await supabase
            .from('receipt_items')
            .select('*')
            .in('transaction_id', txIds)
            .order('line_number', { ascending: true });

          if (receiptData) {
            for (const item of receiptData) {
              const txId = item.transaction_id;
              if (!receiptItemsMap[txId]) receiptItemsMap[txId] = [];
              receiptItemsMap[txId].push(item);
            }
          }
        }

        // Attach receipt items to transactions
        const enrichedTrans = (transData || []).map(t => ({
          ...t,
          receipt_items: receiptItemsMap[t.id] || [],
        }));

        setTransactions(enrichedTrans);
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
      setFamilyMembers([]);
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

  // View state mapper to support preset filters in Sidebar
  const handleViewChange = (newView: string) => {
    if (newView === 'entradas') {
      setView('transactions-entradas');
    } else if (newView === 'saidas') {
      setView('transactions-saidas');
    } else if (newView === 'salgados') {
      setView('transactions-salgados');
    } else if (newView === 'uber99') {
      setView('transactions-uber99');
    } else {
      setView(newView);
    }
  };

  if (!authChecked) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#07090e',
        color: '#fff'
      }}>
        <Loader2 size={36} className="spinner text-primary" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!session) {
    return <ProfileSelector onAuthSuccess={() => {}} />;
  }

  return (
    <div className="app-container">
      {/* Mobile Hamburger menu toggle */}
      <button 
        className="mobile-nav-toggle" 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <Sidebar
        currentView={view}
        setView={handleViewChange}
        onLogout={() => setSession(null)}
        onAddTransactionClick={() => setIsAddOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
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
            padding: '2rem',
            maxWidth: '600px',
            margin: 'auto'
          }} className="glass-card">
            <div style={{
              backgroundColor: 'var(--color-primary-glow)',
              color: 'var(--color-primary)',
              padding: '1.75rem',
              borderRadius: '50%',
              boxShadow: 'var(--glow-primary)',
              animation: 'float 3s ease-in-out infinite'
            }}>
              <Users size={48} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
                Conecte seu amor! 💕
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                Para lançar suas receitas, despesas e compartilhar o saldo com sua esposa, você precisa primeiro criar um Grupo Familiar ou participar de um existente.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setView('family')} style={{ padding: '0.85rem 2rem' }}>
              Configurar Grupo Familiar
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
                backgroundColor: 'rgba(10, 15, 30, 0.85)',
                border: '1px solid var(--border-color)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                backdropFilter: 'blur(8px)'
              }}>
                <Loader2 size={14} className="spinner" style={{ color: 'var(--color-primary)' }} /> Atualizando...
              </div>
            )}

            {view === 'dashboard' && (
              <Dashboard
                transactions={transactions}
                profileName={profile?.display_name}
                familyMembers={familyMembers}
                onNavigate={handleViewChange}
              />
            )}

            {view === 'transactions-uber99' && (
              <Uber99Dashboard transactions={transactions} />
            )}

            {view.startsWith('transactions') && view !== 'transactions-uber99' && (
              <TransactionsList
                key={view}
                transactions={transactions}
                categories={categories}
                onDeleteTransaction={handleDeleteTransaction}
                presetType={
                  view === 'transactions-entradas' ? 'income' :
                  view === 'transactions-saidas' ? 'expense' : 'all'
                }
                presetSearch={
                  view === 'transactions-salgados' ? 'Salgados' : ''
                }
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

            {view === 'orcamentos' && <Orcamentos />}
            {view === 'metas' && <Metas />}
            {view === 'planejamento' && <Planejamento />}
            {view === 'relatorios' && <Relatorios />}
            {view === 'calendario' && <Calendario />}
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
