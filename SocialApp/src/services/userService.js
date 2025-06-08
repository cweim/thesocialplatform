// src/services/userService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const USER_STORAGE_KEY = '@PhotoGroupApp:user';

// Generate unique user ID
const generateUserId = () => {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Save user data locally
export const saveUserLocally = async (userData) => {
  try {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    console.log('✅ User saved locally:', userData);
    return true;
  } catch (error) {
    console.error('❌ Failed to save user locally:', error);
    return false;
  }
};

// Get user data from local storage
export const getUserLocally = async () => {
  try {
    const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (userData) {
      const parsed = JSON.parse(userData);
      console.log('✅ User retrieved locally:', parsed);
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to get user locally:', error);
    return null;
  }
};

// Create user in Firebase
export const createUserInFirebase = async (name, groupId) => {
  try {
    const userId = generateUserId();
    const userData = {
      id: userId,
      name: name,
      groupId: groupId,
      hasUploaded: false,
      joinedAt: new Date(),
      totalPosts: 0
    };

    // Save to Firebase
    await setDoc(doc(db, 'users', userId), userData);

    // Save locally
    await saveUserLocally(userData);

    console.log('✅ User created successfully:', userData);
    return userData;
  } catch (error) {
    console.error('❌ Failed to create user:', error);
    return null;
  }
};

// Clear user data (for testing)
export const clearUserData = async () => {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    console.log('✅ User data cleared');
  } catch (error) {
    console.error('❌ Failed to clear user data:', error);
  }
};

// Check if group code exists
export const verifyGroupCode = async (groupCode) => {
  try {
    console.log('🔄 Verifying group code:', groupCode);

    const groupDoc = await getDoc(doc(db, 'groups', groupCode));
    if (groupDoc.exists()) {
      console.log('✅ Group code valid');
      return groupDoc.data();
    } else {
      console.log('❌ Group code not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error verifying group code:', error);
    return null;
  }
};

// Create a new group (for testing)
export const createGroup = async (groupCode) => {
  try {
    console.log('🔄 Creating group:', groupCode);

    const groupData = {
      code: groupCode,
      createdAt: new Date(),
      memberCount: 0,
      totalPosts: 0,
      members: []
    };

    await setDoc(doc(db, 'groups', groupCode), groupData);
    console.log('✅ Group created successfully');
    return groupData;
  } catch (error) {
    console.error('❌ Failed to create group:', error);
    return null;
  }
};
