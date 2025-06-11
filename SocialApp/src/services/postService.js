// src/services/postService.js
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { updateUserLocally, updateUserActivity } from './userService';

// Create a new post with dual images and update user/group stats
export const createPost = async (backImageUri, caption, authorName, authorId, groupId, frontImageUri = null) => {
  try {
    console.log('=== POST CREATION START ===');
    console.log('👤 Author:', authorName, 'ID:', authorId);
    console.log('🎯 Target Group:', groupId);
    console.log('📸 Back Camera URI:', backImageUri?.substring(0, 50) + '...');
    console.log('📸 Front Camera URI:', frontImageUri?.substring(0, 50) + '...');
    console.log('📝 Caption length:', caption?.length);

    // Comprehensive input validation
    if (!backImageUri) {
      throw new Error('Back camera image is required');
    }
    if (!caption?.trim()) {
      throw new Error('Caption is required and cannot be empty');
    }
    if (!authorName?.trim()) {
      throw new Error('Author name is required');
    }
    if (!authorId?.trim()) {
      throw new Error('Author ID is required');
    }
    if (!groupId?.trim()) {
      throw new Error('Group ID is required');
    }

    console.log('✅ Input validation passed');

    // Optional: Check if user is member of the group
    const isMember = await validateGroupMembership(authorId, groupId);
    if (!isMember) {
      console.warn('⚠️ User might not be a member of this group, but proceeding...');
    }

    // Handle image uploads through imageService
    console.log('📤 Starting image upload process...');
    const { uploadDualImages, uploadImage } = await import('./imageService');
    let imageResult;

    try {
      if (frontImageUri) {
        console.log('📸 Uploading dual images (back + front)...');
        imageResult = await uploadDualImages(backImageUri, frontImageUri, groupId, authorId);
        console.log('✅ Dual image upload completed:', {
          hasMain: !!imageResult.main?.downloadURL,
          hasFront: !!imageResult.front?.downloadURL
        });
      } else {
        console.log('📸 Uploading single image (back only)...');
        imageResult = await uploadImage(backImageUri, groupId, authorId);
        console.log('✅ Single image upload completed:', !!imageResult.downloadURL);
      }
    } catch (uploadError) {
      console.error('❌ Image upload failed:', uploadError);
      throw new Error(`Failed to upload images: ${uploadError.message}`);
    }

    // Validate upload results
    if (frontImageUri) {
      if (!imageResult.main?.downloadURL) {
        throw new Error('Back camera image upload failed - no download URL');
      }
      if (!imageResult.front?.downloadURL) {
        throw new Error('Front camera image upload failed - no download URL');
      }
    } else {
      if (!imageResult.downloadURL) {
        throw new Error('Image upload failed - no download URL');
      }
    }

    // Create post data structure
    const postData = {
      // Image URLs
      imageUrl: frontImageUri ? imageResult.main.downloadURL : imageResult.downloadURL,
      frontImageUrl: frontImageUri ? imageResult.front.downloadURL : null,

      // Post content
      caption: caption.trim(),
      authorName: authorName.trim(),
      authorId: authorId.trim(),
      groupId: groupId.trim(),
      createdAt: new Date(),

      // Image metadata
      imageSize: frontImageUri ? imageResult.main.size : imageResult.size,
      imagePath: frontImageUri ? imageResult.main.path : imageResult.path,
      frontImageSize: frontImageUri ? imageResult.front.size : null,
      frontImagePath: frontImageUri ? imageResult.front.path : null,

      // Interaction data
      likes: 0,
      likedBy: [],

      // Post type
      type: frontImageUri ? 'dual_camera' : 'single_camera'
    };

    console.log('💾 Saving post to Firestore...');
    console.log('📊 Post data structure:', {
      hasImageUrl: !!postData.imageUrl,
      hasFrontImageUrl: !!postData.frontImageUrl,
      captionLength: postData.caption.length,
      type: postData.type
    });

    // Save post to Firestore
    const docRef = await addDoc(collection(db, 'posts'), postData);
    const newPost = { id: docRef.id, ...postData };

    console.log('✅ Post saved to Firestore with ID:', docRef.id);

    // Update user and group statistics after successful post creation
    try {
    await updatePostStatistics(authorId, groupId, newPost);
    } catch (statsError) {
      console.error('⚠️ Failed to update statistics (post still created):', statsError);
      // Don't throw here - post was already created successfully
    }

    console.log('🎉 Post creation completed successfully');
    return newPost;

  } catch (error) {
    console.error('❌ POST CREATION FAILED:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

    // Re-throw with more context
    const contextualError = new Error(`Post creation failed: ${error.message}`);
    contextualError.originalError = error;
    throw contextualError;
  }
};

// Update user and group statistics after posting
const updatePostStatistics = async (authorId, groupId, post) => {
  try {
    console.log('📊 Updating post statistics...');

    // Update user's posting status and activity
    await updateUserPostingStatus(authorId, groupId, post);

    // Update group statistics
    await updateGroupStatistics(groupId);

    console.log('✅ Statistics updated successfully');
  } catch (error) {
    console.error('❌ Failed to update statistics:', error);
    throw error; // Let the caller decide how to handle this
  }
};

// Update user's posting status and activity tracking
const updateUserPostingStatus = async (authorId, groupId, post) => {
  try {
    console.log('👤 Updating user posting status...');

    // Get current user data
    const { getUserLocally } = await import('./userService');
    const currentUser = await getUserLocally();

    if (!currentUser) {
      throw new Error('Could not retrieve current user data');
    }

    if (currentUser.id !== authorId) {
      console.warn('⚠️ User ID mismatch - expected:', authorId, 'got:', currentUser.id);
      // Continue anyway but log the discrepancy
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

    console.log('💾 Updating user data:', {
      newTotalPosts: updateData.totalPosts,
      isFirstPostInGroup,
      groupsPostedLength: updateData.groupsPosted?.length || groupsPosted.length
    });

    // Update user data locally and sync to Firebase
    await updateUserLocally(updateData, true);

    // Track activity for analytics
    const activityType = isFirstPostInGroup ? 'first_post_in_group' : 'posted_in_group';
    await updateUserActivity(activityType, {
      groupId: groupId,
      postId: post.id,
      postType: post.type,
      caption: post.caption.substring(0, 50) + (post.caption.length > 50 ? '...' : '')
    });

    console.log('✅ User posting status updated');
  } catch (error) {
    console.error('❌ Failed to update user posting status:', error);
    throw error;
  }
};

// Update group statistics in Firebase
const updateGroupStatistics = async (groupId) => {
  try {
    console.log('🏠 Updating group statistics for:', groupId);

    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      totalPosts: increment(1),
      lastActivity: new Date()
    });

    console.log('✅ Group statistics updated');
  } catch (error) {
    console.error('❌ Failed to update group statistics:', error);

    // Check if it's a permissions error
    if (error.code === 'permission-denied') {
      console.warn('⚠️ Permission denied updating group stats - continuing...');
      return; // Don't throw for permission errors
    }

    throw error;
  }
};

// Validate if user is a member of the group
const validateGroupMembership = async (userId, groupId) => {
  try {
    console.log('🔒 Validating group membership...');

    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);

    if (groupDoc.exists()) {
      const groupData = groupDoc.data();
      const members = groupData.members || [];
      const isMember = members.includes(userId);

      console.log('👥 Group membership check:', {
        groupExists: true,
        totalMembers: members.length,
        isMember: isMember
      });

      return isMember;
    } else {
      console.warn('⚠️ Group does not exist:', groupId);
    return false;
    }
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

// Test the complete posts system with dual images
export const testPostsSystem = async () => {
  try {
    console.log('🧪 Testing complete posts system...');

    // Import test image function
    const { createTestImage } = await import('./imageService');
    const backTestImage = createTestImage('#FF0000', 'BACK', 200);
    const frontTestImage = createTestImage('#00FF00', 'FRONT', 200);

    if (!backTestImage || !frontTestImage) {
      throw new Error('Failed to create test images');
    }

    console.log('🎨 Test images created');

    // Test dual image post creation
    const testPost = await createPost(
      backTestImage,
      'This is a test dual camera post! 📸🔄📸',
      'Test User',
      'test_user_123',
      'TEST_GROUP',
      frontTestImage
    );

    if (!testPost) {
      throw new Error('Failed to create test post');
    }

    console.log('✅ Dual image post created successfully:', testPost.id);

    // Wait for database operations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Retrieve posts from the group
    const posts = await getGroupPosts('TEST_GROUP');
    if (posts.length === 0) {
      console.warn('⚠️ No posts retrieved - there might be a delay');
    }

    // Test user posting stats
    const userStats = await getUserPostingStats('test_user_123');

    console.log('🎉 Posts system test completed!');
    console.log('📝 Created post type:', testPost.type);
    console.log('📚 Retrieved', posts.length, 'posts');
    console.log('🖼️ Post has front image:', !!testPost.frontImageUrl);
    console.log('📊 User stats:', userStats);

    return {
      success: true,
      post: testPost,
      postsRetrieved: posts.length,
      userStats: userStats
    };
  } catch (error) {
    console.error('❌ Posts system test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
