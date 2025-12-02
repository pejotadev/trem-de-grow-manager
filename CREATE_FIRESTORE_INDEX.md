# 🔥 Criar Índice do Firestore

## ⚠️ Ação Necessária

O Firestore precisa de um índice composto para a query de plantas. 

## 🔗 Link Direto

**Clique neste link para criar o índice automaticamente:**

https://console.firebase.google.com/v1/r/project/grow-85028/firestore/indexes?create_composite=Cklwcm9qZWN0cy9ncm93LTg1MDI4L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wbGFudHMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJc3RhcnREYXRlEAIaDAoIX19uYW1lX18QAg

## 📝 O que fazer:

1. **Clique no link acima**
2. **Faça login** no Firebase Console (se necessário)
3. **Clique em "Create Index"** ou "Criar Índice"
4. **Aguarde** 1-2 minutos para o índice ser criado
5. **Recarregue o app** (press 'r' no terminal Expo)

## 🎯 Detalhes do Índice

**Coleção**: `plants`
**Campos**:
- `userId` (Ascending)
- `startDate` (Descending)

Este índice é necessário para a query que busca plantas do usuário ordenadas por data.

## ✅ Após Criar

Depois que o índice for criado, o erro desaparecerá e você poderá ver suas plantas!






