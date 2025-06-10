import { db } from './firebase';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { createUserInFirebase, User } from './userService';

export interface AuthUser extends User {
  password: string; // Note: In a production app, we should never store plain text passwords
}

export const signUp = async (username: string, password: string): Promise<AuthUser | null> => {
  try {
    // Check if username already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('name', '==', username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error('Username already exists');
    }

    // Create new user
    const user = await createUserInFirebase(username);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Add password to user document
    const userWithPassword: AuthUser = {
      ...user,
      password, // In a production app, this should be hashed
    };

    // Save user with password to Firebase
    await setDoc(doc(db, 'users', user.id), userWithPassword);

    return userWithPassword;
  } catch (error) {
    console.error('Error in signUp:', error);
    throw error;
  }
};

export const login = async (username: string, password: string): Promise<AuthUser | null> => {
  try {
    // Find user by username
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('name', '==', username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('User not found');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as AuthUser;

    // Check password
    if (userData.password !== password) {
      throw new Error('Invalid password');
    }

    return userData;
  } catch (error) {
    console.error('Error in login:', error);
    throw error;
  }
};
