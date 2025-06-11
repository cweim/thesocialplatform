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
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  getUserLocally,
  updateUserActivity,
  updateUserLocally,
} from "../../src/services/userService";
import { createPost } from "../../src/services/postService";

const { width } = Dimensions.get("window");

// Web-compatible alert function
const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}: ${message}`);
  } else {
    // For mobile, you could use a custom modal or Alert.alert
    alert(`${title}: ${message}`);
  }
};

export default function CaptionScreen() {
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const { imageUri, frontImageUri, groupId, groupName, firstCameraUsed } =
    useLocalSearchParams();

  console.log("=== CAPTION SCREEN DEBUG ===");
  console.log("Received params:", {
    imageUri,
    frontImageUri,
    groupId,
    groupName,
    firstCameraUsed,
  });

  // Determine which image should be main based on firstCameraUsed and toggle state
  // Logic: Show the first captured image as main by default, allow toggling
  const getMainImage = () => {
    if (!isToggled) {
      // Show first captured image as main
      return firstCameraUsed === "back" ? imageUri : frontImageUri;
    } else {
      // Show second captured image as main
      return firstCameraUsed === "back" ? frontImageUri : imageUri;
    }
  };

  const getOverlayImage = () => {
    if (!isToggled) {
      // Show second captured image as overlay
      return firstCameraUsed === "back" ? frontImageUri : imageUri;
    } else {
      // Show first captured image as overlay
      return firstCameraUsed === "back" ? imageUri : frontImageUri;
    }
  };

  const mainImageUri = getMainImage();
  const overlayImageUri = getOverlayImage();

  console.log("Image display logic:", {
    firstCameraUsed,
    isToggled,
    mainImageUri: mainImageUri?.toString().substring(0, 50) + "...",
    overlayImageUri: overlayImageUri?.toString().substring(0, 50) + "...",
  });

  const handleSubmit = async () => {
    console.log("=== STARTING POST SUBMISSION ===");

    // Clear any previous error
    setErrorMessage("");

    // Validation with detailed logging
    if (!imageUri || !frontImageUri) {
      const error = "Missing image files";
      console.error("❌ VALIDATION FAILED:", error);
      setErrorMessage("No images found. Please retake your photos.");
      showAlert("Error", "No images found. Please retake your photos.");
      return;
    }

    if (caption.trim().length === 0) {
      const error = "Empty caption";
      console.error("❌ VALIDATION FAILED:", error);
      setErrorMessage("Please write a caption for your photo.");
      showAlert("Error", "Please write a caption for your photo.");
      return;
    }

    if (!groupId) {
      const error = "No group selected";
      console.error("❌ VALIDATION FAILED:", error);
      setErrorMessage("No group selected. Please try again.");
      showAlert("Error", "No group selected. Please try again.");
      return;
    }

    console.log("✅ Initial validation passed");

    setIsUploading(true);
    try {
      console.log("🔄 Starting photo upload process...");

      // Get current user with validation
      const user = await getUserLocally();
      if (!user) {
        throw new Error("User not found. Please log in again.");
      }

      console.log("👤 User validated:", user.name, "ID:", user.id);
      console.log("📝 Caption length:", caption.trim().length);
      console.log(
        "🖼️ Back camera image:",
        imageUri?.toString().substring(0, 50) + "..."
      );
      console.log(
        "🖼️ Front camera image:",
        frontImageUri?.toString().substring(0, 50) + "..."
      );
      console.log("🎯 Target group:", groupId, "-", groupName);

      // Check if this is user's first post in this group
      const groupsPosted = user.groupsPosted || [];
      const isFirstPostInGroup = !groupsPosted.includes(groupId as string);

      console.log("📊 User posting status:", {
        totalGroupsPosted: groupsPosted.length,
        isFirstPostInGroup,
        groupsPosted: groupsPosted,
      });

      // Create the post with both images
      // Always pass back camera image as first parameter (imageUri)
      // and front camera image as frontImageUri for consistency
      console.log("📤 Calling createPost...");
      const newPost = await createPost(
        imageUri as string,
        caption.trim(),
        user.name,
        user.id,
        groupId as string,
        (frontImageUri ? (frontImageUri as string) : null) as null | undefined
      );

      if (!newPost) {
        throw new Error("Failed to create post - no result returned");
      }

      console.log("✅ Post created successfully:", newPost.id);

      // Update user status if this is their first post in this group
      if (isFirstPostInGroup) {
        console.log("🔓 Updating user's groups posted list...");

        const updatedGroupsPosted = [...groupsPosted, groupId as string];

        await updateUserLocally(
          {
            groupsPosted: updatedGroupsPosted,
            hasUploaded: true,
          },
          true
        );

        await updateUserActivity("first_post_in_group", {
          groupId: groupId,
          groupName: groupName,
        });

        console.log("✅ User groups posted status updated");
      } else {
        await updateUserActivity("posted_in_group", {
          groupId: groupId,
          groupName: groupName,
        });
      }

      // Show success overlay
      setIsUploading(false);
      setShowSuccessOverlay(true);

      // Auto-navigate after 3 seconds
      setTimeout(() => {
        router.replace({
          pathname: "/screens/GroupFeedScreen",
          params: { groupId, groupName },
        });
      }, 3000);
    } catch (error) {
      console.error("❌ Error uploading photo:", error);

      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error details:", errorMsg);

      setErrorMessage(errorMsg);
      showAlert(
        "Upload Failed",
        `${errorMsg}\n\nPlease check your connection and try again.`
      );
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const goToFeedNow = () => {
    router.replace({
      pathname: "/screens/GroupFeedScreen",
      params: { groupId, groupName },
    });
  };

  // Check if this is first post in this specific group
  const checkIsFirstPostInGroup = async () => {
    try {
      const user = await getUserLocally();
      if (!user || !groupId) return false;

      const groupsPosted = user.groupsPosted || [];
      return !groupsPosted.includes(groupId as string);
    } catch (error) {
      return false;
    }
  };

  const [isFirstPostInGroup, setIsFirstPostInGroup] = useState(false);

  React.useEffect(() => {
    checkIsFirstPostInGroup().then(setIsFirstPostInGroup);
  }, [groupId]);

  const toggleImages = () => {
    console.log("🔄 Toggling images - was:", isToggled, "now:", !isToggled);
    setIsToggled(!isToggled);
  };

  // Determine which camera was used for main vs overlay for display labels
  const getImageLabels = () => {
    if (!isToggled) {
      return {
        main: firstCameraUsed === "back" ? "Back Camera" : "Front Camera",
        overlay: firstCameraUsed === "back" ? "Front Camera" : "Back Camera",
      };
    } else {
      return {
        main: firstCameraUsed === "back" ? "Front Camera" : "Back Camera",
        overlay: firstCameraUsed === "back" ? "Back Camera" : "Front Camera",
      };
    }
  };

  const imageLabels = getImageLabels();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Add Caption</Text>
            <Text style={styles.groupIndicator}>{groupName}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.shareButton,
              { opacity: caption.trim().length === 0 ? 0.5 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={isUploading || caption.trim().length === 0}
          >
            {isUploading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.shareButtonText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Error Display */}
          {errorMessage !== "" && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Image Preview */}
          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={toggleImages} activeOpacity={0.9}>
              <Image
                source={{ uri: mainImageUri as string }}
                style={styles.image}
                onError={() => {
                  console.error("❌ Main image failed to load:", mainImageUri);
                  setErrorMessage("Failed to load main image");
                }}
              />
              {/* Small overlay image */}
              <View style={styles.overlayContainer}>
                <Image
                  source={{ uri: overlayImageUri as string }}
                  style={styles.overlayImage}
                  onError={() => {
                    console.error(
                      "❌ Overlay image failed to load:",
                      overlayImageUri
                    );
                    setErrorMessage("Failed to load overlay image");
                  }}
                />
              </View>
            </TouchableOpacity>

            {/* Image Toggle Instructions */}
            <View style={styles.toggleInstructions}>
              <Text style={styles.toggleText}>
                📸 Main: {imageLabels.main} • Tap to switch
              </Text>
            </View>

            {isFirstPostInGroup && (
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
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={caption}
              onChangeText={(text) => {
                setCaption(text);
                if (errorMessage) setErrorMessage(""); // Clear error when user types
              }}
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
          {isFirstPostInGroup && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                🔓 This will unlock this group's feed!
              </Text>
              <Text style={styles.infoText}>
                Once you share this photo, you'll be able to see and interact
                with all the photos in "{groupName}".
              </Text>
            </View>
          )}

          {/* Extra padding at bottom */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Upload Progress Overlay */}
        {isUploading && (
          <View style={styles.uploadOverlay}>
            <View style={styles.uploadCard}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.uploadText}>
                {isFirstPostInGroup
                  ? "Uploading your first photo to this group..."
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
                {isFirstPostInGroup
                  ? `Your first photo has been uploaded to "${groupName}"!\nThis group's feed is now unlocked!`
                  : `Your photo has been added to "${groupName}"!`}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  groupIndicator: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  shareButton: {
    backgroundColor: "white",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  shareButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: "#FF4444",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  imageContainer: {
    marginTop: 20,
    marginBottom: 24,
    position: "relative",
  },
  image: {
    width: "100%",
    height: width * 1.2,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
  },
  toggleInstructions: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleText: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  firstUploadBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#333333",
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
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333333",
  },
  captionInput: {
    fontSize: 16,
    lineHeight: 22,
    color: "white",
    minHeight: 100,
    maxHeight: 200,
  },
  characterCount: {
    textAlign: "right",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333333",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  uploadCard: {
    backgroundColor: "#1a1a1a",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: "#333333",
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginTop: 16,
    textAlign: "center",
  },
  uploadSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 8,
    textAlign: "center",
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  successCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    maxWidth: 350,
    width: "100%",
    borderWidth: 1,
    borderColor: "#333333",
  },
  successEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  successButtonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
  autoNavText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  overlayContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  overlayImage: {
    width: "100%",
    height: "100%",
  },
});
