// src/services/userService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, increment } from 'firebase/firestore';

const USER_STORAGE_KEY = '@PhotoGroupApp:user';
const USER_PROFILE_KEY = '@PhotoGroupApp:user_profile';
const GROUPS_STORAGE_KEY = 'user_groups';
const ALL_GROUPS_STORAGE_KEY = 'all_groups';

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

// Create user in Firebase (updated for multiple groups support)
export const createUserInFirebase = async (name, groupId = null) => {
  try {
    const userId = generateUserId();
    const userData = {
      id: userId,
      name: name,
      groupId: groupId, // Keep for backward compatibility
      groups: groupId ? [groupId] : [], // New: support multiple groups
      groupsPosted: [], // Track which groups user has posted in
      hasUploaded: false,
      joinedAt: new Date(),
      totalPosts: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      groupCount: groupId ? 1 : 0,
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
export const updateUserLocally = async (updatedData, syncToFirebase = false) => {
  try {
    const currentUser = await getUserLocally();
    if (!currentUser) {
      throw new Error('No user found to update');
    }

    // Merge current user data with updates
    const updatedUser = {
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

// Add user to multiple groups support
export const addUserToGroups = async (userId, groupIds) => {
  try {
    const currentUser = await getUserLocally();
    if (currentUser && currentUser.id === userId) {
      const currentGroups = currentUser.groups || [];
      const newGroups = [...new Set([...currentGroups, ...groupIds])]; // Remove duplicates

      await updateUserLocally({
        groups: newGroups,
        groupCount: newGroups.length,
        lastActivity: new Date().toISOString()
      }, true);

      console.log('✅ User added to groups:', groupIds);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to add user to groups:', error);
    return false;
  }
};

// Remove user from group
export const removeUserFromGroup = async (userId, groupId) => {
  try {
    const currentUser = await getUserLocally();
    if (currentUser && currentUser.id === userId) {
      const currentGroups = currentUser.groups || [];
      const updatedGroups = currentGroups.filter(id => id !== groupId);

      await updateUserLocally({
        groups: updatedGroups,
        groupCount: updatedGroups.length,
        lastActivity: new Date().toISOString()
      }, true);

      console.log('✅ User removed from group:', groupId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to remove user from group:', error);
    return false;
  }
};

// Track user activity
export const updateUserActivity = async (activityType, data = {}) => {
  try {
    const currentUser = await getUserLocally();
    if (!currentUser) return;

    const activity = {
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
export const getUserStats = async () => {
  try {
    const user = await getUserLocally();
    if (!user) return null;

    return {
      userId: user.id,
      name: user.name,
      memberSince: user.createdAt || user.joinedAt,
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
export const validateUser = async () => {
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

// Enhanced function to clear all test data
export const clearAllTestData = async () => {
  try {
    console.log('🧹 Starting comprehensive data clear...');

    // Get current user info for cleaning user-specific data
    const currentUser = await getUserLocally();
    console.log('Current user before clearing:', currentUser);

    // Clear all user-related storage
    console.log('Clearing user data...');
    const userDataCleared = await clearUserData();
    console.log('User data cleared:', userDataCleared);

    // Clear group-related data
    console.log('Clearing group data...');
    const groupDataCleared = await clearGroupData(currentUser?.id);
    console.log('Group data cleared:', groupDataCleared);

    // Clear any additional app data
    console.log('Clearing app data...');
    const appDataCleared = await clearAppData();
    console.log('App data cleared:', appDataCleared);

    // Verify everything is cleared
    const verifyUser = await getUserLocally();
    console.log('Verification - User after clearing:', verifyUser);

    console.log('✅ All test data cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear test data:', error);
    return false;
  }
};

// Clear user data (enhanced for testing)
export const clearUserData = async () => {
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

// Clear group-related data
export const clearGroupData = async (userId = null) => {
  try {
    console.log('🧹 Clearing group data...');

    const groupKeysToRemove = [
      ALL_GROUPS_STORAGE_KEY,
    ];

    // Add user-specific group keys if userId is provided
    if (userId) {
      groupKeysToRemove.push(`${GROUPS_STORAGE_KEY}_${userId}`);
    }

    // Platform-specific clearing
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web platform
      groupKeysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
      });
    } else {
      // Mobile platform
      await AsyncStorage.multiRemove(groupKeysToRemove);
    }

    console.log('✅ Group data cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear group data:', error);
    return false;
  }
};

// Clear any additional app data
export const clearAppData = async () => {
  try {
    console.log('🧹 Clearing additional app data...');

    // Add any other storage keys your app might use
    const additionalKeys = [
      // Add other storage keys here if needed
      // 'app_settings',
      // 'cached_data',
      // etc.
    ];

    if (additionalKeys.length > 0) {
      if (typeof window !== 'undefined' && window.localStorage) {
        additionalKeys.forEach(key => {
          window.localStorage.removeItem(key);
        });
      } else {
        await AsyncStorage.multiRemove(additionalKeys);
      }
    }

    console.log('✅ Additional app data cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear app data:', error);
    return false;
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

// Add user to group members list
export const addUserToGroup = async (groupId, userId) => {
  try {
    console.log('🔄 Adding user to group members list...');

    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);

    if (groupDoc.exists()) {
      const groupData = groupDoc.data();
      const currentMembers = groupData.members || [];

      if (!currentMembers.includes(userId)) {
        await updateDoc(groupRef, {
          members: [...currentMembers, userId],
          memberCount: currentMembers.length + 1
        });

        // Also update user's local groups list
        await addUserToGroups(userId, [groupId]);

        console.log('✅ User added to group members');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to add user to group:', error);
    return false;
  }
};

// Update user's upload status
export const updateUserUploadStatus = async (userId, hasUploaded = true) => {
  try {
    console.log('🔄 Updating user upload status...');

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      hasUploaded,
      lastActive: new Date()
    });

    // Also update local storage
    await updateUserLocally({
      hasUploaded,
      lastActive: new Date().toISOString()
    });

    console.log('✅ User upload status updated');
    return true;
  } catch (error) {
    console.error('❌ Failed to update user status:', error);
    return false;
  }
};
