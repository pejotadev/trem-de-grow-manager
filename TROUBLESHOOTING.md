# 🔧 Troubleshooting - Erro "Could not connect"

## ❌ Erro: "Unknown error could not connect"

Este erro acontece quando o Expo Go no celular não consegue se conectar ao servidor Metro Bundler.

---

## ✅ Soluções (Tente nesta ordem)

### **1. Verificar Rede WiFi** ⭐ (Mais Comum)

**Problema**: Celular e computador em redes diferentes

**Solução**:
- ✅ Certifique-se que **ambos estão na mesma rede WiFi**
- ✅ Desabilite **VPN** se estiver usando
- ✅ Desabilite **Hotspot** no celular
- ✅ Verifique se não está usando **dados móveis**

**Teste rápido**:
```bash
# No terminal, veja o IP do seu Mac:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Deve mostrar algo como: 192.168.x.x
# No Expo Go, o QR code deve ter o mesmo IP
```

---

### **2. Reiniciar Servidor com Cache Limpo**

```bash
# Parar servidor atual (Ctrl+C no terminal)
# Depois execute:
cd /Users/pedrosobrinho/code/grow-manager
rm -rf .expo node_modules/.cache
npx expo start --clear
```

---

### **3. Verificar Firewall**

**macOS**:
1. System Settings > Network > Firewall
2. Certifique-se que **Expo** ou **Node** está permitido
3. Ou desabilite temporariamente para testar

**Teste rápido**:
```bash
# Verificar se porta 8081 está acessível
curl http://localhost:8081
# Se retornar HTML, está funcionando
```

---

### **4. Usar Tunnel (Último Recurso)**

Se nada funcionar, use o modo tunnel:

```bash
npx expo start --tunnel
```

**Nota**: Pode ser mais lento, mas funciona mesmo em redes diferentes.

---

### **5. Verificar IP no QR Code**

O QR code deve mostrar:
```
exp://192.168.15.157:8081
```

Se mostrar `localhost` ou `127.0.0.1`, o problema é a rede.

**Forçar IP específico**:
```bash
npx expo start --host tunnel
# ou
npx expo start --host lan
```

---

### **6. Reiniciar Expo Go**

1. Feche o **Expo Go** completamente
2. Reabra o app
3. Escaneie o QR code novamente

---

### **7. Verificar Porta 8081**

```bash
# Ver se porta está em uso
lsof -ti:8081

# Se retornar um número, a porta está ocupada
# Mate o processo:
kill -9 $(lsof -ti:8081)
```

---

## 🔍 Diagnóstico Passo a Passo

### **Passo 1: Servidor está rodando?**

No terminal onde você rodou `npx expo start`, você deve ver:
```
› Metro waiting on exp://192.168.x.x:8081
```

Se não aparecer, o servidor não está rodando.

### **Passo 2: IP está correto?**

```bash
# Seu IP atual:
ifconfig | grep "inet " | grep -v 127.0.0.1
```

O IP no QR code deve ser o mesmo.

### **Passo 3: Mesma rede?**

- Mac: WiFi "Nome da Rede"
- iPhone: WiFi "Nome da Rede"

Devem ser **exatamente iguais**.

### **Passo 4: Firewall bloqueando?**

Teste no celular:
```
http://192.168.15.157:8081
```

Se não abrir, firewall está bloqueando.

---

## 🚀 Solução Rápida (Copy-Paste)

```bash
# 1. Parar tudo
pkill -f "expo start"
pkill -f "node.*expo"

# 2. Limpar cache
cd /Users/pedrosobrinho/code/grow-manager
rm -rf .expo node_modules/.cache

# 3. Reiniciar limpo
npx expo start --clear
```

---

## 📱 Teste no Celular

1. Abra **Expo Go**
2. Toque em **"Enter URL manually"**
3. Digite: `exp://192.168.15.157:8081`
4. Toque **"Connect"**

Se funcionar, o problema era o QR code. Se não funcionar, é rede/firewall.

---

## 🌐 Alternativa: Usar Tunnel

Se nada funcionar, use tunnel (funciona em qualquer rede):

```bash
npx expo start --tunnel
```

**Vantagens**:
- ✅ Funciona mesmo em redes diferentes
- ✅ Funciona com VPN
- ✅ Funciona com dados móveis

**Desvantagens**:
- ⚠️ Mais lento
- ⚠️ Requer internet estável

---

## 🔥 Comandos Úteis

```bash
# Ver processos do Expo
ps aux | grep expo

# Matar todos processos Expo
pkill -f expo

# Ver porta 8081
lsof -i :8081

# Limpar tudo
rm -rf .expo node_modules/.cache .metro

# Reiniciar
npx expo start --clear
```

---

## ✅ Checklist de Verificação

- [ ] Mac e iPhone na mesma rede WiFi
- [ ] VPN desabilitada
- [ ] Firewall permitindo Expo/Node
- [ ] Servidor Expo rodando (porta 8081)
- [ ] IP no QR code correto (192.168.x.x)
- [ ] Expo Go fechado e reaberto
- [ ] Cache limpo

---

## 🆘 Se Nada Funcionar

1. **Use Tunnel Mode**:
   ```bash
   npx expo start --tunnel
   ```

2. **Use iOS Simulator** (se tiver Xcode):
   ```bash
   npx expo start --ios
   ```

3. **Use Web Browser**:
   ```bash
   npx expo start --web
   ```

---

## 📞 Informações para Debug

**Seu IP atual**: `192.168.15.157`
**Porta padrão**: `8081`
**URL esperada**: `exp://192.168.15.157:8081`

---

**Boa sorte! 🌱**

