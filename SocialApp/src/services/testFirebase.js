// src/services/testFirebase.js
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('🔄 Testing Firebase connection...');

    // Test writing data
    const testDoc = await addDoc(collection(db, 'test'), {
      message: 'Hello Firebase!',
      timestamp: new Date(),
      test: true
    });

    console.log('✅ Write test successful. Document ID:', testDoc.id);

    // Test reading data
    const querySnapshot = await getDocs(collection(db, 'test'));
    console.log('✅ Read test successful. Found documents:');
    querySnapshot.forEach((doc) => {
      console.log(`- ${doc.id}:`, doc.data());
    });

    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};
