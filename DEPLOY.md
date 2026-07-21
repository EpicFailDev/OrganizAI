# Guia de Implantação Gratuito (Supabase & Oracle Cloud)

Este guia ensina como hospedar o **OrganizAI** de forma 100% gratuita utilizando a nuvem do **Supabase** para banco de dados e autenticação, e a **Oracle Cloud** para hospedar o dashboard web do sistema.

---

## Passo 1: Configuração do Supabase (Banco de Dados e Storage)

Como o Supabase possui um plano gratuito generoso, usaremos a nuvem deles em vez de rodar o Postgres no servidor.

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Crie um novo projeto chamado `OrganizAI`.
3. No menu lateral, acesse **SQL Editor** -> Clique em **New Query**.
4. Copie todo o conteúdo do arquivo de migração `supabase/migrations/20260719000000_initial_schema.sql` e cole no editor.
5. Clique em **Run** para criar todas as tabelas, triggers e RLS.

### Configurar Armazenamento de Comprovantes (Storage)
Para fazer o upload dos recibos pelo celular ou web:
1. No painel do Supabase, acesse **Storage**.
2. Clique em **New Bucket** e nomeie como `attachments`.
3. Marque a opção **Public** (permite visualizar os recibos diretamente via URL pública).
4. No menu lateral de **Storage**, vá em **Policies** para criar políticas de acesso. Execute o seguinte comando SQL no editor SQL para automatizar as permissões:

```sql
-- Políticas para o bucket 'attachments'
create policy "Membros podem inserir comprovantes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');

create policy "Qualquer pessoa logada pode visualizar comprovantes"
  on storage.objects for select to authenticated
  using (bucket_id = 'attachments');

create policy "Membros podem deletar comprovantes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'attachments');
```

---

## Passo 2: Configurando a Instância Gratuita na Oracle Cloud

A Oracle Cloud possui o programa *Always Free* que disponibiliza instâncias virtuais gratuitas vitalícias.

1. Crie uma conta no portal da [Oracle Cloud](https://www.oracle.com/cloud/free/).
2. Acesse **Compute** -> **Instances** -> **Create Instance**.
3. Escolha uma das opções gratuitas:
   * **Instância AMD** (`VM.Standard.E2.1.Micro`, 1GB de RAM, 1 vCPU) - *Disponível em qualquer conta*.
   * **Instância Ampere ARM** (`VM.Standard.A1.Flex`, até 4 vCPUs e 24GB de RAM) - *Recomendado se houver cota na sua região*.
4. Escolha o sistema operacional **Ubuntu Server (versão 22.04 ou 24.04)**.
5. Baixe a sua chave SSH privada (`.key`) para se conectar ao servidor futuramente.
6. Em **Networking**, garanta que a instância possua um **IP Público**.
7. Crie a instância.

### Liberar Portas no Firewall da Oracle
Por padrão, a Oracle bloqueia todo tráfego de entrada.
1. Na página da sua instância, clique na **Subnet** (Rede de nuvem virtual).
2. Clique em **Default Security List**.
3. Adicione uma **Ingress Rule** (Regra de Entrada):
   * **Source CIDR**: `0.0.0.0/0`
   * **IP Protocol**: `TCP`
   * **Destination Port Range**: `80, 443` (para web segura) e `8080` (porta do Docker se quiser testar sem SSL).

---

## Passo 3: Instalando o Docker no Servidor Ubuntu

1. Conecte-se ao seu servidor via SSH:
   ```bash
   ssh -i /caminho/para/sua/chave.key ubuntu@<IP_PUBLICO_DA_ORACLE>
   ```
2. Atualize o sistema e instale o Docker:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install docker.io docker-compose -y
   sudo systemctl start docker
   sudo systemctl enable docker
   ```
3. Permita rodar o Docker sem `sudo` (opcional):
   ```bash
   sudo usermod -aG docker $USER
   # Desconecte e conecte novamente via SSH para aplicar as permissões
   ```

---

## Passo 4: Implantando o React Web com Docker Compose

1. Clone seu repositório no servidor ou envie os arquivos via SCP/FTP:
   ```bash
   git clone <URL_DO_SEU_GITHUB>
   cd OrganizAI
   ```
2. Crie um arquivo `.env` na raiz do projeto com as chaves do seu Supabase (copie as chaves de **Project Settings** -> **API** no Supabase):
   ```bash
   nano .env
   ```
   Cole o seguinte conteúdo com suas chaves reais:
   ```text
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
   ```
3. Suba o container no servidor:
   ```bash
   docker-compose up -d --build
   ```
   Isso compilará a aplicação React e a servirá usando Nginx na porta `8080`. Você já poderá acessar o painel no navegador digitando `http://<IP_PUBLICO_DA_ORACLE>:8080`.

---

## Passo 5: Adicionando SSL Seguro (HTTPS) e Subdomínio Gratuito (Sem custos)

Como você não tem um domínio próprio, use o **DuckDNS** para conseguir um subdomínio `.duckdns.org` de graça apontando para o IP da sua máquina.

1. Acesse [duckdns.org](https://www.duckdns.org), faça login.
2. Adicione um subdomínio (ex: `organizai-familia`).
3. Insira o IP público da sua instância da Oracle Cloud no campo IP e salve. Seu domínio será `organizai-familia.duckdns.org`.

### Configurando HTTPS Seguro (Let's Encrypt + Nginx) no Servidor
Usaremos o **Nginx Proxy Manager** (ferramenta visual) ou o próprio Nginx com Certbot para gerar o certificado SSL automaticamente.
Uma forma rápida com Certbot instalado diretamente no Ubuntu:
1. Instale o Nginx e o Certbot no servidor:
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx -y
   ```
2. Crie um arquivo de configuração de proxy do Nginx para redirecionar a porta 80 do domínio para o nosso Docker local (porta 8080):
   ```bash
   sudo nano /etc/nginx/sites-available/organizai
   ```
   Insira o conteúdo:
   ```nginx
   server {
       listen 80;
       server_name organizai-familia.duckdns.org; # Substitua pelo seu subdomínio

       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Ative a configuração e reinicie o Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/organizai /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```
4. Obtenha o certificado SSL gratuito via Let's Encrypt:
   ```bash
   sudo certbot --nginx -d organizai-familia.duckdns.org
   ```
   Responda às perguntas no terminal. O Certbot configurará automaticamente o HTTPS.
5. Pronto! Agora você e sua esposa podem acessar o controle financeiro de forma segura via `https://organizai-familia.duckdns.org` sem pagar nada por domínio ou servidor.

---

## ⚡ Alternativa de Deploy (Altamente Recomendada): Hospedagem do Web Frontend na Vercel

Se você prefere não gerenciar servidores Linux na Oracle Cloud e quer uma hospedagem rápida, com domínio customizado gratuito (ou próprio) e deploys automáticos a cada `git push`, a **Vercel** é a melhor escolha para o painel web (`apps/web`).

### Passo 1: Importar o Repositório na Vercel
1. Crie uma conta gratuita em [vercel.com](https://vercel.com) (conecte com o seu GitHub).
2. No dashboard da Vercel, clique em **Add New...** -> **Project**.
3. Importe o repositório **OrganizAI**.

### Passo 2: Configurar o Projeto Monorepo
Na tela de importação do projeto, preencha as seguintes opções:
1. **Root Directory**: Clique em **Edit** e selecione a pasta `apps/web`. A Vercel detectará automaticamente que é um projeto Vite.
2. **Build and Output Settings**: Pode manter os padrões detectados:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. **Environment Variables**: Expanda essa seção e adicione as variáveis de ambiente necessárias para o Vite compilar o app conectado ao Supabase:
   - **Key**: `VITE_SUPABASE_URL` | **Value**: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co` (sua URL do Supabase)
   - **Key**: `VITE_SUPABASE_ANON_KEY` | **Value**: `eyJhbGciOiJIUzI1Ni...` (sua chave pública anon)

### Passo 3: Realizar o Deploy
1. Clique em **Deploy**. A Vercel fará o clone, instalará dependências, compilará o React e publicará em menos de 1 minuto.
2. Após a conclusão, você receberá um domínio gratuito do tipo `organizai-web.vercel.app`.

### Passo 4: Configurar Domínio Customizado (Próprio)
Se você possui ou comprou um domínio próprio:
1. No painel do projeto na Vercel, acesse **Settings** -> **Domains**.
2. Insira o domínio que deseja usar (ex: `financeiro.seu-dominio.com` ou `app.seu-dominio.com`) e clique em **Add**.
3. A Vercel exibirá as configurações DNS necessárias:
   - Para um **subdomínio** (ex: `financeiro.seu-dominio.com`), adicione um registro **CNAME** na empresa onde registrou seu domínio apontando para `cname.vercel-dns.com`.
   - Para um **domínio principal** (ex: `seu-dominio.com`), adicione um registro **A** apontando para `76.76.21.21`.
4. Assim que o DNS propagar (normalmente em poucos minutos), a Vercel gerará o certificado SSL (HTTPS) automaticamente e o seu app estará online de forma segura!

---

## 🐳 Alternativa de Deploy: Usando o Coolify na Oracle Cloud VPS (Gerenciamento Completo)

O **Coolify** é um painel autohospedado (uma alternativa ao Heroku/Vercel) que roda na sua própria VPS. Ele cuida do Docker, proxy reverso, geração automática de SSL (HTTPS) Let's Encrypt e deploys automáticos a cada `git push` no GitHub.

### Passo 1: Instalar o Coolify na VPS da Oracle
1. Conecte-se à sua VPS via SSH:
   ```bash
   ssh -i /caminho/sua-chave.key ubuntu@<IP_PUBLICO_DA_ORACLE>
   ```
2. Execute o script de instalação do Coolify:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
3. Aguarde a conclusão da instalação.
4. Acesse o painel de gerenciamento do Coolify pelo seu navegador:
   `http://<IP_PUBLICO_DA_ORACLE>:8000`
5. Crie sua conta de administrador e conclua o assistente inicial.

### Passo 2: Configurar o Domínio no DuckDNS
1. Acesse [duckdns.org](https://www.duckdns.org) e aponte o seu subdomínio (ex: `organizai-familia.duckdns.org`) para o **IP Público** da sua VPS da Oracle.

### Passo 3: Criar a Aplicação no Coolify
1. No painel do Coolify, crie um novo **Project** e um **Environment** (ex: `production`).
2. Adicione um novo recurso: **Add New Resource** -> **Application** -> **GitHub Repository**.
3. Conecte seu perfil do GitHub e selecione o repositório **OrganizAI**.
4. Defina as seguintes opções de configuração do projeto:
   * **Base Directory**: `/apps/web` (para compilar a subpasta correta do frontend).
   * **Build Pack**: Selecione **Nixpacks** (ele detectará automaticamente o Vite/React).
   * **Domains**: Insira o seu domínio completo com HTTPS:
     `https://organizai-familia.duckdns.org`
   * **Environment Variables**: Adicione as variáveis de compilação da sua aplicação:
     * `VITE_SUPABASE_URL` -> Valor da sua URL do Supabase.
     * `VITE_SUPABASE_ANON_KEY` -> Valor da chave pública anon do Supabase.
5. Clique em **Deploy** no topo superior direito.

Pronto! O Coolify baixará o código do GitHub, instalará as dependências, gerará os arquivos estáticos, configurará o redirecionamento de portas e ativará o certificado SSL Let's Encrypt automaticamente. Sempre que você fizer alterações no código e enviar para o GitHub, o Coolify fará o deploy automático!
