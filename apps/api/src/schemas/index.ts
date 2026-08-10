// ----------------------------------------------------
// Barrel dos schemas Zod da API.
//
// Cada domínio vive no seu arquivo; este index centraliza a re-exportação
// para que rotas, libs e testes importem de um único lugar.
// ----------------------------------------------------
export * from './common.js';
export * from './receipt.js';
export * from './transactions.js';
export * from './categories.js';
export * from './family.js';
export * from './budgets.js';
export * from './goals.js';
export * from './planning.js';
export * from './pricing.js';
export * from './products.js';
export * from './sales.js';
export * from './analytics.js';
