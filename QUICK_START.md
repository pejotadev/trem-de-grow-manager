# ⚡ Quick Start - GrowControl

## 🚀 Setup Rápido (5 minutos)

### Opção 1: Setup Automático via CLI ⭐ (Recomendado)

```bash
# 1. Login no Firebase (abre navegador)
firebase login

# 2. Setup do projeto
npm run firebase:setup

# 3. Configurar automaticamente (extrai e aplica configs)
npm run firebase:config

# 4. Habilitar Auth e Firestore no console (links serão mostrados)

# 5. Rodar o app!
npx expo start
```

**Tempo total: ~5 minutos**

📖 **Guia detalhado**: `FIREBASE_CLI_SETUP.md`

---

### Opção 2: Setup Manual via Console

```bash
# 1. Criar projeto em https://console.firebase.google.com/

# 2. Habilitar Authentication (Email/Password)

# 3. Criar Firestore Database (Test mode)

# 4. Copiar config do projeto

# 5. Colar em firebase/firebaseConfig.ts

# 6. Rodar o app
npx expo start
```

**Tempo total: ~10-15 minutos**

📖 **Guia detalhado**: `SETUP.md`

---

## 📦 O que já está pronto?

✅ Código completo (30+ arquivos)
✅ Dependências instaladas (1,293 packages)
✅ TypeScript configurado
✅ Expo Router configurado
✅ Todos os componentes criados
✅ Sem erros de linting

## ❌ O que falta?

❌ **Apenas configurar Firebase** (5 minutos)

---

## 🎯 Comandos Principais

```bash
# Desenvolvimento
npx expo start          # Iniciar app
npx expo start --web    # Rodar no navegador
npx expo start -c       # Limpar cache

# Firebase CLI
npm run firebase:setup   # Setup projeto Firebase
npm run firebase:config  # Atualizar configs automaticamente
firebase projects:list   # Listar projetos
firebase use <id>        # Trocar projeto

# Utilitários
npm install             # Reinstalar dependências
npm audit fix           # Corrigir vulnerabilidades
```

---

## 📱 Testar o App

1. **Registro**: Criar conta com email/senha
2. **Login**: Entrar com credenciais
3. **Criar Planta**: Adicionar nova planta
4. **Ver Detalhes**: Clicar na planta
5. **Atualizar Stage**: Mudar estágio de crescimento
6. **Logs**: Adicionar watering e environment logs

---

## 🆘 Problemas Comuns

### "Firebase: Error (auth/invalid-api-key)"
❌ Config do Firebase não está correto
✅ Execute: `npm run firebase:config`

### "Permission denied" no Firestore
❌ Firestore não em Test mode
✅ Crie em Test mode: [Link no terminal após setup]

### "Cannot find module"
❌ Dependências não instaladas
✅ Execute: `npm install`

### App não carrega
✅ Execute: `npx expo start -c`

---

## 📚 Documentação

- 📖 `FIREBASE_CLI_SETUP.md` - Setup automático (CLI)
- 📖 `SETUP.md` - Setup manual completo
- 📖 `FIREBASE_SETUP.md` - Detalhes do Firebase
- 📖 `PROJECT_SUMMARY.md` - Visão geral do projeto
- 📖 `README.md` - Documentação principal

---

## 🎉 Pronto!

Depois do setup Firebase, seu app estará 100% funcional!

```bash
npx expo start
```

Pressione:
- `w` para Web
- `i` para iOS
- `a` para Android

**Happy Growing! 🌱**

