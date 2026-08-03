import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { supabase, cachedQuery } from './supabaseClient';
import { ProfileSelector } from './components/ProfileSelector';
import { Sidebar } from './components/Sidebar';
import { MobileTabBar } from './components/MobileTabBar';
import { MobileHeader } from './components/MobileHeader';
import { Loader2, Users, Menu } from 'lucide-react';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Onboarding, isOnboardingComplete } from './components/Onboarding';

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const TransactionsList = lazy(() => import('./components/TransactionsList').then(m => ({ default: m.TransactionsList })));
const CategoryManager = lazy(() => import('./components/CategoryManager').then(m => ({ default: m.CategoryManager })));
const FamilySettings = lazy(() => import('./components/FamilySettings').then(m => ({ default: m.FamilySettings })));
const AddTransactionModal = lazy(() => import('./components/AddTransactionModal').then(m => ({ default: m.AddTransactionModal })));
const Orcamentos = lazy(() => import('./components/Orcamentos').then(m => ({ default: m.Orcamentos })));
const Metas = lazy(() => import('./components/Metas').then(m => ({ default: m.Metas })));
const Planejamento = lazy(() => import('./components/Planejamento').then(m => ({ default: m.Planejamento })));
const Relatorios = lazy(() => import('./components/Relatorios').then(m => ({ default: m.Relatorios })));
const Calendario = lazy(() => import('./components/Calendario').then(m => ({ default: m.Calendario })));
const Uber99Dashboard = lazy(() => import('./components/Uber99Dashboard').then(m => ({ default: m.Uber99Dashboard })));

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
  time?: string;
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

function LoadingSkeleton() {
  return (
    <div className="ios-loading">
      <div className="ios-spinner" />
    </div>
  );
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState('dashboard');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      setAuthChecked(true);

      // Show onboarding only for authenticated first-time users
      if (!isOnboardingComplete()) {
        setShowOnboarding(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndFamily = useCallback(async (userId: string) => {
    try {
      const { data: profData, error: profError } = await cachedQuery<Profile>(
        `profile:${userId}`,
        () => supabase.from('profiles').select('*').eq('id', userId).single(),
        60000
      );
      if (profError) throw profError;
      if (profData) setProfile(profData);

      const { data: memData, error: memError } = await supabase
        .from('family_members')
        .select('*, family_groups(*)')
        .eq('profile_id', userId)
        .maybeSingle();

      if (memError) throw memError;

      if (memData) {
        setFamilyId(memData.family_id);
        setFamilyName(memData.family_groups?.name || 'Minha Família');

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
  }, []);

  const fetchFinancialData = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoadingData(true);

    try {
      const { data: catData, error: catError } = await cachedQuery<Category[]>(
        `categories:${familyId || 'global'}`,
        () => supabase
          .from('categories')
          .select('*')
          .or(`family_id.is.null,family_id.eq.${familyId || '00000000-0000-0000-0000-000000000000'}`),
        30000
      );
      if (catError) throw catError;
      if (catData) setCategories(catData);

      if (familyId) {
        const { data: transData, error: transError } = await cachedQuery<any[]>(
          `transactions:${familyId}`,
          () => supabase
            .from('transactions')
            .select('*, categories(name, color), subcategories(name), profiles(display_name)')
            .eq('family_id', familyId)
            .order('date', { ascending: false })
            .limit(200),
          15000
        );

        if (transError) throw transError;

        const txIds = (transData || []).map((t: any) => t.id);
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

        const enrichedTrans = (transData || []).map((t: any) => ({
          ...t,
          receipt_items: receiptItemsMap[t.id] || [],
        }));

        setTransactions(enrichedTrans as Transaction[]);
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados financeiros:', err.message);
    } finally {
      setLoadingData(false);
    }
  }, [session?.user?.id, familyId]);

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
  }, [session, fetchProfileAndFamily]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchFinancialData();
    }
  }, [familyId, fetchFinancialData]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      await fetchFinancialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir transação.');
    }
  }, [fetchFinancialData]);

  const handleUpdateTransaction = useCallback(async (id: string, updates: {
    date: string; time?: string; description: string;
    type: 'income' | 'expense'; amount: number;
    category_id: string; subcategory_id?: string | null;
  }) => {
    const { error } = await supabase.from('transactions').update(updates).eq('id', id);
    if (error) throw error;
    await fetchFinancialData();
  }, [fetchFinancialData]);

  const handleRefreshFamily = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfileAndFamily(session.user.id);
    }
  }, [session?.user?.id, fetchProfileAndFamily]);

  const handleRefreshCategories = useCallback(async () => {
    await fetchFinancialData();
  }, [fetchFinancialData]);

  const handleViewChange = useCallback((newView: string) => {
    if (newView === 'entradas') setView('transactions-entradas');
    else if (newView === 'saidas') setView('transactions-saidas');
    else if (newView === 'salgados') setView('transactions-salgados');
    else if (newView === 'uber99') setView('transactions-uber99');
    else setView(newView);
  }, []);

  // Determine mobile header title
  const getHeaderTitle = () => {
    switch (view) {
      case 'dashboard': return 'OrganizAI';
      case 'transactions': return 'Extrato';
      case 'transactions-entradas': return 'Entradas';
      case 'transactions-saidas': return 'Saídas';
      case 'transactions-salgados': return 'Salgados';
      case 'transactions-uber99': return 'Uber / 99';
      case 'categories': return 'Configurações';
      case 'family': return 'Família';
      case 'orcamentos': return 'Orçamentos';
      case 'metas': return 'Metas';
      case 'planejamento': return 'Planejamento';
      case 'relatorios': return 'Relatórios';
      case 'calendario': return 'Calendário';
      default: return 'OrganizAI';
    }
  };

  const getHeaderSubtitle = () => {
    if (view === 'dashboard') return familyName || 'Controle financeiro familiar';
    if (view === 'transactions' || view.startsWith('transactions-')) return familyName;
    return undefined;
  };

  const renderView = () => {
    if (!familyId && view !== 'family') {
      return (
        <div className="ios-empty">
          <div className="ios-empty-icon">
            <Users size={28} />
          </div>
          <h3 className="ios-empty-title">Conecte seu amor!</h3>
          <p className="ios-empty-desc">
            Para lançar suas receitas e despesas, você precisa criar um Grupo Familiar ou participar de um existente.
          </p>
          <button
            className="ios-btn ios-btn-primary"
            style={{ maxWidth: '280px', marginTop: '0.5rem' }}
            onClick={() => handleViewChange('family')}
          >
            Configurar Grupo Familiar
          </button>
        </div>
      );
    }

    return (
      <Suspense fallback={<LoadingSkeleton />}>
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
            onUpdateTransaction={handleUpdateTransaction}
            familyId={familyId || ''}
            userId={session.user.id}
            presetType={
              view === 'transactions-entradas' ? 'income' :
              view === 'transactions-saidas' ? 'expense' : 'all'
            }
            presetSearch={view === 'transactions-salgados' ? 'Salgados' : ''}
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
        {view === 'orcamentos' && (
          <Orcamentos familyId={familyId || ''} categories={categories} transactions={transactions} />
        )}
        {view === 'metas' && <Metas familyId={familyId || ''} />}
        {view === 'planejamento' && (
          <Planejamento familyId={familyId || ''} categories={categories} userId={session.user.id} />
        )}
        {view === 'relatorios' && (
          <Relatorios transactions={transactions} categories={categories} />
        )}
        {view === 'calendario' && (
          <Calendario
            transactions={transactions}
            categories={categories}
            familyId={familyId || ''}
            userId={session.user.id}
            onRefresh={fetchFinancialData}
          />
        )}
      </Suspense>
    );
  };

  if (!authChecked) {
    return (
      <div className="ios-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="ios-spinner" />
      </div>
    );
  }

  if (!session) {
    return <ProfileSelector onAuthSuccess={() => {}} />;
  }

  return (
    <div className="ios-app">
      {/* Mobile Header (visible on mobile only via CSS) */}
      <MobileHeader
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        onSettingsClick={() => handleViewChange('categories')}
      />

      {/* Desktop Sidebar (hidden on mobile via CSS) */}
      <Sidebar
        currentView={view}
        setView={handleViewChange}
        onLogout={() => setSession(null)}
        onAddTransactionClick={() => setIsAddOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Loading indicator */}
      {loadingData && (
        <div style={{
          position: 'fixed', top: 'calc(var(--safe-top, 0px) + 0.75rem)', right: '1rem', zIndex: 500,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(28, 28, 30, 0.9)', backdropFilter: 'blur(12px)',
          padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-full)',
          fontSize: '0.72rem', color: 'var(--text-secondary)',
          border: '0.5px solid var(--separator)',
        }}>
          <div className="ios-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          Atualizando...
        </div>
      )}

      {/* Main scrollable content */}
      <main className="ios-content">
        <div className="ios-content-inner stagger">
          {renderView()}
        </div>
      </main>

      {/* iOS Bottom Tab Bar */}
      <MobileTabBar
        currentView={view}
        setView={handleViewChange}
        onAddTransactionClick={() => setIsAddOpen(true)}
      />

      {/* Add Transaction Modal (iOS Sheet style) */}
      {session.user && familyId && (
        <Suspense fallback={null}>
          <AddTransactionModal
            isOpen={isAddOpen}
            onClose={() => setIsAddOpen(false)}
            categories={categories}
            familyId={familyId}
            userId={session.user.id}
            onSuccess={fetchFinancialData}
          />
        </Suspense>
      )}
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Onboarding */}
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}

export default App;
