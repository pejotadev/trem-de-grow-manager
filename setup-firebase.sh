#!/bin/bash

# GrowControl - Firebase Auto Setup Script
# Este script automatiza a configuração do Firebase

set -e  # Exit on error

echo "🌱 GrowControl - Firebase Auto Setup"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if logged in
echo "📋 Verificando autenticação..."
if ! firebase projects:list &>/dev/null; then
    echo -e "${RED}❌ Você não está logado no Firebase!${NC}"
    echo ""
    echo "Por favor, execute primeiro:"
    echo -e "${YELLOW}firebase login${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Autenticado com sucesso!${NC}"
echo ""

# List existing projects
echo "📂 Listando seus projetos Firebase:"
echo ""
firebase projects:list
echo ""

# Ask for project selection
echo -e "${BLUE}Escolha uma opção:${NC}"
echo "1) Usar projeto existente"
echo "2) Criar novo projeto"
echo ""
read -p "Digite 1 ou 2: " choice

if [ "$choice" == "2" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Nota: Criar projeto via CLI requer billing ativo.${NC}"
    echo "É mais fácil criar o projeto no console web:"
    echo "https://console.firebase.google.com/"
    echo ""
    read -p "Digite o PROJECT_ID do projeto já criado no console: " PROJECT_ID
elif [ "$choice" == "1" ]; then
    echo ""
    read -p "Digite o PROJECT_ID do projeto existente: " PROJECT_ID
else
    echo -e "${RED}Opção inválida!${NC}"
    exit 1
fi

echo ""
echo "📦 Usando projeto: $PROJECT_ID"

# Set project
firebase use "$PROJECT_ID"

echo ""
echo "⚙️  Configurando Firebase SDK..."

# Get Web App config
echo ""
echo "🔍 Buscando apps web no projeto..."

# Try to get existing web app config
WEB_APPS=$(firebase apps:list WEB --project "$PROJECT_ID" 2>/dev/null || echo "")

if [ -z "$WEB_APPS" ] || ! echo "$WEB_APPS" | grep -q "App ID"; then
    echo -e "${YELLOW}Nenhum app web encontrado. Criando um novo...${NC}"
    echo ""
    read -p "Nome do app (ex: GrowControl Web): " APP_NAME
    APP_NAME=${APP_NAME:-"GrowControl Web"}
    
    # Create web app
    firebase apps:create WEB "$APP_NAME" --project "$PROJECT_ID"
    echo ""
    echo -e "${GREEN}✅ App web criado!${NC}"
fi

echo ""
echo "📝 Gerando arquivo de configuração..."
echo ""
echo -e "${YELLOW}Para obter suas credenciais Firebase, execute:${NC}"
echo ""
echo -e "${BLUE}firebase apps:sdkconfig WEB --project $PROJECT_ID${NC}"
echo ""
echo "Ou acesse o Firebase Console:"
echo "https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
echo ""

# Generate config template
cat > firebase-config-template.txt << 'EOF'
Para configurar manualmente, edite firebase/firebaseConfig.ts com:

const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-project-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
EOF

echo ""
echo -e "${GREEN}✅ Setup inicial completo!${NC}"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. ✅ Projeto Firebase configurado: $PROJECT_ID"
echo ""
echo "2. ⚠️  Habilite Authentication (Email/Password):"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
echo ""
echo "3. ⚠️  Crie Firestore Database (Test mode):"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/firestore"
echo ""
echo "4. 📝 Configure as credenciais executando:"
echo -e "   ${BLUE}firebase apps:sdkconfig WEB --project $PROJECT_ID${NC}"
echo ""
echo "   E copie para: firebase/firebaseConfig.ts"
echo ""
echo -e "${GREEN}Ou use o console web para copiar as configs:${NC}"
echo "https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
echo ""

