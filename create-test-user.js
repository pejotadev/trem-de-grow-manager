const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBE1bBhQ4QPOXDg9NFFObJQ7Eqk70xMD-s",
  authDomain: "grow-85028.firebaseapp.com",
  projectId: "grow-85028",
  storageBucket: "grow-85028.firebasestorage.app",
  messagingSenderId: "607775361050",
  appId: "1:607775361050:web:8cd4cec8aa69d9a39929a3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createTestUser() {
  console.log('🔥 Criando usuário de teste...\n');
  
  const testEmail = 'test@growcontrol.com';
  const testPassword = 'test123456';
  
  try {
    console.log('📧 Email:', testEmail);
    console.log('🔑 Senha:', testPassword);
    console.log('');
    
    // Create user
    console.log('1️⃣ Criando usuário no Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Usuário criado com sucesso!');
    console.log('   User ID:', userCredential.user.uid);
    console.log('');
    
    // Save user data to Firestore
    console.log('2️⃣ Salvando dados do usuário no Firestore...');
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: testEmail,
      createdAt: Date.now()
    });
    console.log('✅ Dados salvos no Firestore!');
    console.log('');
    
    console.log('✅ Usuário de teste criado com sucesso!');
    console.log('');
    console.log('📝 Use estas credenciais no app:');
    console.log('   Email:', testEmail);
    console.log('   Senha:', testPassword);
    console.log('');
    console.log('🌐 Console: https://console.firebase.google.com/project/grow-85028/authentication/users');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ Usuário já existe!');
      console.log('');
      console.log('📝 Use estas credenciais no app:');
      console.log('   Email:', testEmail);
      console.log('   Senha:', testPassword);
      console.log('');
      console.log('💡 Se esqueceu a senha, delete o usuário no console do Firebase e execute este script novamente.');
      process.exit(0);
    }
    
    console.error('❌ Erro ao criar usuário:', error.code, '-', error.message);
    process.exit(1);
  }
}

createTestUser();




