import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, increment } from 'firebase/firestore';
import { User } from './userService';

const GROUPS_STORAGE_KEY = 'user_groups';
const ALL_GROUPS_STORAGE_KEY = 'all_groups';

export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  memberCount: number;
  totalPosts: number;
  members: string[];
  ownerId: string;
  lastActivity?: string;
}

// Get user's groups from local storage
export const getUserGroups = async (userId: string): Promise<Group[]> => {
  try {
    const groupsData = await AsyncStorage.getItem(`${GROUPS_STORAGE_KEY}_${userId}`);
    if (groupsData) {
      return JSON.parse(groupsData);
    }
    return [];
  } catch (error) {
    console.error('❌ Failed to get user groups:', error);
    return [];
  }
};

// Save user's groups to local storage
export const saveUserGroups = async (userId: string, groups: Group[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(`${GROUPS_STORAGE_KEY}_${userId}`, JSON.stringify(groups));
    return true;
  } catch (error) {
    console.error('❌ Failed to save user groups:', error);
    return false;
  }
};

// Join a group
export const joinGroup = async (userId: string, groupId: string): Promise<boolean> => {
  try {
    // Get group from Firebase
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }

    const groupData = groupDoc.data() as Group;

    // Check if user is already a member
    if (groupData.members.includes(userId)) {
      throw new Error('You are already a member of this group');
    }

    // Update group in Firebase
    await updateDoc(doc(db, 'groups', groupId), {
      members: [...groupData.members, userId],
      memberCount: increment(1)
    });

    // Update user's local groups
    const currentGroups = await getUserGroups(userId);
    await saveUserGroups(userId, [...currentGroups, groupData]);

    return true;
  } catch (error) {
    console.error('❌ Failed to join group:', error);
    throw error;
  }
};

// Create a new group
export const createGroup = async (
  ownerId: string,
  name: string,
  description: string
): Promise<Group> => {
  try {
    const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const groupData: Group = {
      id: groupId,
      name,
      description,
      createdAt: new Date(),
      memberCount: 1,
      totalPosts: 0,
      members: [ownerId],
      ownerId,
      lastActivity: new Date().toISOString()
    };

    // Save to Firebase
    await setDoc(doc(db, 'groups', groupId), groupData);

    // Update user's local groups
    const currentGroups = await getUserGroups(ownerId);
    await saveUserGroups(ownerId, [...currentGroups, groupData]);

    return groupData;
  } catch (error) {
    console.error('❌ Failed to create group:', error);
    throw error;
  }
};

// Get group details
export const getGroupDetails = async (groupId: string): Promise<Group | null> => {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (groupDoc.exists()) {
      return groupDoc.data() as Group;
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to get group details:', error);
    return null;
  }
};

// Update group details
export const updateGroupDetails = async (
  groupId: string,
  updates: Partial<Group>
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      ...updates,
      lastActivity: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to update group details:', error);
    return false;
  }
};

// Leave a group
export const leaveGroup = async (userId: string, groupId: string): Promise<boolean> => {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }

    const groupData = groupDoc.data() as Group;

    // Remove user from group members
    const updatedMembers = groupData.members.filter(id => id !== userId);

    // Update group in Firebase
    await updateDoc(doc(db, 'groups', groupId), {
      members: updatedMembers,
      memberCount: increment(-1)
    });

    // Update user's local groups
    const currentGroups = await getUserGroups(userId);
    await saveUserGroups(userId, currentGroups.filter(g => g.id !== groupId));

    return true;
  } catch (error) {
    console.error('❌ Failed to leave group:', error);
    throw error;
  }
};

// Clear group data (for testing)
export const clearGroupData = async (userId?: string): Promise<boolean> => {
  try {
    const groupKeysToRemove = [ALL_GROUPS_STORAGE_KEY];

    if (userId) {
      groupKeysToRemove.push(`${GROUPS_STORAGE_KEY}_${userId}`);
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      groupKeysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
      });
    } else {
      await AsyncStorage.multiRemove(groupKeysToRemove);
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to clear group data:', error);
    return false;
  }
};

export const updateGroupStatistics = async (
  groupId: string,
  updates: { totalPosts?: number; memberCount?: number }
): Promise<boolean> => {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) {
      console.error('❌ Group not found for statistics update:', groupId);
      return false;
    }

    const updateData: any = { lastActivity: new Date().toISOString() };
    if (updates.totalPosts !== undefined) {
      updateData.totalPosts = updates.totalPosts;
    }
    if (updates.memberCount !== undefined) {
      updateData.memberCount = updates.memberCount;
    }

    await updateDoc(doc(db, 'groups', groupId), updateData);
    return true;
  } catch (error) {
    console.error('❌ Failed to update group statistics:', error);
    return false;
  }
};
