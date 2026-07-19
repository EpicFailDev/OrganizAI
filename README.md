# OrganizAI 🪙 (Controle Financeiro Familiar)

O **OrganizAI** é uma solução completa de controle financeiro familiar projetada para ser compartilhada de forma simples e intuitiva entre um casal (você e sua esposa). O projeto está organizado como um **Monorepo** e utiliza tecnologias modernas, focadas em usabilidade e performance, com hospedagem 100% gratuita.

---

## 💻 Estrutura do Monorepo

```text
OrganizAI/
├── apps/
│   ├── mobile/          # Aplicativo Mobile em Flutter (Ideal para lançamentos rápidos)
│   └── web/             # Dashboard Web em React + Vite + Vanilla CSS (Ideal para relatórios)
├── supabase/            # Modelagem do Banco de Dados
│   └── migrations/      # Migrações SQL e políticas de RLS
├── docker-compose.yml   # Configuração do Docker para implantação no Oracle Cloud
└── DEPLOY.md            # Guia passo a passo de deploy gratuito (Supabase + Oracle Cloud)
```

---

## 🛠️ Tecnologias Utilizadas

* **Banco de Dados & Autenticação**: [Supabase](https://supabase.com) (PostgreSQL com políticas de RLS integradas, Auth e Storage).
* **Painel Web**: [React](https://react.dev) + [Vite](https://vitejs.dev) + TypeScript (Estilizado de forma customizada com **Vanilla CSS** e gráficos interativos com **Recharts**).
* **Aplicativo Mobile**: [Flutter](https://flutter.dev) (Integrado com `image_picker` para anexar comprovantes e `fl_chart` para resumos visuais).
* **Hospedagem**: Oracle Cloud (Free Tier) e DuckDNS (Subdomínio e SSL gratuito).

---

## 🚀 Como Executar o Projeto Localmente

### 1. Banco de Dados (Supabase)
1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** -> **New Query** no painel do Supabase.
3. Copie o conteúdo de [supabase/migrations/20260719000000_initial_schema.sql](file:///C:/Users/guilh/OneDrive/Documentos/GitHub/OrganizAI/supabase/migrations/20260719000000_initial_schema.sql) e execute.
4. Siga as instruções do arquivo [DEPLOY.md](file:///C:/Users/guilh/OneDrive/Documentos/GitHub/OrganizAI/DEPLOY.md) para configurar o Storage de comprovantes.

---

### 2. Frontend Web (React)

O dashboard web está localizado em `apps/web`.

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
5. Acesse `http://localhost:5173` no navegador.

---

### 3. Aplicativo Mobile (Flutter)

O aplicativo mobile está localizado em `apps/mobile`. Ele já vem configurado com as dependências do `supabase_flutter` e gerenciamento de uploads de fotos.

#### Pré-requisitos
* Ter o Flutter SDK instalado na máquina (caso queira compilar localmente).
* Um dispositivo móvel conectado ou emulador configurado.

#### Configuração das Chaves do Supabase
Substitua no arquivo [apps/mobile/lib/main.dart](file:///C:/Users/guilh/OneDrive/Documentos/GitHub/OrganizAI/apps/mobile/lib/main.dart#L10-L11) as seguintes strings pelos dados de conexão do seu projeto Supabase:
* `YOUR_SUPABASE_URL` -> URL do seu projeto.
* `YOUR_SUPABASE_ANON_KEY` -> Chave Anon pública do projeto.

#### Executando o App
1. Acesse o diretório do aplicativo:
   ```bash
   cd apps/mobile
   ```
2. Baixe os pacotes:
   ```bash
   flutter pub get
   ```
3. Execute o aplicativo:
   ```bash
   flutter run
   ```

#### Permissões de Câmera/Galeria
* **Android**: O aplicativo utiliza o `image_picker`. Para dispositivos mais antigos, certifique-se de configurar as permissões no seu `AndroidManifest.xml` se necessário.
* **iOS**: Adicione as seguintes chaves de permissão no arquivo `ios/Runner/Info.plist`:
  * `NSCameraUsageDescription` (Para tirar fotos dos recibos)
  * `NSPhotoLibraryUsageDescription` (Para selecionar fotos de comprovantes da galeria)

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