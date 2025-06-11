// src/services/imageService.js
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Configuration constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const IMAGE_QUALITY = 0.8;

// Upload single image to Firebase Storage
export const uploadImage = async (imageUri, groupId, userId, imageType = 'main') => {
  try {
    console.log('=== SINGLE IMAGE UPLOAD START ===');
    console.log('📁 Group:', groupId, 'User:', userId, 'Type:', imageType);
    console.log('📸 Image URI:', imageUri?.substring(0, 50) + '...');

    // Validate inputs
    if (!imageUri) {
      throw new Error('Image URI is required');
    }
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Create unique filename with type indicator
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `${userId}_${timestamp}_${imageType}_${randomId}.jpg`;
    const imagePath = `groups/${groupId}/photos/${filename}`;

    console.log('📂 Upload path:', imagePath);

    // Convert image URI to blob and validate
    console.log('🔄 Converting image to blob...');
    const blob = await uriToBlob(imageUri);
    validateImageBlob(blob);

    console.log('📦 Image blob created - Size:', blob.size, 'bytes, Type:', blob.type);

    // Create storage reference
    const imageRef = ref(storage, imagePath);

    // Upload the image with metadata
    const metadata = {
      contentType: blob.type,
      customMetadata: {
        groupId: groupId,
        userId: userId,
        imageType: imageType,
        uploadedAt: new Date().toISOString()
      }
    };

    console.log('📤 Uploading to Firebase Storage...');
    const snapshot = await uploadBytes(imageRef, blob, metadata);
    console.log('✅ Upload completed to:', snapshot.ref.fullPath);

    // Get download URL
    console.log('🔗 Generating download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Download URL generated:', downloadURL.substring(0, 50) + '...');

    if (!downloadURL) {
      throw new Error('Failed to generate download URL');
    }

    const result = {
      downloadURL,
      path: imagePath,
      size: blob.size,
      filename,
      type: imageType,
      contentType: blob.type
    };

    console.log('🎉 Single image upload completed successfully');
    return result;

  } catch (error) {
    console.error('❌ Single image upload failed:', error);

    // Handle specific Firebase Storage errors
    if (error.code === 'storage/unauthorized') {
      throw new Error('Unauthorized to upload image. Please check your permissions.');
    } else if (error.code === 'storage/canceled') {
      throw new Error('Upload was canceled.');
    } else if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('Upload failed after multiple retries. Please check your internet connection.');
    } else if (error.code === 'storage/invalid-checksum') {
      throw new Error('Image upload failed due to corruption. Please try again.');
    } else {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }
};

// Upload dual images (back + front camera) with robust error handling
export const uploadDualImages = async (backImageUri, frontImageUri, groupId, userId) => {
  try {
    console.log('=== DUAL IMAGE UPLOAD START ===');
    console.log('📸 Back camera URI:', backImageUri?.substring(0, 50) + '...');
    console.log('📸 Front camera URI:', frontImageUri?.substring(0, 50) + '...');
    console.log('🎯 Target: Group', groupId, 'User', userId);

    // Validate inputs
    if (!backImageUri) {
      throw new Error('Back camera image URI is required');
    }
    if (!frontImageUri) {
      throw new Error('Front camera image URI is required');
    }
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    const results = {};

    // Step 1: Upload back camera image (main image)
    console.log('⏳ Step 1: Uploading back camera image...');
    try {
      results.main = await uploadImage(backImageUri, groupId, userId, 'main');
      console.log('✅ Back camera upload completed:', !!results.main?.downloadURL);
    } catch (mainError) {
      console.error('❌ Back camera upload failed:', mainError);
      throw new Error(`Back camera upload failed: ${mainError.message}`);
    }

    // Validate main upload result
    if (!results.main?.downloadURL) {
      throw new Error('Back camera upload failed - no download URL received');
    }

    // Step 2: Upload front camera image
    console.log('⏳ Step 2: Uploading front camera image...');
    try {
      results.front = await uploadImage(frontImageUri, groupId, userId, 'front');
      console.log('✅ Front camera upload completed:', !!results.front?.downloadURL);
    } catch (frontError) {
      console.error('❌ Front camera upload failed:', frontError);

      // Try to cleanup the main image if front fails
      try {
        console.log('🧹 Cleaning up main image due to front upload failure...');
        await deleteImage(results.main.path);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup main image:', cleanupError);
      }

      throw new Error(`Front camera upload failed: ${frontError.message}`);
    }

    // Validate front upload result
    if (!results.front?.downloadURL) {
      throw new Error('Front camera upload failed - no download URL received');
    }

    // Final validation
    console.log('🔍 Final validation...');
    if (!results.main.downloadURL || !results.front.downloadURL) {
      throw new Error('One or both image uploads failed validation');
    }

    console.log('🎉 Dual image upload completed successfully!');
    console.log('📊 Upload summary:', {
      mainSize: results.main.size,
      frontSize: results.front.size,
      totalSize: results.main.size + results.front.size
    });

    return results;

  } catch (error) {
    console.error('❌ DUAL IMAGE UPLOAD FAILED:', error);
    console.error('Error details:', error.message);

    // Re-throw with more context
    throw new Error(`Dual image upload failed: ${error.message}`);
  }
};

// Convert image URI to blob with comprehensive error handling
const uriToBlob = async (imageUri) => {
  try {
    console.log('🔄 Converting URI to blob...');
    console.log('📝 URI type:', typeof imageUri);
    console.log('📏 URI length:', imageUri?.length);
    console.log('🎯 URI format:', imageUri?.substring(0, 20) + '...');

    if (!imageUri) {
      throw new Error('Image URI is null or undefined');
    }

    // Handle data URLs (base64 encoded images)
    if (imageUri.startsWith('data:')) {
      console.log('📝 Processing data URL...');
      try {
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Data URL fetch failed: ${response.status}`);
        }
        const blob = await response.blob();
        console.log('✅ Data URL converted to blob, size:', blob.size);
        return blob;
      } catch (dataError) {
        console.error('❌ Data URL processing failed:', dataError);
        throw new Error(`Failed to process data URL: ${dataError.message}`);
      }
    }

    // Handle file:// URLs (mobile camera captures)
    if (imageUri.startsWith('file://')) {
      console.log('📁 Processing file:// URL...');
      return await handleFileUri(imageUri);
    }

    // Handle http(s) URLs
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      console.log('🌐 Processing HTTP URL...');
      try {
        const response = await fetch(imageUri, {
          method: 'GET',
          cache: 'no-cache'
        });

        if (!response.ok) {
          throw new Error(`HTTP fetch failed: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log('✅ HTTP URL converted to blob, size:', blob.size);
        return blob;
      } catch (httpError) {
        console.error('❌ HTTP URL processing failed:', httpError);
        throw new Error(`Failed to process HTTP URL: ${httpError.message}`);
      }
    }

    // Unsupported URI format
    console.error('❌ Unsupported URI format:', imageUri.substring(0, 50));
    throw new Error(`Unsupported image URI format: ${imageUri.substring(0, 20)}...`);

  } catch (error) {
    console.error('❌ URI to blob conversion failed:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

// Handle file:// URIs with multiple fallback methods
const handleFileUri = async (fileUri) => {
  console.log('📁 Handling file URI with multiple fallback methods...');

  const fetchMethods = [
    {
      name: 'Simple fetch',
      options: {
        method: 'GET',
        cache: 'no-cache',
        credentials: 'omit',
      }
    },
    {
      name: 'With headers',
      options: {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
        cache: 'no-cache',
        credentials: 'omit',
      }
    },
    {
      name: 'With specific headers',
      options: {
        method: 'GET',
        headers: {
          'Accept': 'image/jpeg,image/png,image/*',
          'Content-Type': 'image/jpeg',
        },
        cache: 'no-cache',
        credentials: 'omit',
      }
    },
    {
      name: 'Minimal options',
      options: {
        cache: 'no-cache'
      }
    }
  ];

  let lastError;

  for (let i = 0; i < fetchMethods.length; i++) {
    const method = fetchMethods[i];
    try {
      console.log(`🔄 Trying method ${i + 1}/${fetchMethods.length}: ${method.name}`);

      const response = await fetch(fileUri, method.options);

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Received empty blob');
      }

      console.log(`✅ Method ${i + 1} succeeded - blob size:`, blob.size);
      return blob;

    } catch (error) {
      console.log(`❌ Method ${i + 1} failed:`, error.message);
      lastError = error;

      // Wait a bit before trying the next method
      if (i < fetchMethods.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  // All methods failed
  console.error('❌ All file URI processing methods failed');
  throw new Error(`Failed to process file URI after ${fetchMethods.length} attempts. Last error: ${lastError?.message}`);
};

// Validate image blob with comprehensive checks
const validateImageBlob = (blob) => {
  console.log('🔍 Validating image blob...');

  // Check if blob exists
  if (!blob) {
    throw new Error('Image blob is null or undefined');
  }

  // Check blob size
  if (blob.size === 0) {
    throw new Error('Image file is empty (0 bytes)');
  }

  if (blob.size > MAX_IMAGE_SIZE) {
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_IMAGE_SIZE / (1024 * 1024)).toFixed(0);
    throw new Error(`Image too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB`);
  }

  // Check file type
  if (!blob.type) {
    console.warn('⚠️ Blob has no content type, assuming image/jpeg');
    // Don't throw - some mobile platforms don't set content-type
  } else if (!ALLOWED_TYPES.includes(blob.type)) {
    throw new Error(`Invalid image type (${blob.type}). Allowed types: ${ALLOWED_TYPES.join(', ')}`);
  }

  console.log('✅ Image blob validation passed:', {
    size: blob.size,
    type: blob.type || 'unknown'
  });
};

// Delete image from Firebase Storage
export const deleteImage = async (imagePath) => {
  try {
    console.log('🗑️ Deleting image:', imagePath);

    if (!imagePath) {
      throw new Error('Image path is required');
    }

    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);

    console.log('✅ Image deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete image:', error);

    if (error.code === 'storage/object-not-found') {
      console.log('ℹ️ Image was already deleted or never existed');
      return true; // Consider this a success
    }

    return false;
  }
};

// Cleanup function to delete multiple images
export const deleteImages = async (imagePaths) => {
  try {
    console.log('🗑️ Deleting multiple images:', imagePaths.length);

    if (!imagePaths || imagePaths.length === 0) {
      console.log('ℹ️ No images to delete');
      return { successful: 0, total: 0 };
    }

    const deletePromises = imagePaths.map(path => deleteImage(path));
    const results = await Promise.allSettled(deletePromises);

    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    console.log(`✅ Deleted ${successful}/${imagePaths.length} images`);

    return { successful, total: imagePaths.length };
  } catch (error) {
    console.error('❌ Failed to delete images:', error);
    return { successful: 0, total: imagePaths.length };
  }
};

// Create test image for development/testing
export const createTestImage = (color = '#FF0000', text = 'TEST', size = 200) => {
  try {
    console.log('🎨 Creating test image:', { color, text, size });

    // Check if we're in a browser environment
    if (typeof document === 'undefined') {
      console.warn('⚠️ Cannot create test image - not in browser environment');
      return null;
    }

    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fill background with specified color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // Add main text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${size / 6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2 - size / 8);

    // Add timestamp for uniqueness
    ctx.font = `${size / 12}px Arial`;
    const timestamp = new Date().toLocaleTimeString();
    ctx.fillText(timestamp, size / 2, size / 2 + size / 6);

    // Add size indicator
    ctx.font = `${size / 15}px Arial`;
    ctx.fillText(`${size}x${size}`, size / 2, size - size / 15);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
    console.log('✅ Test image created:', dataUrl.substring(0, 50) + '...');
    return dataUrl;

  } catch (error) {
    console.error('❌ Failed to create test image:', error);
    return null;
  }
};

// Test the image upload system
export const testImageUpload = async () => {
  try {
    console.log('🧪 Testing image upload system...');

    // Create test images
    const backTestImage = createTestImage('#FF0000', 'BACK', 200);
    const frontTestImage = createTestImage('#00FF00', 'FRONT', 200);

    if (!backTestImage || !frontTestImage) {
      throw new Error('Failed to create test images');
    }

    console.log('🎨 Test images created successfully');

    // Test single image upload
    console.log('📤 Testing single image upload...');
    const singleResult = await uploadImage(backTestImage, 'TEST_GROUP', 'test_user_123', 'test');
    console.log('✅ Single image upload test successful!');

    // Test dual image upload
    console.log('📤 Testing dual image upload...');
    const dualResult = await uploadDualImages(backTestImage, frontTestImage, 'TEST_GROUP', 'test_user_123');
    console.log('✅ Dual image upload test successful!');

    console.log('🎉 All image upload tests passed!');
    return {
      success: true,
      single: singleResult,
      dual: dualResult
    };
  } catch (error) {
    console.error('❌ Image upload test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get image metadata from download URL
export const getImageMetadata = (downloadURL) => {
  try {
    if (!downloadURL) {
      return null;
    }

    const url = new URL(downloadURL);
    const pathParts = url.pathname.split('/');

    return {
      downloadURL,
      pathParts,
      host: url.host,
      pathname: url.pathname
    };
  } catch (error) {
    console.error('❌ Failed to get image metadata:', error);
    return null;
  }
};
