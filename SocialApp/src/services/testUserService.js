// src/services/testAuth.js
import {
  createUserInFirebase,
  getUserLocally,
  clearUserData,
  createGroup,
  verifyGroupCode
} from './userService';

export const testAuthSystem = async () => {
  try {
    console.log('🧪 Testing Authentication System...');

    // Step 1: Clear any existing data
    await clearUserData();

    // Step 2: Create a test group
    const testGroupCode = 'TEST123';
    await createGroup(testGroupCode);

    // Step 3: Verify group code works
    const groupExists = await verifyGroupCode(testGroupCode);
    if (!groupExists) throw new Error('Group verification failed');

    // Step 4: Create a test user
    const newUser = await createUserInFirebase('Test User', testGroupCode);
    if (!newUser) throw new Error('User creation failed');

    // Step 5: Retrieve user from local storage
    const retrievedUser = await getUserLocally();
    if (!retrievedUser) throw new Error('User retrieval failed');

    // Step 6: Verify data matches
    if (newUser.id === retrievedUser.id && newUser.name === retrievedUser.name) {
      console.log('✅ Authentication system working perfectly!');
      console.log('👤 User created:', newUser.name);
      console.log('🏷️ Group:', newUser.groupId);
      return true;
    } else {
      throw new Error('User data mismatch');
    }

  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return false;
  }
};
