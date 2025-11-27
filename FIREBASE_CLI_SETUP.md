# 🚀 Setup Automático do Firebase via CLI

Este guia mostra como configurar o Firebase automaticamente usando a CLI.

---

## 📋 Pré-requisitos

✅ **Já instalados:**
- Node.js
- npm
- Firebase CLI (`firebase-tools`)

---

## 🎯 Processo Automático (3 Passos)

### **Passo 1: Login no Firebase** (1 minuto)

Abra seu terminal e execute:

```bash
firebase login
```

Isso vai:
1. Abrir seu navegador
2. Pedir login na sua conta Google
3. Autorizar o Firebase CLI

**Resultado esperado:**
```
✔ Success! Logged in as seu-email@gmail.com
```

---

### **Passo 2: Criar/Selecionar Projeto** (2 minutos)

#### Opção A: Usar projeto existente

Se você já tem um projeto Firebase:

```bash
firebase projects:list
```

Veja seus projetos e escolha um.

#### Opção B: Criar novo projeto

1. Vá para [Firebase Console](https://console.firebase.google.com/)
2. Clique **"Add project"**
3. Nome: `GrowControl` (ou o que preferir)
4. Desabilite Google Analytics (opcional)
5. Clique **"Create project"**
6. Anote o **PROJECT_ID**

---

### **Passo 3: Configuração Automática** (30 segundos)

Execute o script de setup:

```bash
npm run firebase:setup
```

**OU** diretamente:

```bash
./setup-firebase.sh
```

O script vai:
1. ✅ Listar seus projetos Firebase
2. ✅ Pedir para escolher um projeto
3. ✅ Configurar o projeto localmente
4. ✅ Criar um Web App (se necessário)
5. ✅ Fornecer instruções para próximos passos

Depois, execute:

```bash
npm run firebase:config
```

**OU**:

```bash
node update-firebase-config.js
```

Este script vai:
1. ✅ Extrair as configurações do Firebase automaticamente
2. ✅ Atualizar o arquivo `firebase/firebaseConfig.ts`
3. ✅ Criar um backup do arquivo antigo
4. ✅ Mostrar as próximas ações necessárias

---

## 📝 Exemplo de Execução

```bash
# 1. Login
$ firebase login
✔ Success! Logged in as pedro@example.com

# 2. Setup
$ npm run firebase:setup

🌱 GrowControl - Firebase Auto Setup
====================================

✅ Autenticado com sucesso!

📂 Listando seus projetos Firebase:
┌──────────────────────┬────────────────┬─────────────────┐
│ Project Display Name │ Project ID     │ Resource Location │
├──────────────────────┼────────────────┼─────────────────┤
│ GrowControl          │ growcontrol-ab │ us-central       │
└──────────────────────┴────────────────┴─────────────────┘

Escolha uma opção:
1) Usar projeto existente
2) Criar novo projeto

Digite 1 ou 2: 1

Digite o PROJECT_ID do projeto existente: growcontrol-ab

📦 Usando projeto: growcontrol-ab
✅ Projeto configurado!

# 3. Atualizar config automaticamente
$ npm run firebase:config

🌱 GrowControl - Atualizador de Config Firebase

✅ Autenticado no Firebase
📦 Projeto ativo: growcontrol-ab
🔍 Buscando configurações do SDK...

✅ Configurações obtidas com sucesso!

Configuração detectada:
  API Key: AIzaSyBxxxxxxxxxxxxxx...
  Auth Domain: growcontrol-ab.firebaseapp.com
  Project ID: growcontrol-ab
  App ID: 1:123456789012:web:abcdef123456

📝 Atualizando firebase/firebaseConfig.ts...
💾 Backup criado: firebase/firebaseConfig.ts.backup
✅ Arquivo atualizado com sucesso!

🎉 Configuração do Firebase completa!
```

---

## ⚙️ Configurações Finais (Firebase Console)

Após o setup automático, você ainda precisa habilitar manualmente:

### 1. **Authentication** (2 minutos)

```bash
# O script mostrará o link, ou acesse:
https://console.firebase.google.com/project/SEU_PROJECT_ID/authentication/providers
```

Passos:
1. Clique **"Get started"**
2. Aba **"Sign-in method"**
3. Clique em **"Email/Password"**
4. Toggle **"Enable"**
5. Clique **"Save"**

### 2. **Firestore Database** (3 minutos)

```bash
# O script mostrará o link, ou acesse:
https://console.firebase.google.com/project/SEU_PROJECT_ID/firestore
```

Passos:
1. Clique **"Create database"**
2. Selecione **"Start in test mode"** (para desenvolvimento)
3. Escolha a região (ex: `us-central`)
4. Clique **"Enable"**

---

## 🎉 Pronto!

Agora você pode executar o app:

```bash
npx expo start
```

---

## 🔄 Comandos Úteis

### Ver projeto ativo
```bash
firebase use
```

### Trocar de projeto
```bash
firebase use outro-project-id
```

### Listar projetos
```bash
firebase projects:list
```

### Ver apps web do projeto
```bash
firebase apps:list WEB
```

### Ver configuração atual
```bash
firebase apps:sdkconfig WEB
```

### Re-executar configuração automática
```bash
npm run firebase:config
```

---

## 🐛 Troubleshooting

### "Error: Failed to authenticate"
```bash
firebase logout
firebase login
```

### "No project active"
```bash
firebase use <project-id>
```

### "Permission denied"
- Verifique se você tem acesso ao projeto no Firebase Console
- Verifique se você está logado com a conta correta

### Config não atualizou
```bash
# Veja se o backup foi criado
ls -la firebase/firebaseConfig.ts*

# Re-execute manualmente
node update-firebase-config.js
```

### Firestore "Missing or insufficient permissions"
- Certifique-se de criar o Firestore em **Test mode**
- Ou configure as security rules corretamente

---

## 📚 Arquivos Criados

- ✅ `setup-firebase.sh` - Script de setup inicial
- ✅ `update-firebase-config.js` - Script de atualização automática
- ✅ `.firebaserc` - Projeto Firebase ativo (criado automaticamente)
- ✅ `firebase/firebaseConfig.ts.backup` - Backup do config anterior

---

## 🎓 Fluxo Completo

```
┌─────────────────────────────────────┐
│   1. firebase login                 │ ← Manual (abre browser)
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   2. npm run firebase:setup         │ ← Semi-automático (escolhe projeto)
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   3. npm run firebase:config        │ ← Totalmente automático!
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   4. Habilitar Auth no Console      │ ← Manual (2 min)
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   5. Criar Firestore no Console     │ ← Manual (3 min)
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   6. npx expo start                 │ ← Pronto! 🎉
└─────────────────────────────────────┘
```

---

## ✨ Benefícios da Automação

✅ **Antes** (Manual):
- 10-15 minutos
- Copiar/colar configs manualmente
- Risco de erros de digitação

✅ **Agora** (Automático):
- 3-5 minutos
- Configs extraídas automaticamente
- Zero erros de digitação
- Backup automático

---

## 🔐 Segurança

⚠️ **Importante:**
- O arquivo `.firebaserc` contém apenas o PROJECT_ID (pode commitar)
- O arquivo `firebase/firebaseConfig.ts` contém credenciais (já está no `.gitignore`)
- Os backups (`.backup`) também estão no `.gitignore`

**Já configurado para você!** ✅

---

Pronto! Setup Firebase 100% automatizado! 🚀

