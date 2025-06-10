import AsyncStorage from '@react-native-async-storage/async-storage';

const GROUPS_STORAGE_KEY = 'user_groups';
const ALL_GROUPS_STORAGE_KEY = 'all_groups';

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastActivity: string;
  isOwner: boolean;
  createdAt: string;
  ownerId: string;
  members: string[];
}

export const getUserGroups = async (userId: string): Promise<Group[]> => {
  try {
    const userGroupsJson = await AsyncStorage.getItem(`${GROUPS_STORAGE_KEY}_${userId}`);
    if (userGroupsJson) {
      return JSON.parse(userGroupsJson);
    }
    return getMockUserGroups(userId);
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
};

const getMockUserGroups = (userId: string): Group[] => {
  return [
    {
      id: 'group_1',
      name: 'Family Photos',
      description: 'Sharing our family moments and memories',
      memberCount: 5,
      lastActivity: '2 hours ago',
      isOwner: true,
      createdAt: '2024-01-15T10:30:00Z',
      ownerId: userId,
      members: [userId, 'user2', 'user3', 'user4', 'user5'],
    },
    {
      id: 'group_2',
      name: 'Weekend Trip',
      description: 'Photos from our amazing weekend getaway',
      memberCount: 8,
      lastActivity: '1 day ago',
      isOwner: false,
      createdAt: '2024-02-01T14:20:00Z',
      ownerId: 'user2',
      members: [userId, 'user2', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11'],
    }
  ];
};

export const createGroup = async (userId: string, groupName: string, description: string): Promise<Group> => {
  try {
    const newGroup: Group = {
      id: Math.random().toString(36).substring(2, 15),
      name: groupName,
      description: description,
      memberCount: 1,
      lastActivity: 'Just created',
      isOwner: true,
      createdAt: new Date().toISOString(),
      ownerId: userId,
      members: [userId],
    };

    const userGroups = await getUserGroups(userId);
    userGroups.push(newGroup);
    await AsyncStorage.setItem(`${GROUPS_STORAGE_KEY}_${userId}`, JSON.stringify(userGroups));

    return newGroup;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

export const searchGroups = async (searchTerm: string): Promise<Group[]> => {
  try {
    const mockGroups: Group[] = [
      {
        id: 'public_1',
        name: 'Photography Club',
        description: 'Share your best photography with fellow enthusiasts',
        memberCount: 45,
        lastActivity: '1 hour ago',
        isOwner: false,
        createdAt: '2024-01-10T08:00:00Z',
        ownerId: 'photographer1',
        members: [],
      },
      {
        id: 'public_2',
        name: 'Travel Buddies',
        description: 'Document our adventures around the world',
        memberCount: 23,
        lastActivity: '3 hours ago',
        isOwner: false,
        createdAt: '2024-02-05T16:30:00Z',
        ownerId: 'traveler1',
        members: [],
      }
    ];

    if (!searchTerm.trim()) {
      return mockGroups;
    }

    return mockGroups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching groups:', error);
    return [];
  }
};

export const joinGroup = async (userId: string, groupId: string): Promise<Group> => {
  try {
    const allGroups = await searchGroups('');
    const groupToJoin = allGroups.find(group => group.id === groupId);

    if (!groupToJoin) {
      throw new Error('Group not found');
    }

    if (groupToJoin.members.includes(userId)) {
      throw new Error('You are already a member of this group');
    }

    const userGroups = await getUserGroups(userId);
    const updatedGroup = {
      ...groupToJoin,
      members: [...groupToJoin.members, userId],
      memberCount: groupToJoin.memberCount + 1
    };

    userGroups.push(updatedGroup);
    await AsyncStorage.setItem(`${GROUPS_STORAGE_KEY}_${userId}`, JSON.stringify(userGroups));

    return updatedGroup;
  } catch (error) {
    console.error('Error joining group:', error);
    throw error;
  }
};
