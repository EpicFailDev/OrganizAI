#!/bin/bash

# Encerra o script em caso de qualquer erro
set -e

echo "=========================================================="
echo "      OrganizAI - Setup da VPS (Oracle Cloud Free Tier)   "
echo "=========================================================="

# 1. Verifica se o script está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, execute este script como root (usando sudo):"
  echo "sudo ./setup-vps.sh"
  exit 1
fi

# 2. Coleta as configurações interativamente
echo ""
echo "Por favor, insira as informações de domínio e Supabase:"
read -p "Subdomínio do DuckDNS (ex: organizai-familia): " DUCKDNS_SUBDOMAIN
DOMAIN="${DUCKDNS_SUBDOMAIN}.duckdns.org"

read -p "Seu e-mail para avisos de expiração do SSL: " SSL_EMAIL

read -p "URL do seu Supabase (VITE_SUPABASE_URL): " SUPABASE_URL
read -p "Chave Anon do seu Supabase (VITE_SUPABASE_ANON_KEY): " SUPABASE_KEY

# 3. Atualiza repositórios e instala pacotes essenciais
echo ""
echo "--> 1/5 Atualizando o sistema e instalando Docker, Nginx e Certbot..."
apt-get update
apt-get install -y docker.io docker-compose nginx certbot python3-certbot-nginx

# Garante que os serviços iniciem com o boot do sistema
systemctl start docker
systemctl enable docker
systemctl start nginx
systemctl enable nginx

# 4. Configura as variáveis de ambiente locais do Docker
echo ""
echo "--> 2/5 Criando arquivo .env para o Docker..."
cat <<EOF > .env
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY
EOF

# 5. Compila e inicia os containers Docker
echo ""
echo "--> 3/5 Iniciando containers do Docker (isso pode levar alguns minutos)..."
docker-compose down --remove-orphans || true
docker-compose up -d --build

# 6. Configura o Proxy Reverso no Nginx
echo ""
echo "--> 4/5 Configurando o Nginx para apontar $DOMAIN para o Docker..."
NGINX_CONF="/etc/nginx/sites-available/organizai"

cat <<EOF > $NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Cria o link simbólico para ativar o site e remove a página padrão do Nginx
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true
systemctl restart nginx

# 7. Obtém o certificado SSL gratuitamente via Let's Encrypt
echo ""
echo "--> 5/5 Gerando o certificado SSL seguro (HTTPS)..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $SSL_EMAIL

# Recarrega o Nginx para aplicar o SSL
systemctl reload nginx

echo ""
echo "=========================================================="
echo "🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=========================================================="
echo "Seu sistema OrganizAI está online e protegido por SSL em:"
echo "👉 https://$DOMAIN"
echo "=========================================================="
