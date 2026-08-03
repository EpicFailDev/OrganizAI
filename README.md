# OrganizAI 🪙 (Controle Financeiro Familiar)

O **OrganizAI** é uma solução completa de controle financeiro familiar projetada para ser compartilhada de forma simples e intuitiva entre um casal (você e sua esposa). O projeto está organizado como um **Monorepo** e utiliza tecnologias modernas, focadas em usabilidade e performance, com hospedagem 100% gratuita.

---

## 💻 Estrutura do Monorepo

```text
OrganizAI/
├── apps/
│   └── web/             # Aplicação Web & PWA em React + Vite + Vanilla CSS
├── supabase/            # Modelagem do Banco de Dados
│   └── migrations/      # Migrações SQL e políticas de RLS
├── docker-compose.yml   # Configuração do Docker para implantação no Oracle Cloud
└── DEPLOY.md            # Guia passo a passo de deploy gratuito (Supabase + Oracle Cloud)
```

---

## 🛠️ Tecnologias Utilizadas

* **Banco de Dados & Autenticação**: [Supabase](https://supabase.com) (PostgreSQL com políticas de RLS integradas, Auth e Storage).
* **Aplicação Web & PWA**: [React](https://react.dev) + [Vite](https://vitejs.dev) + TypeScript (Progressive Web App instalável em dispositivos móveis e desktop, estilizado com **Vanilla CSS** e gráficos interativos com **Recharts**).
* **Hospedagem**: Oracle Cloud (Free Tier) e DuckDNS (Subdomínio e SSL gratuito).

---

## 🚀 Como Executar o Projeto Localmente

### 1. Banco de Dados (Supabase)
1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** -> **New Query** no painel do Supabase.
3. Copie o conteúdo de [supabase/migrations/20260719000000_initial_schema.sql](file:///C:/Users/Yumi/Documents/GitHub/OrganizAI/supabase/migrations/20260719000000_initial_schema.sql) e execute.
4. Siga as instruções do arquivo [DEPLOY.md](file:///C:/Users/Yumi/Documents/GitHub/OrganizAI/DEPLOY.md) para configurar o Storage de comprovantes.

---

### 2. Aplicação Web & PWA (React)

A aplicação web PWA está localizada em `apps/web`.

1. Acesse o diretório da aplicação:
   ```bash
   cd apps/web
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` no diretório `apps/web/` e adicione suas chaves do Supabase:
   ```env
   VITE_SUPABASE_URL=https://sua-url-do-supabase.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica-do-supabase
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:5173` no navegador (ou instale como PWA no celular/desktop).

---

## 🛡️ Segurança de Dados Familiar (RLS)

O banco de dados foi configurado com **Políticas de Segurança em Nível de Linha (Row Level Security - RLS)**. Isso garante que:
* Você e sua esposa pertençam a um grupo familiar compartilhado via ID exclusivo.
* Apenas os membros de uma mesma família consigam visualizar, criar ou excluir transações uns dos outros.
* Nenhuma outra pessoa ou família cadastrada no sistema consiga ver as informações financeiras de vocês.
* Os comprovantes no Storage sejam privados e restritos aos participantes do grupo familiar.

---

## 🚢 Hospedagem Gratuita na Nuvem
Para colocar o projeto no ar gratuitamente na Oracle Cloud, siga o guia de implantação detalhado no arquivo **[DEPLOY.md](file:///C:/Users/guilh/OneDrive/Documentos/GitHub/OrganizAI/DEPLOY.md)**.