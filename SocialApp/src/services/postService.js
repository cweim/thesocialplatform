// src/services/postService.js
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { uploadImage } from './imageService';
import { updateUserLocally, updateUserActivity } from './userService';

// Create a new post with image and update user/group stats
export const createPost = async (imageUri, caption, authorName, authorId, groupId, frontImageUri = null) => {
  try {
    console.log('🔄 Creating new post...');
    console.log('👤 Author:', authorName, 'Group:', groupId);
    console.log('📸 Main Image URI:', imageUri);
    if (frontImageUri) {
      console.log('📸 Front Image URI:', frontImageUri);
    }

    // Validate inputs
    if (!imageUri || !caption?.trim() || !authorName || !authorId || !groupId) {
      throw new Error('Missing required post data');
    }

    // Check if user is member of the group (optional validation)
    const isMember = await validateGroupMembership(authorId, groupId);
    if (!isMember) {
      console.warn('⚠️ User might not be a member of this group, but proceeding...');
    }

    // Handle image uploads through imageService
    const { uploadDualImages, uploadImage } = await import('./imageService');
    let imageResult;

    try {
      if (frontImageUri) {
        imageResult = await uploadDualImages(imageUri, frontImageUri, groupId, authorId);
      } else {
        imageResult = await uploadImage(imageUri, groupId, authorId);
      }
    } catch (uploadError) {
      console.error('❌ Image upload failed:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Create post data
    const postData = {
      imageUrl: frontImageUri ? imageResult.main.downloadURL : imageResult.downloadURL,
      frontImageUrl: frontImageUri ? imageResult.front?.downloadURL : null,
      compositeImageUrl: frontImageUri ? imageResult.composite?.downloadURL : null,
      caption: caption.trim(),
      authorName: authorName,
      authorId: authorId,
      groupId: groupId,
      createdAt: new Date(),
      imageSize: frontImageUri ? imageResult.main.size : imageResult.size,
      imagePath: frontImageUri ? imageResult.main.path : imageResult.path,
      likes: 0,
      likedBy: []
    };

    // Save post to Firestore
    console.log('💾 Saving post to database...');
    const docRef = await addDoc(collection(db, 'posts'), postData);
    const newPost = { id: docRef.id, ...postData };

    console.log('✅ Post created successfully:', docRef.id);

    // Update user and group statistics after successful post creation
    await updatePostStatistics(authorId, groupId, newPost);

    return newPost;
  } catch (error) {
    console.error('❌ Failed to create post:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

// Update user and group statistics after posting
const updatePostStatistics = async (authorId, groupId, post) => {
  try {
    console.log('📊 Updating user and group statistics...');

    // Update user's posting status and activity
    await updateUserPostingStatus(authorId, groupId, post);

    // Update group statistics
    await updateGroupStatistics(groupId);

    console.log('✅ Statistics updated successfully');
  } catch (error) {
    console.error('❌ Failed to update statistics:', error);
    // Don't throw here - post was already created successfully
  }
};

// Update user's posting status and activity tracking
const updateUserPostingStatus = async (authorId, groupId, post) => {
  try {
    // Get current user data
    const { getUserLocally } = await import('./userService');
    const currentUser = await getUserLocally();

    if (!currentUser || currentUser.id !== authorId) {
      console.warn('⚠️ Could not update user posting status - user mismatch');
      return;
    }

    const groupsPosted = currentUser.groupsPosted || [];
    const isFirstPostInGroup = !groupsPosted.includes(groupId);

    const updateData = {
      totalPosts: (currentUser.totalPosts || 0) + 1,
      hasUploaded: true, // For backward compatibility
      lastActivity: new Date().toISOString(),
    };

    // If this is the first post in this group, add group to groupsPosted array
    if (isFirstPostInGroup) {
      updateData.groupsPosted = [...groupsPosted, groupId];
      console.log('🎉 First post in group detected - unlocking group feed');
    }

    // Update user data
    await updateUserLocally(updateData, true); // Sync to Firebase

    // Track activity
    const activityType = isFirstPostInGroup ? 'first_post_in_group' : 'posted_in_group';
    await updateUserActivity(activityType, {
      groupId: groupId,
      postId: post.id,
      caption: post.caption.substring(0, 50) + (post.caption.length > 50 ? '...' : '')
    });

    console.log('✅ User posting status updated');
  } catch (error) {
    console.error('❌ Failed to update user posting status:', error);
  }
};

// Update group statistics in Firebase
const updateGroupStatistics = async (groupId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      totalPosts: increment(1),
      lastActivity: new Date()
    });
    console.log('✅ Group statistics updated');
  } catch (error) {
    console.error('❌ Failed to update group statistics:', error);
    // Don't throw - this is not critical for post creation
  }
};

// Validate if user is a member of the group
const validateGroupMembership = async (userId, groupId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);

    if (groupDoc.exists()) {
      const groupData = groupDoc.data();
      const members = groupData.members || [];
      return members.includes(userId);
    }
    return false;
  } catch (error) {
    console.error('❌ Error validating group membership:', error);
    return false; // Assume not a member on error
  }
};

// Get all posts for a group
export const getGroupPosts = async (groupId) => {
  try {
    console.log('🔄 Fetching posts for group:', groupId);

    if (!groupId) {
      throw new Error('Group ID is required');
    }

    const q = query(
      collection(db, 'posts'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const posts = [];

    querySnapshot.forEach((doc) => {
      const postData = { id: doc.id, ...doc.data() };
      posts.push(postData);
    });

    console.log('✅ Retrieved', posts.length, 'posts for group:', groupId);
    return posts;
  } catch (error) {
    console.error('❌ Failed to get posts for group:', groupId, error);
    return [];
  }
};

// Get posts by a specific user
export const getUserPosts = async (userId) => {
  try {
    console.log('🔄 Fetching posts by user:', userId);

    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const posts = [];

    querySnapshot.forEach((doc) => {
      const postData = { id: doc.id, ...doc.data() };
      posts.push(postData);
    });

    console.log('✅ Retrieved', posts.length, 'posts by user:', userId);
    return posts;
  } catch (error) {
    console.error('❌ Failed to get user posts:', error);
    return [];
  }
};

// Get posts by user in a specific group
export const getUserPostsInGroup = async (userId, groupId) => {
  try {
    console.log('🔄 Fetching posts by user in group:', userId, groupId);

    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const posts = [];

    querySnapshot.forEach((doc) => {
      const postData = { id: doc.id, ...doc.data() };
      posts.push(postData);
    });

    console.log('✅ Retrieved', posts.length, 'posts by user in group');
    return posts;
  } catch (error) {
    console.error('❌ Failed to get user posts in group:', error);
    return [];
  }
};

// Check if user has posted in a specific group
export const hasUserPostedInGroup = async (userId, groupId) => {
  try {
    const posts = await getUserPostsInGroup(userId, groupId);
    return posts.length > 0;
  } catch (error) {
    console.error('❌ Failed to check if user posted in group:', error);
    return false;
  }
};

// Get posting statistics for a user
export const getUserPostingStats = async (userId) => {
  try {
    const posts = await getUserPosts(userId);

    // Group posts by groupId
    const postsByGroup = {};
    posts.forEach(post => {
      if (!postsByGroup[post.groupId]) {
        postsByGroup[post.groupId] = [];
      }
      postsByGroup[post.groupId].push(post);
    });

    return {
      totalPosts: posts.length,
      groupsPostedIn: Object.keys(postsByGroup),
      postsByGroup: postsByGroup,
      firstPost: posts.length > 0 ? posts[posts.length - 1] : null,
      latestPost: posts.length > 0 ? posts[0] : null
    };
  } catch (error) {
    console.error('❌ Failed to get user posting stats:', error);
    return {
      totalPosts: 0,
      groupsPostedIn: [],
      postsByGroup: {},
      firstPost: null,
      latestPost: null
    };
  }
};

// Test the complete posts system
export const testPostsSystem = async () => {
  try {
    console.log('🧪 Testing complete posts system...');

    // Import test image function
    const { createTestImage } = await import('./imageService');
    const testImageData = createTestImage();

    // Create a test post
    const testPost = await createPost(
      testImageData,
      'This is a test post with a red square! 🟥',
      'Test User',
      'test_user_123',
      'TEST_GROUP'
    );

    if (!testPost) throw new Error('Failed to create test post');

    // Wait a moment for the post to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Retrieve posts from the group
    const posts = await getGroupPosts('TEST_GROUP');
    if (posts.length === 0) {
      throw new Error('No posts retrieved - there might be a delay');
    }

    // Test user posting stats
    const userStats = await getUserPostingStats('test_user_123');

    console.log('✅ Posts system working perfectly!');
    console.log('📝 Created post:', testPost.caption);
    console.log('📚 Retrieved', posts.length, 'posts');
    console.log('🖼️ First post image:', posts[0].imageUrl);
    console.log('📊 User stats:', userStats);

    return true;
  } catch (error) {
    console.error('❌ Posts system test failed:', error);
    console.log('ℹ️ Note: Sometimes there\'s a delay in Firestore queries');
    return false;
  }
};
