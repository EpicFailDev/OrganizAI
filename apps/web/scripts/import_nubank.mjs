import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { parse } from 'csv-parse/sync';

const pdfjs = await import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Defina SUPABASE_URL e SUPABASE_SECRET_KEY no .env');
  process.exit(1);
}

const CSV_DIR = process.env.CSV_DIR || 'C:\\Users\\guilh\\Downloads';

const JENIFER_ACCOUNT = '395957764';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const KNOWN_USERS = [
  { id: 'a0000000-0000-0000-0000-000000000001', email: 'gui@organizai.local', name: 'Guilherme', isAdmin: true },
  { id: 'b0000000-0000-0000-0000-000000000001', email: 'jen@organizai.local', name: 'Jenifer', isAdmin: false },
  { id: '914cb64a-5eb0-4147-872f-3b44421bd9fd', email: 'guiga.c2596@gmail.com', name: 'guilherme', isAdmin: true },
];

// ─── Step 1: Seed profiles, family, categories ───────────────

async function seedData() {
  console.log('\n=== Checking existing profiles...');
  const { data: existingProfiles } = await supabase.from('profiles').select('id');
  const existingIds = new Set((existingProfiles || []).map(p => p.id));

  for (const u of KNOWN_USERS) {
    if (!existingIds.has(u.id)) {
      console.log(`Creating profile for ${u.email} (${u.name})`);
      const { error } = await supabase.from('profiles').insert({
        id: u.id,
        display_name: u.name,
      });
      if (error) console.error(`  Error creating profile: ${error.message}`);
      else console.log(`  Profile created`);
    } else {
      console.log(`Profile exists: ${u.email}`);
    }
  }

  console.log('\n=== Checking family groups...');
  let familyId;
  const { data: families } = await supabase.from('family_groups').select('*');
  if (families && families.length > 0) {
    familyId = families[0].id;
    console.log(`Using existing family: ${families[0].name} (${familyId})`);
  } else {
    console.log('Creating family group "Família"...');
    const { data: newFamily, error: famErr } = await supabase
      .from('family_groups')
      .insert({ name: 'Família' })
      .select('id')
      .single();
    if (famErr) throw new Error(`Error creating family: ${famErr.message}`);
    familyId = newFamily.id;
    console.log(`Family created: ${familyId}`);
  }

  console.log('\n=== Adding family members...');
  const { data: existingMembers } = await supabase
    .from('family_members')
    .select('profile_id');
  const memberIds = new Set((existingMembers || []).map(m => m.profile_id));

  for (const u of KNOWN_USERS) {
    if (!memberIds.has(u.id)) {
      console.log(`Adding ${u.email} to family...`);
      const { error } = await supabase.from('family_members').insert({
        family_id: familyId,
        profile_id: u.id,
        role: u.isAdmin ? 'admin' : 'member',
      });
      if (error) console.error(`  Error: ${error.message}`);
      else console.log(`  Member added`);
    }
  }

  console.log('\n=== Ensuring categories exist...');
  let categories;
  const { data: existingCats } = await supabase.from('categories').select('*');

  const ensureCategories = [
    { name: 'Vendas', type: 'income', color: '#4CAF50', icon: 'storefront' },
    { name: 'Trabalho Gui', type: 'income', color: '#2196F3', icon: 'directions_car' },
    { name: 'Bolsa Familia', type: 'income', color: '#FFEB3B', icon: 'payments' },
    { name: 'Ajuda (Parente)', type: 'income', color: '#9C27B0', icon: 'handshake' },
    { name: 'Alimentacao', type: 'expense', color: '#FF5722', icon: 'local_dining' },
    { name: 'Transporte', type: 'expense', color: '#03A9F4', icon: 'commute' },
    { name: 'Moradia', type: 'expense', color: '#795548', icon: 'home' },
    { name: 'Saude', type: 'expense', color: '#E91E63', icon: 'medical_services' },
    { name: 'Assinaturas', type: 'expense', color: '#607D8B', icon: 'subscriptions' },
    { name: 'Pessoal', type: 'expense', color: '#E91E63', icon: 'person' },
    { name: 'Outros', type: 'expense', color: '#9E9E9E', icon: 'more_horiz' },
    { name: 'Mercado', type: 'expense', color: '#F97316', icon: 'package' },
    { name: 'Uber / 99', type: 'expense', color: '#FCD34D', icon: 'navigation' },
    { name: 'Contas', type: 'expense', color: '#DC2626', icon: 'file-text' },
    { name: 'Lazer', type: 'expense', color: '#38BDF8', icon: 'gamepad' },
    { name: 'Educacao', type: 'expense', color: '#E879F9', icon: 'book' },
    { name: 'Outros (Receita)', type: 'income', color: '#94A3B8', icon: 'more-horizontal' },
  ];

  const existingNames = new Set((existingCats || []).map(c => c.name));
  categories = [...(existingCats || [])];

  for (const cat of ensureCategories) {
    if (!existingNames.has(cat.name)) {
      console.log(`  Creating category: ${cat.name}`);
      const { data: inserted, error: catErr } = await supabase
        .from('categories')
        .insert({ ...cat, family_id: familyId })
        .select()
        .single();
      if (catErr) console.error(`  Error creating ${cat.name}: ${catErr.message}`);
      else categories.push(inserted);
    }
  }

  console.log(`Total: ${categories.length} categories`);

  return { familyId, categories, adminUserId: KNOWN_USERS[0].id };
}

// ─── Step 2: Parse and import CSV files ──────────────────────

function isInternalTransfer(desc, fileName) {
  const lower = desc.toLowerCase();
  const isJeniferAccount = fileName.includes(JENIFER_ACCOUNT);

  // Jenifer's own account: self-transfers and anything with her name = internal
  if (isJeniferAccount && lower.includes('jenifer fernanda rojas')) return true;

  // Jenifer's account: reference to Guilherme = internal (will be captured in Guilherme's side)
  if (isJeniferAccount && lower.includes('guilherme muller de souza')) return true;

  // Guilherme's account: sending TO Jenifer = internal money going out
  if (lower.includes('enviada') && lower.includes('jenifer fernanda rojas')) return true;

  // Guilherme's account: receiving FROM Jenifer = Vendas (don't skip)
  // Guilherme's account: receiving payment from Uber/99/etc = Trabalho Gui (don't skip)

  return false;
}

function guessCategory(desc, type, categories, fileName) {
  const lower = desc.toLowerCase();
  const isJeniferAccount = fileName?.includes(JENIFER_ACCOUNT) || fileName?.endsWith('.pdf');

  if (type === 'income') {
    // Recebido da Jenifer = Vendas (salgados)
    if (lower.includes('jenifer fernanda rojas')) return categories.find(c => c.name === 'Vendas');
    // Guilherme receiving from Uber/99 = Trabalho Gui
    if (lower.includes('uber do brasil') || lower.includes('99 tecnologia')) return categories.find(c => c.name === 'Trabalho Gui');
    if (lower.includes('guilherme muller de souza')) return categories.find(c => c.name === 'Trabalho Gui');
    // Mercado Pago = Vendas
    if (lower.includes('mercado pago')) return categories.find(c => c.name === 'Vendas');
    // Pix recebido in Jenifer's account = Vendas
    if (isJeniferAccount && lower.includes('pix recebido')) return categories.find(c => c.name === 'Vendas');
    if (lower.includes('uber') || lower.includes('99 ')) return categories.find(c => c.name === 'Trabalho Gui');
    if (lower.includes('bolsa familia') || lower.includes('auxilio')) return categories.find(c => c.name === 'Bolsa Familia');
    return categories.find(c => c.name === 'Outros (Receita)') || categories.find(c => c.type === 'income');
  }

  if (lower.includes('ifood') || lower.includes('ifd') || lower.includes('sdb comercio') || lower.includes('big esfiharia')) return categories.find(c => c.name === 'Alimentacao');
  if (lower.includes('atacadao') || lower.includes('assai') || lower.includes('mercado') || lower.includes('super')) return categories.find(c => c.name === 'Mercado');
  if (lower.includes('uber') || lower.includes('99') || lower.includes('gasolina') || lower.includes('posto') || lower.includes('petroradio') || lower.includes('derivados de petroleo')) return categories.find(c => c.name === 'Transporte');
  if (lower.includes('farmacia') || lower.includes('drogasil') || lower.includes('drogaraia') || lower.includes('pague menos')) return categories.find(c => c.name === 'Saude');
  if (lower.includes('deb') || lower.includes('débito') || lower.includes('conta')) return categories.find(c => c.name === 'Contas');
  if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('prime')) return categories.find(c => c.name === 'Assinaturas');
  if (lower.includes('loja 7') || lower.includes('vital') || lower.includes('bone') || lower.includes('personal')) return categories.find(c => c.name === 'Pessoal');
  if (lower.includes('representacoes') || lower.includes('hns')) return categories.find(c => c.name === 'Pessoal');

  return categories.find(c => c.name === 'Outros');
}

async function importCsv(filePath, familyId, categories, profileId) {
  console.log(`\nReading ${filePath}...`);
  const fileName = filePath.split('\\').pop();
  const raw = readFileSync(filePath, { encoding: 'utf-8' });
  const records = parse(raw, {
    columns: true,
    delimiter: ',',
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of records) {
    const desc = (row['Descrição'] || '').trim();
    const rawDate = (row['Data'] || '').trim();
    let rawValue = (row['Valor'] || '').trim();
    if (rawValue.includes(',')) {
      // Brazilian format: 1.234,56 → remove dots, replace comma with dot
      rawValue = rawValue.replace(/\./g, '').replace(',', '.');
    }
    // Standard format: 1234.56 → use as-is
    const identifier = (row['Identificador'] || '').trim();

    if (!desc || !rawDate || !rawValue) { console.log('  Skipping row - missing data:', { desc, rawDate, rawValue }); skipped++; continue; }

    const value = parseFloat(rawValue);
    if (isNaN(value)) { skipped++; continue; }

    if (isInternalTransfer(desc, fileName)) {
      skipped++;
      continue;
    }

    const type = value >= 0 ? 'income' : 'expense';
    const amount = Math.abs(value);
    const [day, month, year] = rawDate.split('/');
    const date = `${year}-${month}-${day}`;

    const category = guessCategory(desc, type, categories, fileName);
    const categoryId = category?.id || null;

    const { error } = await supabase.from('transactions').insert({
      family_id: familyId,
      date,
      description: desc,
      type,
      amount,
      category_id: categoryId,
      created_by: profileId,
    });

    if (error) {
      console.error(`  Error inserting [${desc.slice(0, 40)}]: ${error.message}`);
      errors++;
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors };
}

// ─── Step 3: Parse and import PDF files ──────────────────────

async function extractPdfText(filePath) {
  const buf = readFileSync(filePath);
  const uint8 = new Uint8Array(buf);
  const doc = await pdfjs.getDocument({ data: uint8 }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

function parseMercadoPagoTransactions(text) {
  const txs = [];
  const regex = /(\d{2}-\d{2}-\d{4})\s+(.*?)\s+(\d{9,13})\s+R\$\s*([-\d.]+,\d{2})\s+R\$\s*[-\d.]+,\d{2}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const dateStr = match[1];
    let desc = match[2].replace(/\s+/g, ' ').trim();
    let valueStr = match[4].replace(/\./g, '').replace(',', '.');
    const value = parseFloat(valueStr);

    if (/^(Data|Descrição|ID|Saldo|Período|Agência)/i.test(desc)) continue;
    if (/(Saldo inicial|Saldo final|Entradas|Saídas|DETALHE|EXTRATO|Data de geração|Saldo:|Você tem alguma dúvida|Conte com o nosso|Portal de ajuda|Se deseja falar|0800|Ouvidoria|CNPJ|Encontre nossos)/i.test(desc)) continue;

    const type = value >= 0 ? 'income' : 'expense';
    const lower = desc.toLowerCase();

    // Skip internal Mercado Pago movements (caixinhas/cofrinhos)
    if (lower.includes('dinheiro reservado')) continue;
    if (lower.includes('dinheiro retirado')) continue;
    if (lower.includes('rendimentos')) continue;

    // Skip transfers between Guilherme & Jenifer
    if (lower.includes('guilherme muller de souza')) continue;
    if (lower.includes('pix recebido jenifer fernanda rojas')) continue;
    if (lower.includes('pix enviado jenifer fernanda rojas')) continue;

    const [dd, mm, yyyy] = dateStr.split('-');
    txs.push({ date: `${yyyy}-${mm}-${dd}`, description: desc, type, amount: Math.abs(value) });
  }

  return txs;
}

async function importPdf(filePath, familyId, categories, profileId) {
  const fileName = filePath.split('\\').pop();
  console.log(`\nReading ${fileName}...`);
  const text = await extractPdfText(filePath);
  const txs = parseMercadoPagoTransactions(text);
  let imported = 0, skipped = 0, errors = 0;

  for (const tx of txs) {
    const category = guessCategory(tx.description, tx.type, categories, fileName);
    const categoryId = category?.id || null;
    const { error } = await supabase.from('transactions').insert({
      family_id: familyId,
      date: tx.date,
      description: tx.description,
      type: tx.type,
      amount: tx.amount,
      category_id: categoryId,
      created_by: profileId,
    });
    if (error) {
      if (error.code === '23505') { skipped++; continue; } // duplicate
      console.error(`  Error [${tx.description.slice(0, 40)}]: ${error.message}`);
      errors++;
    } else {
      imported++;
    }
  }

  console.log(`  → ${imported} imported, ${skipped} skipped, ${errors} errors (from ${txs.length} parsed)`);
  return { imported, skipped, errors };
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  try {
    const { familyId, categories, adminUserId } = await seedData();

    console.log('\n=== Cleaning up: removing existing transactions...');
    const { error: delErr } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) console.error(`Cleanup error: ${delErr.message}`);
    else console.log('All transactions removed');

    console.log('\n=== Importing CSV files...');

    const csvFiles = readdirSync(CSV_DIR)
      .filter(f => f.startsWith('NU_') && f.endsWith('.csv'))
      .map(f => `${CSV_DIR}\\${f}`);

    let total = { imported: 0, skipped: 0, errors: 0 };

    for (const file of csvFiles) {
      const result = await importCsv(file, familyId, categories, adminUserId);
      total.imported += result.imported;
      total.skipped += result.skipped;
      total.errors += result.errors;
      console.log(`  → ${result.imported} imported, ${result.skipped} skipped (transfers), ${result.errors} errors`);
    }

    console.log('\n=== Importing PDF files (Mercado Pago - parsed directly)...');
    const pdfFiles = readdirSync(CSV_DIR)
      .filter(f => f.startsWith('pdf_') && f.endsWith('.pdf'))
      .map(f => `${CSV_DIR}\\${f}`);

    for (const file of pdfFiles) {
      const result = await importPdf(file, familyId, categories, adminUserId);
      total.imported += result.imported;
      total.skipped += result.skipped;
      total.errors += result.errors;
    }

    console.log(`\n=== Done! ===`);
    console.log(`Total: ${total.imported} imported, ${total.skipped} skipped, ${total.errors} errors`);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
