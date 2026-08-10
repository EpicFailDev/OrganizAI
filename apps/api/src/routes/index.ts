// Barrel das rotas da API, agrupadas por domínio:
//   - infra/operação: health
//   - família: family
//   - finanças: transactions, categories, budgets, goals, planning, analytics
//   - precificação & vendas: ingredients, recipes, products, sales, receipt-items
//   - IA: llms, mcp
export { default as healthApp } from './health.js';
export { default as familyApp } from './family.js';
export * from './finances/index.js';
export * from './pricing/index.js';
export * from './ai/index.js';
