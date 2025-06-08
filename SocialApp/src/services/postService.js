// src/services/postService.js
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { uploadImage } from './imageService';

// Create a new post with image
export const createPost = async (imageUri, caption, authorName, authorId, groupId) => {
  try {
    console.log('🔄 Creating new post...');
    console.log('👤 Author:', authorName, 'Group:', groupId);

    // First upload the image
    const imageResult = await uploadImage(imageUri, groupId, authorId);
    if (!imageResult) {
      throw new Error('Image upload failed');
    }

    // Create post data
    const postData = {
      imageUrl: imageResult.downloadURL,
      caption: caption,
      authorName: authorName,
      authorId: authorId,
      groupId: groupId,
      createdAt: new Date(),
      imageSize: imageResult.size,
      imagePath: imageResult.path
    };

    // Save post to Firestore
    const docRef = await addDoc(collection(db, 'posts'), postData);

    console.log('✅ Post created successfully:', docRef.id);
    return { id: docRef.id, ...postData };

  } catch (error) {
    console.error('❌ Failed to create post:', error);
    return null;
  }
};

// Get all posts for a group
export const getGroupPosts = async (groupId) => {
  try {
    console.log('🔄 Fetching posts for group:', groupId);

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

    console.log('✅ Retrieved', posts.length, 'posts');
    return posts;

  } catch (error) {
    console.error('❌ Failed to get posts:', error);
    return [];
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

    console.log('✅ Posts system working perfectly!');
    console.log('📝 Created post:', testPost.caption);
    console.log('📚 Retrieved', posts.length, 'posts');
    console.log('🖼️ First post image:', posts[0].imageUrl);

    return true;

  } catch (error) {
    console.error('❌ Posts system test failed:', error);
    console.log('ℹ️ Note: Sometimes there\'s a delay in Firestore queries');
    return false;
  }
};
