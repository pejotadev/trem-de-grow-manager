#!/usr/bin/env node

/**
 * GrowControl - Firebase Config Auto-Update
 * 
 * Este script extrai as configurações do Firebase e atualiza automaticamente
 * o arquivo firebaseConfig.ts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'firebase', 'firebaseConfig.ts');

console.log('🌱 GrowControl - Atualizador de Config Firebase\n');

// Check if firebase CLI is available
try {
  execSync('firebase --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Firebase CLI não encontrado!');
  console.error('Instale com: npm install -g firebase-tools\n');
  process.exit(1);
}

// Check if logged in
try {
  execSync('firebase projects:list', { stdio: 'ignore' });
  console.log('✅ Autenticado no Firebase\n');
} catch (error) {
  console.error('❌ Você não está logado no Firebase!');
  console.error('Execute: firebase login\n');
  process.exit(1);
}

// Get current project
let projectId;
try {
  const result = execSync('firebase use', { encoding: 'utf-8' });
  const match = result.match(/Active Project: (.*?) \(/);
  if (match) {
    projectId = match[1];
  } else {
    // Try to get from .firebaserc
    const firebaserc = path.join(__dirname, '.firebaserc');
    if (fs.existsSync(firebaserc)) {
      const config = JSON.parse(fs.readFileSync(firebaserc, 'utf-8'));
      projectId = config.projects?.default;
    }
  }
} catch (error) {
  console.error('⚠️  Nenhum projeto Firebase configurado');
  console.log('\nExecute primeiro:');
  console.log('  ./setup-firebase.sh\n');
  process.exit(1);
}

if (!projectId) {
  console.error('❌ Não foi possível detectar o projeto Firebase');
  console.error('Execute: firebase use <project-id>\n');
  process.exit(1);
}

console.log(`📦 Projeto ativo: ${projectId}\n`);

// Get SDK config
console.log('🔍 Buscando configurações do SDK...\n');

let sdkConfig;
try {
  const output = execSync(`firebase apps:sdkconfig WEB --project ${projectId}`, {
    encoding: 'utf-8',
  });

  // Parse the output to extract config
  const apiKeyMatch = output.match(/apiKey:\s*["']([^"']+)["']/);
  const authDomainMatch = output.match(/authDomain:\s*["']([^"']+)["']/);
  const projectIdMatch = output.match(/projectId:\s*["']([^"']+)["']/);
  const storageBucketMatch = output.match(/storageBucket:\s*["']([^"']+)["']/);
  const messagingSenderIdMatch = output.match(/messagingSenderId:\s*["']([^"']+)["']/);
  const appIdMatch = output.match(/appId:\s*["']([^"']+)["']/);

  if (!apiKeyMatch || !authDomainMatch) {
    throw new Error('Config incompleto');
  }

  sdkConfig = {
    apiKey: apiKeyMatch[1],
    authDomain: authDomainMatch[1],
    projectId: projectIdMatch ? projectIdMatch[1] : projectId,
    storageBucket: storageBucketMatch ? storageBucketMatch[1] : `${projectId}.appspot.com`,
    messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : '',
    appId: appIdMatch ? appIdMatch[1] : '',
  };

  console.log('✅ Configurações obtidas com sucesso!\n');
  console.log('Configuração detectada:');
  console.log(`  API Key: ${sdkConfig.apiKey.substring(0, 20)}...`);
  console.log(`  Auth Domain: ${sdkConfig.authDomain}`);
  console.log(`  Project ID: ${sdkConfig.projectId}`);
  console.log(`  App ID: ${sdkConfig.appId}\n`);

} catch (error) {
  console.error('❌ Erro ao obter configurações do SDK');
  console.error('Certifique-se de que você tem um Web App criado no projeto.\n');
  console.error('Crie um em: https://console.firebase.google.com/project/' + projectId + '/settings/general\n');
  process.exit(1);
}

// Update firebaseConfig.ts
console.log('📝 Atualizando firebase/firebaseConfig.ts...\n');

const newConfigContent = `import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Auto-generated Firebase configuration
// Last updated: ${new Date().toISOString()}
const firebaseConfig = {
  apiKey: "${sdkConfig.apiKey}",
  authDomain: "${sdkConfig.authDomain}",
  projectId: "${sdkConfig.projectId}",
  storageBucket: "${sdkConfig.storageBucket}",
  messagingSenderId: "${sdkConfig.messagingSenderId}",
  appId: "${sdkConfig.appId}"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
`;

// Backup old config
if (fs.existsSync(CONFIG_FILE)) {
  const backup = CONFIG_FILE + '.backup';
  fs.copyFileSync(CONFIG_FILE, backup);
  console.log(`💾 Backup criado: ${backup}`);
}

// Write new config
fs.writeFileSync(CONFIG_FILE, newConfigContent, 'utf-8');

console.log('✅ Arquivo atualizado com sucesso!\n');

console.log('═══════════════════════════════════════════════════');
console.log('🎉 Configuração do Firebase completa!');
console.log('═══════════════════════════════════════════════════\n');

console.log('📋 Próximos passos:\n');

console.log('1. ✅ Arquivo firebase/firebaseConfig.ts atualizado\n');

console.log('2. ⚠️  Habilite Authentication (Email/Password):');
console.log(`   https://console.firebase.google.com/project/${projectId}/authentication/providers\n`);

console.log('3. ⚠️  Crie Firestore Database (Test mode):');
console.log(`   https://console.firebase.google.com/project/${projectId}/firestore\n`);

console.log('4. 🚀 Execute o app:');
console.log('   npx expo start\n');

console.log('═══════════════════════════════════════════════════\n');

