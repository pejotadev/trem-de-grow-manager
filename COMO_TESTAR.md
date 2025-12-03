# Como Testar o App GrowControl

## ✅ O que foi feito

### 1. Removido modo guest
- Removidos todos os arquivos relacionados ao modo guest
- App agora usa APENAS Firebase (Firestore + Auth)
- Dados salvos APENAS no Firebase

### 2. Simplificado Firebase Auth
- Configuração simplificada em `firebase/firebaseConfig.ts`
- Usa `getAuth()` diretamente (sem lazy initialization complexa)
- Sem AsyncStorage persistence (funciona em memória)

### 3. Regras do Firestore atualizadas
- Regras de segurança configuradas corretamente
- Requer autenticação para todas as operações
- Usuários só podem ver/editar seus próprios dados

### 4. Usuário já criado
Você já tem um usuário no Firebase:
- Email: `pejotabh@gmail.com`
- Criado em: 26/11/2024

## 🔧 Como testar

### Passo 1: Parar o servidor atual
No terminal onde o Expo está rodando, pressione `Ctrl+C`

### Passo 2: Limpar cache e reiniciar
```bash
cd /Users/pedrosobrinho/code/grow-manager
npx expo start --clear
```

### Passo 3: Fazer login no app
1. Abra o app no Expo Go
2. Use as credenciais:
   - Email: `pejotabh@gmail.com`
   - Senha: (a senha que você usou para criar a conta)

### Passo 4: Criar uma planta
1. Clique em "+ Add New Plant"
2. Preencha os dados
3. Clique em "Create Plant"

### Passo 5: Verificar no Firebase Console
Acesse: https://console.firebase.google.com/project/grow-85028/firestore

Você deve ver:
- Coleção `plants` com a planta criada
- Coleção `stages` com o estágio inicial
- Coleção `users` com seus dados

## 🐛 Se não funcionar

### Se o login falhar:
```bash
# Crie um novo usuário via CLI:
firebase auth:import new-user.json --hash-algo=SCRYPT --hash-key=base64-key --salt-separator=Bw== --rounds=8 --mem-cost=14
```

Ou use a tela de registro no app para criar um novo usuário.

### Se ainda houver erro "Component auth has not been registered yet":

Execute este comando para verificar a versão do Firebase:
```bash
npm list firebase
```

Se for v10.x, o problema é conhecido. Solução:
```bash
npm install firebase@9.23.0 --save --legacy-peer-deps
```

### Se os dados não aparecerem no Firestore:

1. Verifique se você está logado (deve ver seu email no topo da tela)
2. Verifique os logs no terminal após criar uma planta
3. Acesse o console do Firebase e vá em Firestore Database

## 📊 Verificar dados no Firestore

Execute este comando para ver os dados:
```bash
node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyBE1bBhQ4QPOXDg9NFFObJQ7Eqk70xMD-s',
  authDomain: 'grow-85028.firebaseapp.com',
  projectId: 'grow-85028',
  storageBucket: 'grow-85028.firebasestorage.app',
  messagingSenderId: '607775361050',
  appId: '1:607775361050:web:8cd4cec8aa69d9a39929a3'
});

const db = getFirestore(app);

(async () => {
  const snapshot = await getDocs(collection(db, 'plants'));
  console.log('Plants:', snapshot.size);
  snapshot.forEach(doc => console.log('  -', doc.id, doc.data()));
})();
"
```

## 🔐 Credenciais do Firebase

- Project ID: `grow-85028`
- Email do usuário: `pejotabh@gmail.com`
- Console: https://console.firebase.google.com/project/grow-85028

## 📝 Próximos passos

1. **Pare o servidor Expo** (Ctrl+C)
2. **Reinicie com cache limpo**: `npx expo start --clear`
3. **Faça login** com `pejotabh@gmail.com`
4. **Crie uma planta**
5. **Verifique no console do Firebase**

## ⚠️ Importante

- O app agora requer autenticação
- Não há mais modo guest
- Todos os dados são salvos no Firebase
- Se o Firebase Auth não funcionar, precisamos downgrade para Firebase v9






