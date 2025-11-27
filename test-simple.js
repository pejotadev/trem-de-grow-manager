const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

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

async function test() {
  console.log('🔥 Testando Firebase Auth e Firestore...\n');
  
  try {
    // Test 1: Login
    console.log('1️⃣ Fazendo login com pejotabh@gmail.com...');
    const userCredential = await signInWithEmailAndPassword(auth, 'pejotabh@gmail.com', 'mk!tri43');
    console.log('✅ Login bem-sucedido!');
    console.log('   User ID:', userCredential.user.uid);
    console.log('   Email:', userCredential.user.email);
    console.log('');
    
    // Test 2: Create plant
    console.log('2️⃣ Criando planta de teste...');
    const plantData = {
      userId: userCredential.user.uid,
      name: 'Planta Teste CLI',
      strain: 'Test Strain',
      startDate: Date.now(),
      currentStage: 'Seedling'
    };
    
    const docRef = await addDoc(collection(db, 'plants'), plantData);
    console.log('✅ Planta criada com sucesso!');
    console.log('   Plant ID:', docRef.id);
    console.log('');
    
    console.log('✅ Todos os testes passaram!');
    console.log('Acesse: https://console.firebase.google.com/project/grow-85028/firestore');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.code, '-', error.message);
    console.log('\n💡 Dica: Se o erro for auth/wrong-password, atualize a senha no script');
    process.exit(1);
  }
}

test();
