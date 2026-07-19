import 'package:flutter/material';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'login_screen.dart';
import 'add_transaction_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  bool _loading = true;
  
  // User Data
  Map<String, dynamic>? _profile;
  String? _familyId;
  String _familyName = '';
  
  // Financial Data
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _transactions = [];
  List<Map<String, dynamic>> _members = [];

  final _currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

  @override
  void initState() {
    super.initState();
    _fetchInitialData();
  }

  Future<void> _fetchInitialData() async {
    setState(() => _loading = true);
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    try {
      // 1. Fetch Profile
      final profRes = await Supabase.instance.client
          .from('profiles')
          .select()
          .eq('id', user.id)
          .single();
      _profile = profRes;

      // 2. Fetch Family Link
      final memRes = await Supabase.instance.client
          .from('family_members')
          .select('*, family_groups(*)')
          .eq('profile_id', user.id)
          .maybeSingle();

      if (memRes != null) {
        _familyId = memRes['family_id'];
        _familyName = memRes['family_groups']['name'] ?? 'Minha Família';
        
        // Fetch family members
        final membersRes = await Supabase.instance.client
            .from('family_members')
            .select('*, profiles(*)')
            .eq('family_id', _familyId!);
        _members = List<Map<String, dynamic>>.from(membersRes);
      } else {
        _familyId = null;
        _familyName = '';
        _members = [];
      }

      // 3. Fetch Categories (Global + Custom)
      final catRes = await Supabase.instance.client
          .from('categories')
          .select()
          .or('family_id.is.null,family_id.eq.$_familyId');
      _categories = List<Map<String, dynamic>>.from(catRes);

      // 4. Fetch Transactions (If family exists)
      if (_familyId != null) {
        final transRes = await Supabase.instance.client
            .from('transactions')
            .select('*, categories(*), subcategories(*), profiles(*)')
            .eq('family_id', _familyId!)
            .order('date', ascending: false);
        _transactions = List<Map<String, dynamic>>.from(transRes);
      } else {
        _transactions = [];
      }
    } catch (e) {
      debugPrint('Erro ao carregar dados: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Refresh helper
  Future<void> _refresh() async {
    await _fetchInitialData();
  }

  // Calculate totals
  double get _totalIncome {
    return _transactions
        .where((t) => t['type'] == 'income')
        .fold(0.0, (sum, t) => sum + (t['amount'] as num).toDouble());
  }

  double get _totalExpense {
    return _transactions
        .where((t) => t['type'] == 'expense')
        .fold(0.0, (sum, t) => sum + (t['amount'] as num).toDouble());
  }

  double get _balance => _totalIncome - _totalExpense;

  // Group expenses by category for charts
  List<PieChartSectionData> _getChartSections(double totalExp) {
    if (totalExp == 0) return [];
    
    final Map<String, double> categorySums = {};
    final Map<String, String> categoryColors = {};

    for (var t in _transactions) {
      if (t['type'] == 'expense') {
        final catName = t['categories']?['name'] ?? 'Outros';
        final amount = (t['amount'] as num).toDouble();
        final colorHex = t['categories']?['color'] ?? '#9E9E9E';
        
        categorySums[catName] = (categorySums[catName] ?? 0.0) + amount;
        categoryColors[catName] = colorHex;
      }
    }

    int idx = 0;
    return categorySums.entries.map((entry) {
      final percentage = (entry.value / totalExp) * 100;
      final colorHex = categoryColors[entry.key]!;
      final color = Color(int.parse(colorHex.replaceFirst('#', '0xFF')));
      
      return PieChartSectionData(
        color: color,
        value: entry.value,
        title: '${percentage.toStringAsFixed(0)}%',
        radius: 40,
        titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
      );
    }).toList();
  }

  List<Widget> _getChartKeys() {
    final Map<String, String> categoryColors = {};
    for (var t in _transactions) {
      if (t['type'] == 'expense') {
        final catName = t['categories']?['name'] ?? 'Outros';
        final colorHex = t['categories']?['color'] ?? '#9E9E9E';
        categoryColors[catName] = colorHex;
      }
    }

    return categoryColors.entries.map((entry) {
      final color = Color(int.parse(entry.value.replaceFirst('#', '0xFF')));
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Row(
          children: [
            Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 8),
            Text(entry.key, style: const TextStyle(fontSize: 12, color: Colors.white)),
          ],
        ),
      );
    }).toList();
  }

  // Create Family Group
  Future<void> _createFamily(String name) async {
    if (name.isEmpty) return;
    setState(() => _loading = true);
    try {
      final supabase = Supabase.instance.client;
      final group = await supabase
          .from('family_groups')
          .insert({'name': name})
          .select()
          .single();
      
      await supabase.from('family_members').insert({
        'family_id': group['id'],
        'profile_id': supabase.auth.currentUser!.id,
        'role': 'admin',
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Família criada com sucesso!'), backgroundColor: Colors.emerald),
      );
      await _fetchInitialData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao criar: $e'), backgroundColor: Colors.redAccent),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  // Join Family Group
  Future<void> _joinFamily(String id) async {
    if (id.isEmpty) return;
    setState(() => _loading = true);
    try {
      final supabase = Supabase.instance.client;
      
      final group = await supabase
          .from('family_groups')
          .select()
          .eq('id', id)
          .single();

      await supabase.from('family_members').insert({
        'family_id': group['id'],
        'profile_id': supabase.auth.currentUser!.id,
        'role': 'member',
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Você entrou na família ${group['name']}!'), backgroundColor: Colors.emerald),
      );
      await _fetchInitialData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao entrar: $e'), backgroundColor: Colors.redAccent),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  // Create Custom Category
  Future<void> _createCategory(String name, String type, String colorHex) async {
    if (name.isEmpty || _familyId == null) return;
    try {
      await Supabase.instance.client.from('categories').insert({
        'name': name,
        'type': type,
        'color': colorHex,
        'family_id': _familyId,
        'icon': type == 'income' ? 'payments' : 'shopping_bag',
      });
      await _fetchInitialData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    }
  }

  // Delete Transaction
  Future<void> _deleteTransaction(String id) async {
    try {
      await Supabase.instance.client.from('transactions').delete().eq('id', id);
      await _fetchInitialData();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lançamento excluído!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    }
  }

  // Logout
  Future<void> _logout() async {
    await Supabase.instance.client.auth.signOut();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // Tab Contents
    final List<Widget> tabs = [
      _buildDashboardTab(theme),
      _buildTransactionsTab(theme),
      _buildCategoriesTab(theme),
      _buildFamilyTab(theme),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _currentIndex == 0 ? 'OrganizAI' : 
          _currentIndex == 1 ? 'Lançamentos' : 
          _currentIndex == 2 ? 'Categorias' : 'Família Compartilhada',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
          ),
        ],
      ),
      body: _familyId == null && _currentIndex != 3
          ? _buildNoFamilyWidget(theme)
          : RefreshIndicator(
              onRefresh: _refresh,
              child: tabs[_currentIndex],
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        type: BottomNavigationBarType.fixed,
        backgroundColor: const Color(0xFF0F1624),
        selectedItemColor: theme.primaryColor,
        unselectedItemColor: Colors.white38,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Resumo'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'Lançamentos'),
          BottomNavigationBarItem(icon: Icon(Icons.sell_outlined), label: 'Categorias'),
          BottomNavigationBarItem(icon: Icon(Icons.people_outline), label: 'Família'),
        ],
      ),
      floatingActionButton: _familyId != null
          ? FloatingActionButton(
              backgroundColor: theme.primaryColor,
              onPressed: () async {
                final success = await Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => AddTransactionScreen(
                      categories: _categories,
                      familyId: _familyId!,
                    ),
                  ),
                );
                if (success == true) {
                  _fetchInitialData();
                }
              },
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }

  // --- WIDGET BUILDS ---

  Widget _buildNoFamilyWidget(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: theme.primaryColor.withOpacity(0.5)),
            const SizedBox(height: 16),
            const Text(
              'Conecte sua família!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 8),
            const Text(
              'Para lançar e compartilhar o orçamento com sua esposa, você precisa configurar um grupo familiar.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white54, height: 1.4),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => setState(() => _currentIndex = 3),
              style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              child: const Text('Configurar Família', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  // Tab 1: Dashboard
  Widget _buildDashboardTab(ThemeData theme) {
    final hasExpense = _totalExpense > 0;
    
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Cards
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  'Receitas',
                  _totalIncome,
                  theme.colorScheme.secondary,
                  Icons.trending_up,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildKpiCard(
                  'Despesas',
                  _totalExpense,
                  theme.colorScheme.error,
                  Icons.trending_down,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildKpiCard(
            'Saldo Atual',
            _balance,
            _balance >= 0 ? Colors.white : theme.colorScheme.error,
            Icons.wallet,
            isLarge: true,
          ),
          const SizedBox(height: 24),
          
          // Chart Section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Despesas por Categoria',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 24),
                if (!hasExpense)
                  const SizedBox(
                    height: 150,
                    child: Center(
                      child: Text('Nenhuma despesa para exibir no gráfico.', style: TextStyle(color: Colors.white38)),
                    ),
                  )
                else
                  Row(
                    children: [
                      SizedBox(
                        width: 140,
                        height: 140,
                        child: PieChart(
                          PieChartData(
                            sections: _getChartSections(_totalExpense),
                            centerSpaceRadius: 30,
                            sectionsSpace: 2,
                          ),
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: _getChartKeys(),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String label, double val, Color color, IconData icon, {bool isLarge = false}) {
    final theme = Theme.of(context);
    return Container(
      padding: EdgeInsets.all(isLarge ? 20 : 16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: Colors.white54)),
              Icon(icon, size: 18, color: color),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _currencyFormat.format(val),
            style: TextStyle(
              fontSize: isLarge ? 26 : 20,
              fontWeight: FontWeight.bold,
              color: color,
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
    );
  }

  // Tab 2: Transactions List
  Widget _buildTransactionsTab(ThemeData theme) {
    if (_transactions.isEmpty) {
      return const Center(child: Text('Nenhum lançamento cadastrado.', style: TextStyle(color: Colors.white38)));
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: _transactions.length,
      itemBuilder: (context, idx) {
        final t = _transactions[idx];
        final isIncome = t['type'] == 'income';
        final date = DateTime.parse(t['date']);
        
        return Card(
          color: theme.cardColor,
          margin: const EdgeInsets.bottom(12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Colors.white10),
          ),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isIncome ? theme.colorScheme.secondary.withOpacity(0.1) : theme.colorScheme.error.withOpacity(0.1),
              child: Icon(
                isIncome ? Icons.arrow_upward : Icons.arrow_downward,
                color: isIncome ? theme.colorScheme.secondary : theme.colorScheme.error,
              ),
            ),
            title: Text(t['description'], style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            subtitle: Text(
              '${t['categories']?['name'] ?? 'Sem Categoria'} • ${DateFormat('dd/MM/yyyy').format(date)}',
              style: const TextStyle(fontSize: 12, color: Colors.white54),
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _currencyFormat.format(t['amount']),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isIncome ? theme.colorScheme.secondary : theme.colorScheme.error,
                  ),
                ),
                if (t['attachment_url'] != null) ...[
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.image_outlined, size: 20, color: Colors.blue),
                    onPressed: () => _showReceiptViewer(t['attachment_url']),
                  ),
                ],
                const SizedBox(width: 4),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20, color: Colors.redAccent),
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: const Text('Excluir'),
                        content: const Text('Confirmar exclusão deste lançamento?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
                          TextButton(
                            onPressed: () {
                              Navigator.pop(context);
                              _deleteTransaction(t['id']);
                            },
                            child: const Text('Confirmar'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showReceiptViewer(String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              title: const Text('Comprovante'),
              leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(url, fit: BoxFit.contain),
            ),
          ],
        ),
      ),
    );
  }

  // Tab 3: Categories Manager
  Widget _buildCategoriesTab(ThemeData theme) {
    final globalCats = _categories.where((c) => c['family_id'] == null).toList();
    final customCats = _categories.where((c) => c['family_id'] != null).toList();
    
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        ElevatedButton.icon(
          onPressed: _showCreateCategoryDialog,
          icon: const Icon(Icons.add, color: Colors.white),
          label: const Text('Nova Categoria Customizada', style: TextStyle(color: Colors.white)),
          style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor, padding: const EdgeInsets.symmetric(vertical: 12)),
        ),
        const SizedBox(height: 24),
        const Text('Categorias Padrões', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white54)),
        const SizedBox(height: 8),
        ...globalCats.map((c) => _buildCategoryTile(c, isGlobal: true)),
        const SizedBox(height: 24),
        const Text('Categorias Customizadas', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white54)),
        const SizedBox(height: 8),
        if (customCats.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16.0),
            child: Text('Nenhuma categoria customizada criada.', style: TextStyle(color: Colors.white38, fontSize: 13)),
          )
        else
          ...customCats.map((c) => _buildCategoryTile(c, isGlobal: false)),
      ],
    );
  }

  Widget _buildCategoryTile(Map<String, dynamic> c, {required bool isGlobal}) {
    final hexColor = c['color'] ?? '#9E9E9E';
    final color = Color(int.parse(hexColor.replaceFirst('#', '0xFF')));
    final isIncome = c['type'] == 'income';
    
    return ListTile(
      leading: Container(width: 16, height: 16, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      title: Text(c['name'], style: const TextStyle(color: Colors.white)),
      subtitle: Text(isIncome ? 'Receita' : 'Despesa', style: const TextStyle(fontSize: 12, color: Colors.white38)),
      trailing: !isGlobal
          ? IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
              onPressed: () async {
                if (await _confirmDeleteCategory(c['name'])) {
                  await Supabase.instance.client.from('categories').delete().eq('id', c['id']);
                  _fetchInitialData();
                }
              },
            )
          : null,
    );
  }

  Future<bool> _confirmDeleteCategory(String name) async {
    return await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Excluir Categoria'),
            content: Text('Tem certeza que deseja excluir "$name"? Todos os lançamentos vinculados podem ser afetados.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
              TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirmar')),
            ],
          ),
        ) ??
        false;
  }

  void _showCreateCategoryDialog() {
    final nameCtrl = TextEditingController();
    String type = 'expense';
    String colorHex = '#6366f1';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Nova Categoria'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nome da Categoria'),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: type,
                items: const [
                  DropdownMenuItem(value: 'expense', child: Text('Despesa (Saída)')),
                  DropdownMenuItem(value: 'income', child: Text('Receita (Entrada)')),
                ],
                onChanged: (val) => setDialogState(() => type = val!),
                decoration: const InputDecoration(labelText: 'Tipo'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _createCategory(nameCtrl.text.trim(), type, colorHex);
              },
              child: const Text('Criar'),
            ),
          ],
        ),
      ),
    );
  }

  // Tab 4: Family settings
  Widget _buildFamilyTab(ThemeData theme) {
    final nameCtrl = TextEditingController();
    final idCtrl = TextEditingController();

    if (_familyId == null) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Criar Grupo Familiar',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Para começar um novo controle compartilhado com sua esposa.',
                  style: TextStyle(fontSize: 12, color: Colors.white38),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Nome da Família', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => _createFamily(nameCtrl.text.trim()),
                  style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
                  child: const Text('Criar', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Participar de Grupo Existente',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Se sua esposa já criou o grupo, peça a ela o ID e cole abaixo.',
                  style: TextStyle(fontSize: 12, color: Colors.white38),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: idCtrl,
                  decoration: const InputDecoration(labelText: 'ID do Grupo (UUID)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => _joinFamily(idCtrl.text.trim()),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.transparent, side: BorderSide(color: theme.primaryColor)),
                  child: Text('Entrar', style: TextStyle(color: theme.primaryColor)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 48),
          ElevatedButton.icon(
            onPressed: _logout,
            icon: const Icon(Icons.logout, color: Colors.white),
            label: const Text('Sair da Conta', style: TextStyle(color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent.withOpacity(0.8)),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_familyName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 4),
              const Text('Grupo Familiar Compartilhado', style: TextStyle(fontSize: 12, color: Colors.white38)),
              const SizedBox(height: 16),
              const Text('Compartilhe o ID abaixo com sua esposa:', style: TextStyle(fontSize: 12, color: Colors.white70)),
              const SizedBox(height: 8),
              SelectableText(
                _familyId!,
                style: TextStyle(color: theme.primaryColor, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text('Membros da Família', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white54)),
        const SizedBox(height: 8),
        ..._members.map((m) {
          final isMe = m['profile_id'] == Supabase.instance.client.auth.currentUser!.id;
          final name = m['profiles']?['display_name'] ?? 'Usuário';
          final isAdmin = m['role'] == 'admin';
          
          return ListTile(
            leading: CircleAvatar(child: Text(name.substring(0, 1).toUpperCase())),
            title: Text('$name ${isMe ? '(Eu)' : ''}', style: const TextStyle(color: Colors.white)),
            trailing: Text(isAdmin ? 'Administrador' : 'Membro', style: TextStyle(color: isAdmin ? theme.primaryColor : Colors.white38)),
          );
        }),
        const SizedBox(height: 48),
        ElevatedButton.icon(
          onPressed: _logout,
          icon: const Icon(Icons.logout, color: Colors.white),
          label: const Text('Sair da Conta', style: TextStyle(color: Colors.white)),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent.withOpacity(0.8)),
        ),
      ],
    );
  }
}
