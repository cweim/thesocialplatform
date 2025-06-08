// src/services/imageService.js
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Upload image to Firebase Storage
export const uploadImage = async (imageUri, groupId, userId) => {
  try {
    console.log('🔄 Starting image upload...');
    console.log('📁 Group:', groupId, 'User:', userId);

    // Create unique filename
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.jpg`;
    const imagePath = `groups/${groupId}/photos/${filename}`;

    console.log('📂 Upload path:', imagePath);

    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    console.log('📦 Image size:', blob.size, 'bytes');

    // Create storage reference
    const imageRef = ref(storage, imagePath);

    // Upload the image
    const snapshot = await uploadBytes(imageRef, blob);
    console.log('✅ Upload completed');

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('🔗 Download URL generated');

    return {
      downloadURL,
      path: imagePath,
      size: blob.size,
      filename
    };

  } catch (error) {
    console.error('❌ Image upload failed:', error);
    return null;
  }
};

// Create test image (simple colored square)
export const createTestImage = () => {
  // This creates a small red square as base64 data
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');

  // Fill with red color
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(0, 0, 100, 100);

  // Add some text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '20px Arial';
  ctx.fillText('TEST', 25, 55);

  return canvas.toDataURL('image/jpeg', 0.8);
};

// Test image upload
export const testImageUpload = async () => {
  try {
    console.log('🧪 Testing image upload system...');

    // Create test image
    const testImageData = createTestImage();
    console.log('🎨 Test image created');

    // Upload test image
    const result = await uploadImage(testImageData, 'TEST_GROUP', 'test_user_123');

    if (result) {
      console.log('✅ Image upload test successful!');
      console.log('🔗 Download URL:', result.downloadURL);
      console.log('📊 File size:', result.size, 'bytes');
      return result;
    } else {
      throw new Error('Upload returned null');
    }

  } catch (error) {
    console.error('❌ Image upload test failed:', error);
    return null;
  }
};
