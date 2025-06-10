import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const USER_STORAGE_KEY = '@PhotoGroupApp:user';
const USER_PROFILE_KEY = '@PhotoGroupApp:user_profile';

export interface User {
  id: string;
  name: string;
  groups: string[];
  groupsPosted: string[];
  hasUploaded: boolean;
  joinedAt: Date;
  totalPosts: number;
  createdAt: string;
  lastLogin: string;
  groupCount: number;
  activityLog: ActivityLog[];
  lastActivity?: string;
  lastActivityType?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

// Generate unique user ID
const generateUserId = (): string => {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Save user data locally
export const saveUserLocally = async (userData: User): Promise<boolean> => {
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
export const getUserLocally = async (): Promise<User | null> => {
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
export const createUserInFirebase = async (name: string): Promise<User | null> => {
  try {
    const userId = generateUserId();
    const userData: User = {
      id: userId,
      name: name,
      groups: [],
      groupsPosted: [],
      hasUploaded: false,
      joinedAt: new Date(),
      totalPosts: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      groupCount: 0,
      activityLog: []
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

// Update user data locally and optionally in Firebase
export const updateUserLocally = async (
  updatedData: Partial<User>,
  syncToFirebase: boolean = false
): Promise<User> => {
  try {
    const currentUser = await getUserLocally();
    if (!currentUser) {
      throw new Error('No user found to update');
    }

    // Merge current user data with updates
    const updatedUser: User = {
      ...currentUser,
      ...updatedData,
      updatedAt: new Date().toISOString(),
    };

    await saveUserLocally(updatedUser);

    // Optionally sync to Firebase
    if (syncToFirebase && currentUser.id) {
      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, updatedData);
        console.log('✅ User updated in Firebase');
      } catch (firebaseError) {
        console.warn('⚠️ Failed to sync to Firebase:', firebaseError);
      }
    }

    console.log('✅ User updated locally');
    return updatedUser;
  } catch (error) {
    console.error('❌ Error updating user locally:', error);
    throw error;
  }
};

// Track user activity
export const updateUserActivity = async (
  activityType: string,
  data: Record<string, any> = {}
): Promise<void> => {
  try {
    const currentUser = await getUserLocally();
    if (!currentUser) return;

    const activity: ActivityLog = {
      type: activityType,
      timestamp: new Date().toISOString(),
      data: data,
    };

    const activityLog = currentUser.activityLog || [];
    activityLog.push(activity);

    // Keep only last 50 activities to avoid storage bloat
    const trimmedLog = activityLog.slice(-50);

    await updateUserLocally({
      lastActivity: new Date().toISOString(),
      lastActivityType: activityType,
      activityLog: trimmedLog
    });

    console.log('✅ User activity updated:', activityType);
  } catch (error) {
    console.error('❌ Error updating user activity:', error);
  }
};

// Get user stats (for profile/overview screens)
export const getUserStats = async (): Promise<{
  userId: string;
  name: string;
  memberSince: string;
  lastLogin: string;
  groupCount: number;
  totalPosts: number;
  hasUploaded: boolean;
  lastActivity?: string;
  totalActivities: number;
  groups: string[];
  groupsPosted: string[];
} | null> => {
  try {
    const user = await getUserLocally();
    if (!user) return null;

    return {
      userId: user.id,
      name: user.name,
      memberSince: user.createdAt || user.joinedAt.toISOString(),
      lastLogin: user.lastLogin,
      groupCount: user.groupCount || (user.groups ? user.groups.length : 0),
      totalPosts: user.totalPosts || 0,
      hasUploaded: user.hasUploaded || false,
      lastActivity: user.lastActivity,
      totalActivities: user.activityLog ? user.activityLog.length : 0,
      groups: user.groups || [],
      groupsPosted: user.groupsPosted || [],
    };
  } catch (error) {
    console.error('❌ Error getting user stats:', error);
    return null;
  }
};

// Validate user data
export const validateUser = async (): Promise<{
  isValid: boolean;
  reason?: string;
  user?: User;
}> => {
  try {
    const user = await getUserLocally();
    if (!user) {
      return { isValid: false, reason: 'No user found' };
    }

    if (!user.name || !user.id) {
      return { isValid: false, reason: 'Incomplete user data' };
    }

    return { isValid: true, user: user };
  } catch (error) {
    console.error('❌ Error validating user:', error);
    return { isValid: false, reason: 'Validation error' };
  }
};

// Clear user data (enhanced for testing)
export const clearUserData = async (): Promise<boolean> => {
  try {
    console.log('🧹 Clearing user data...');

    const keysToRemove = [
      USER_STORAGE_KEY,
      USER_PROFILE_KEY,
    ];

    // Platform-specific clearing
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web platform - use localStorage directly
      console.log('🌐 Clearing web localStorage...');
      keysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
      });
      console.log('✅ Web localStorage cleared');
    } else {
      // Mobile platform - use AsyncStorage
      console.log('📱 Clearing AsyncStorage...');
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('✅ AsyncStorage cleared');
    }

    console.log('✅ User data cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear user data:', error);
    return false;
  }
};

// Update user's upload status
export const updateUserUploadStatus = async (
  userId: string,
  hasUploaded: boolean = true
): Promise<boolean> => {
  try {
    console.log('🔄 Updating user upload status...');

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      hasUploaded,
      lastActivity: new Date().toISOString()
    });

    // Also update local storage
    await updateUserLocally({
      hasUploaded,
      lastActivity: new Date().toISOString()
    });

    console.log('✅ User upload status updated');
    return true;
  } catch (error) {
    console.error('❌ Failed to update user status:', error);
    return false;
  }
};
