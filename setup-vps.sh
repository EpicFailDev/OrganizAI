#!/bin/bash
# ==========================================================
#      OrganizAI - Setup da VPS (Oracle Cloud Free Tier)
# ==========================================================
# Instala e endurece a VPS: Docker Engine + Compose v2,
# UFW, Fail2ban, swap, atualizações automáticas de
# segurança, .env seguro, HTTPS via Certbot.
# Execute: sudo ./setup-vps.sh  (a partir da raiz do repositório)
# ==========================================================

# Encerra o script em caso de qualquer erro
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# 1. Verifica se o script está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, execute este script como root (usando sudo):"
  echo "sudo ./setup-vps.sh"
  exit 1
fi

# 1b. Deve ser executado a partir da raiz do repositório (onde está o docker-compose.yml)
if [ ! -f docker-compose.yml ]; then
  echo "ERRO: execute este script a partir da raiz do repositório OrganizAI (onde está o docker-compose.yml)."
  exit 1
fi

# 2. Coleta as configurações interativamente
echo ""
echo "Por favor, insira as informações de domínio e Supabase:"
read -r -p "Subdomínio do DuckDNS (ex: organizai-familia): " DUCKDNS_SUBDOMAIN
DOMAIN="${DUCKDNS_SUBDOMAIN}.duckdns.org"

read -r -p "Seu e-mail para avisos de expiração do SSL: " SSL_EMAIL

read -r -p "URL do seu Supabase (VITE_SUPABASE_URL): " SUPABASE_URL
read -r -s -p "Chave Anon do seu Supabase (VITE_SUPABASE_ANON_KEY): " SUPABASE_KEY
echo ""
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "ERRO: URL e chave Anon são obrigatórias."
  exit 1
fi

# 3. Atualiza repositórios e instala pacotes essenciais
echo ""
echo "--> 1/8 Atualizando o sistema e instalando Nginx, Certbot, UFW, Fail2ban..."
apt-get update
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades nginx certbot python3-certbot-nginx

# 4. Instala o Docker Engine + Compose v2 a partir do repositório oficial do Docker
echo ""
echo "--> 2/8 Instalando Docker Engine + Compose v2..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Garante que o Docker inicie com o boot
systemctl enable --now docker

# 5. Configura atualizações automáticas de segurança
echo ""
echo "--> 3/8 Configurando atualizações automáticas de segurança (unattended-upgrades)..."
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# 6. Cria swap de 1GB (importante para a instância AMD de 1GB de RAM)
echo ""
echo "--> 4/8 Criando swap de 1GB..."
if [ "$(free -m | awk '/^Swap:/{print $2}')" -lt 512 ]; then
  fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "vm.swappiness=10" > /etc/sysctl.d/99-swap.conf
  sysctl --system >/dev/null
fi

# 7. Configura o firewall UFW (liberar apenas SSH, HTTP e HTTPS)
echo ""
echo "--> 5/8 Configurando firewall UFW..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 8. Configura o Fail2ban (proteção contra força bruta)
echo ""
echo "--> 6/8 Configurando Fail2ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF
systemctl enable --now fail2ban

# 9. Cria o arquivo .env com permissões restritas (600, legível só pelo dono)
echo ""
echo "--> 7/8 Criando arquivo .env (permissão 600)..."
cat > .env <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY
EOF
chmod 600 .env
if [ -n "${SUDO_USER:-}" ]; then
  chown "$SUDO_USER":"$SUDO_USER" .env
fi

# 10. Compila e inicia os containers Docker
echo ""
echo "--> 8/8 Iniciando containers do Docker (pode levar alguns minutos)..."
docker compose down --remove-orphans || true
docker compose up -d --build

# 11. Configura o Proxy Reverso no Nginx (com headers de segurança)
NGINX_CONF="/etc/nginx/sites-available/organizai"

cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    server_tokens off;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Cria o link simbólico para ativar o site e remove a página padrão do Nginx
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true
nginx -t
systemctl reload nginx

# 12. Obtém o certificado SSL gratuitamente via Let's Encrypt (com redirecionamento HTTPS e HSTS)
echo ""
echo "--> Finalizando: gerando o certificado SSL seguro (HTTPS)..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect --hsts
systemctl reload nginx

echo ""
echo "=========================================================="
echo " CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=========================================================="
echo "Seu sistema OrganizAI está online e protegido por SSL em:"
echo "  https://$DOMAIN"
echo ""
echo "Medidas de hardening aplicadas:"
echo "  - Docker Engine + Compose v2 (repositório oficial)"
echo "  - Container web: processo sem root, read-only, limites de recursos e healthcheck"
echo "  - Firewall UFW (apenas SSH, 80 e 443)"
echo "  - Fail2ban ativo (SSH e autenticação nginx)"
echo "  - Swap de 1GB para a instância Free Tier"
echo "  - Atualizações automáticas de segurança"
echo "  - .env com permissão 600"
echo "  - HTTPS com redirecionamento e HSTS (Let's Encrypt)"
echo "=========================================================="
