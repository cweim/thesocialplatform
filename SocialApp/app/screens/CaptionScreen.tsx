// app/screens/CaptionScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  getUserLocally,
  updateUserUploadStatus,
} from "../../src/services/userService";
import { createPost } from "../../src/services/postService";

const { width } = Dimensions.get("window");

export default function CaptionScreen() {
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const router = useRouter();
  const { imageUri, isFirstUpload } = useLocalSearchParams();

  const handleSubmit = async () => {
    if (!imageUri) {
      alert("No image selected");
      return;
    }

    if (caption.trim().length === 0) {
      alert("Please write something about your photo!");
      return;
    }

    setIsUploading(true);

    try {
      console.log("🔄 Starting photo upload process...");

      // Get current user
      const user = await getUserLocally();
      if (!user) {
        throw new Error("User not found");
      }

      console.log("👤 User:", user.name, "Group:", user.groupId);
      console.log("📝 Caption:", caption.trim());
      console.log("🖼️ Image URI:", imageUri);

      // Create the post (this handles image upload + database entry)
      const newPost = await createPost(
        imageUri as string,
        caption.trim(),
        user.name,
        user.id,
        user.groupId
      );

      if (!newPost) {
        throw new Error("Failed to create post");
      }

      console.log("✅ Post created successfully:", newPost.id);

      // If this is the user's first upload, update their status
      if (isFirstUpload === "true") {
        console.log("🔓 Updating user upload status (unlocking feed)...");
        await updateUserUploadStatus(user.id, true);
        console.log("✅ User upload status updated");
      }

      // Show success overlay instead of alert
      setIsUploading(false);
      setShowSuccessOverlay(true);

      // Auto-navigate after 3 seconds
      setTimeout(() => {
        router.replace("/screens/GroupFeedScreen");
      }, 3000);
    } catch (error) {
      console.error("❌ Error uploading photo:", error);
      alert(
        `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }\n\nPlease check your connection and try again.`
      );
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if (typeof window !== "undefined") {
      const shouldDiscard = window.confirm(
        "Discard Photo?\n\nAre you sure you want to go back? Your photo will be lost."
      );
      if (shouldDiscard) {
        router.back();
      }
    } else {
      // Mobile fallback
      router.back();
    }
  };

  const goToFeedNow = () => {
    router.replace("/screens/GroupFeedScreen");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={isUploading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Add Caption</Text>

        <TouchableOpacity
          style={[
            styles.shareButton,
            { opacity: caption.trim().length === 0 ? 0.5 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={isUploading || caption.trim().length === 0}
        >
          {isUploading ? (
            <ActivityIndicator color="#667eea" size="small" />
          ) : (
            <Text style={styles.shareButtonText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri as string }} style={styles.image} />
          {isFirstUpload === "true" && (
            <View style={styles.firstUploadBadge}>
              <Text style={styles.firstUploadBadgeText}>🎉 First Photo!</Text>
            </View>
          )}
        </View>

        {/* Caption Input */}
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption for your photo..."
            placeholderTextColor="#999"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
            autoFocus={true}
            textAlignVertical="top"
          />

          <Text style={styles.characterCount}>
            {caption.length}/500 characters
          </Text>
        </View>

        {/* First Upload Info */}
        {isFirstUpload === "true" && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              🔓 This will unlock your group feed!
            </Text>
            <Text style={styles.infoText}>
              Once you share this photo, you'll be able to see and interact with
              all the photos in your group.
            </Text>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips for great captions:</Text>
          <Text style={styles.tipItem}>
            • Describe what's happening in the photo
          </Text>
          <Text style={styles.tipItem}>
            • Share the story behind the moment
          </Text>
          <Text style={styles.tipItem}>
            • Ask questions to spark conversation
          </Text>
          <Text style={styles.tipItem}>• Use emojis to add personality</Text>
        </View>
      </ScrollView>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.uploadText}>
              {isFirstUpload === "true"
                ? "Uploading your first photo..."
                : "Uploading photo..."}
            </Text>
            <Text style={styles.uploadSubtext}>
              This may take a moment depending on your connection
            </Text>
          </View>
        </View>
      )}

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Photo Shared!</Text>
            <Text style={styles.successMessage}>
              {isFirstUpload === "true"
                ? "Your first photo has been uploaded!\nThe group feed is now unlocked!"
                : "Your photo has been added to the group!"}
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              onPress={goToFeedNow}
            >
              <Text style={styles.successButtonText}>View Feed</Text>
            </TouchableOpacity>

            <Text style={styles.autoNavText}>
              Auto-redirecting in 3 seconds...
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  shareButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  shareButtonText: {
    color: "#667eea",
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    marginTop: 20,
    marginBottom: 24,
    position: "relative",
  },
  image: {
    width: "100%",
    height: width * 0.75, // 4:3 aspect ratio
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  firstUploadBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#28a745",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  firstUploadBadgeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  captionContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  captionInput: {
    fontSize: 16,
    lineHeight: 22,
    color: "#333",
    minHeight: 100,
    maxHeight: 200,
  },
  characterCount: {
    textAlign: "right",
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: "#e8f5e8",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#155724",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#155724",
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: "#fff3cd",
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 4,
    lineHeight: 18,
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  uploadCard: {
    backgroundColor: "white",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: 300,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  successCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    maxWidth: 350,
    width: "100%",
  },
  successEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#555",
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: "#667eea",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  successButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  autoNavText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
