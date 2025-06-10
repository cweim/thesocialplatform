// src/services/imageService.js
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Configuration constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const IMAGE_QUALITY = 0.8;
const OVERLAY_SIZE_RATIO = 0.25; // Front camera overlay will be 25% of main image width

// Upload single image to Firebase Storage
export const uploadImage = async (imageUri, groupId, userId, imageType = 'main') => {
  try {
    console.log('🔄 Starting image upload...');
    console.log('📁 Group:', groupId, 'User:', userId, 'Type:', imageType);

    // Validate inputs
    if (!imageUri || !groupId || !userId) {
      throw new Error('Missing required parameters for image upload');
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

    console.log('📦 Image size:', blob.size, 'bytes');

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

    console.log('📤 Uploading to Firebase...');
    const snapshot = await uploadBytes(imageRef, blob, metadata);
    console.log('✅ Upload completed');

    // Get download URL
    console.log('🔗 Generating download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Download URL generated');

    if (!downloadURL) {
      throw new Error('Failed to generate download URL');
    }

    return {
      downloadURL,
      path: imagePath,
      size: blob.size,
      filename,
      type: imageType,
      contentType: blob.type
    };
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    if (error.code === 'storage/unauthorized') {
      throw new Error('Unauthorized to upload image. Please check your permissions.');
    } else if (error.code === 'storage/canceled') {
      throw new Error('Upload was canceled.');
    } else if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('Upload failed after multiple retries. Please check your internet connection.');
    } else if (error.code === 'storage/invalid-checksum') {
      throw new Error('Image upload failed due to corruption. Please try again.');
    } else {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }
};

// Upload dual images (BeReal-style with main + front camera overlay)
export const uploadDualImages = async (mainImageUri, frontImageUri, groupId, userId) => {
  try {
    console.log('🔄 Starting dual image upload (BeReal-style)...');

    if (!mainImageUri) {
      throw new Error('Main image is required');
    }

    const results = {};

    // Always upload main image
    results.main = await uploadImage(mainImageUri, groupId, userId, 'main');
    if (!results.main?.downloadURL) {
      throw new Error('Main image upload failed');
    }

    // Upload front image if provided
    if (frontImageUri) {
      results.front = await uploadImage(frontImageUri, groupId, userId, 'front');
      if (!results.front?.downloadURL) {
        throw new Error('Front image upload failed');
      }

      // Create composite image (optional - for BeReal-style display)
      try {
        const compositeResult = await createCompositeImage(mainImageUri, frontImageUri, groupId, userId);
        if (compositeResult) {
          results.composite = compositeResult;
        }
      } catch (compositeError) {
        console.warn('⚠️ Failed to create composite image:', compositeError);
        // Continue without composite - not critical
      }
    }

    console.log('✅ Dual image upload completed');
    return results;
  } catch (error) {
    console.error('❌ Dual image upload failed:', error);
    throw error;
  }
};

// Create BeReal-style composite image with overlay
const createCompositeImage = async (mainImageUri, frontImageUri, groupId, userId) => {
  try {
    console.log('🎨 Creating composite BeReal-style image...');

    // Only works in browser environment
    if (typeof document === 'undefined') {
      console.log('📱 Composite creation skipped on mobile');
      return null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Load main image
    const mainImg = await loadImage(mainImageUri);

    // Set canvas size to main image dimensions
    canvas.width = mainImg.width;
    canvas.height = mainImg.height;

    // Draw main image
    ctx.drawImage(mainImg, 0, 0);

    // Load and draw front camera overlay
    const frontImg = await loadImage(frontImageUri);

    // Calculate overlay size and position
    const overlayWidth = canvas.width * OVERLAY_SIZE_RATIO;
    const overlayHeight = (frontImg.height / frontImg.width) * overlayWidth;
    const overlayX = 20; // 20px from left
    const overlayY = 20; // 20px from top

    // Add border/shadow for overlay
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw front camera overlay with rounded corners
    drawRoundedImage(ctx, frontImg, overlayX, overlayY, overlayWidth, overlayHeight, 10);

    // Convert to blob
    const compositeBlob = await canvasToBlob(canvas, 'image/jpeg', IMAGE_QUALITY);

    // Upload composite image
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}_composite.jpg`;
    const imagePath = `groups/${groupId}/photos/${filename}`;

    const imageRef = ref(storage, imagePath);
    const snapshot = await uploadBytes(imageRef, compositeBlob);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('✅ Composite image created and uploaded');

    return {
      downloadURL,
      path: imagePath,
      size: compositeBlob.size,
      filename,
      type: 'composite'
    };
  } catch (error) {
    console.error('❌ Failed to create composite image:', error);
    throw error;
  }
};

// Helper function to load image from URI
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Helper function to draw rounded image
const drawRoundedImage = (ctx, img, x, y, width, height, radius) => {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();
};

// Helper function to convert canvas to blob
const canvasToBlob = (canvas, type, quality) => {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
};

// Convert image URI to blob with validation
const uriToBlob = async (imageUri) => {
  try {
    console.log('🔄 Converting URI to blob:', imageUri);

    // Handle data URLs
    if (imageUri.startsWith('data:')) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      console.log('✅ Data URL converted to blob');
      return blob;
    }

    // Handle file:// URLs
    if (imageUri.startsWith('file://')) {
      console.log('📁 Handling file:// URL');
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('✅ File URL converted to blob');
      return blob;
    }

    // Handle http(s) URLs
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      console.log('🌐 Handling http(s) URL');
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('✅ HTTP URL converted to blob');
      return blob;
    }

    throw new Error('Unsupported image URI format');
  } catch (error) {
    console.error('❌ Failed to convert URI to blob:', error);
    console.error('URI type:', typeof imageUri);
    console.error('URI length:', imageUri?.length);
    throw new Error(`Failed to process image data: ${error.message}`);
  }
};

// Validate image blob
const validateImageBlob = (blob) => {
  // Check file size
  if (blob.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(blob.type)) {
    throw new Error(`Invalid image type. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Check if blob is empty
  if (blob.size === 0) {
    throw new Error('Image file is empty');
  }
};

// Delete image from Firebase Storage
export const deleteImage = async (imagePath) => {
  try {
    console.log('🗑️ Deleting image:', imagePath);

    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);

    console.log('✅ Image deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete image:', error);
    return false;
  }
};

// Cleanup function to delete multiple images
export const deleteImages = async (imagePaths) => {
  try {
    console.log('🗑️ Deleting multiple images:', imagePaths.length);

    const deletePromises = imagePaths.map(path => deleteImage(path));
    const results = await Promise.allSettled(deletePromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Deleted ${successful}/${imagePaths.length} images`);

    return { successful, total: imagePaths.length };
  } catch (error) {
    console.error('❌ Failed to delete images:', error);
    return { successful: 0, total: imagePaths.length };
  }
};

// Compress image for better performance (browser only)
export const compressImage = async (imageUri, maxWidth = 1920, quality = IMAGE_QUALITY) => {
  try {
    if (typeof document === 'undefined') {
      // On mobile, return original image
      return imageUri;
    }

    console.log('🗜️ Compressing image...');

    const img = await loadImage(imageUri);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Calculate new dimensions while maintaining aspect ratio
    const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
    const newWidth = img.width * ratio;
    const newHeight = img.height * ratio;

    canvas.width = newWidth;
    canvas.height = newHeight;

    // Draw resized image
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Convert to data URL with compression
    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

    console.log('✅ Image compressed');
    console.log(`📊 Original: ${img.width}x${img.height}, Compressed: ${newWidth}x${newHeight}`);

    return compressedDataUrl;
  } catch (error) {
    console.error('❌ Image compression failed, using original:', error);
    return imageUri;
  }
};

// Create test image (enhanced with more options)
export const createTestImage = (color = '#FF0000', text = 'TEST', size = 100) => {
  try {
    // This creates a colored square as base64 data
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fill with specified color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // Add text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${size / 5}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(text, size / 2, size / 2 + size / 10);

    // Add timestamp for uniqueness
    ctx.font = `${size / 10}px Arial`;
    ctx.fillText(new Date().toLocaleTimeString(), size / 2, size - size / 10);

    return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
  } catch (error) {
    console.error('❌ Failed to create test image:', error);
    return null;
  }
};

// Test image upload system
export const testImageUpload = async () => {
  try {
    console.log('🧪 Testing image upload system...');

    // Create test images
    const mainTestImage = createTestImage('#FF0000', 'MAIN');
    const frontTestImage = createTestImage('#00FF00', 'FRONT');

    console.log('🎨 Test images created');

    // Test single image upload
    const singleResult = await uploadImage(mainTestImage, 'TEST_GROUP', 'test_user_123');
    console.log('✅ Single image upload test successful!');

    // Test dual image upload
    const dualResult = await uploadDualImages(mainTestImage, frontTestImage, 'TEST_GROUP', 'test_user_123');
    console.log('✅ Dual image upload test successful!');

    return {
      single: singleResult,
      dual: dualResult
    };
  } catch (error) {
    console.error('❌ Image upload test failed:', error);
    return null;
  }
};

// Get image metadata without downloading
export const getImageMetadata = (downloadURL) => {
  try {
    // Extract metadata from URL path if needed
    const url = new URL(downloadURL);
    const pathParts = url.pathname.split('/');

    return {
      downloadURL,
      pathParts,
      // Add more metadata extraction as needed
    };
  } catch (error) {
    console.error('❌ Failed to get image metadata:', error);
    return null;
  }
};
