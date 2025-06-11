// app/screens/CameraScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { getUserLocally } from "../../src/services/userService";
import { showAlert } from "../../src/utils/alert";

const { width, height } = Dimensions.get("window");

export default function CameraScreen() {
  const [user, setUser] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstPostInGroup, setIsFirstPostInGroup] = useState(false);
  const [captureMode, setCaptureMode] = useState<
    "ready" | "capturing" | "second"
  >("ready");
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  // Get group info from navigation params
  const params = useLocalSearchParams();
  const groupId = params.groupId as string;
  const groupName = params.groupName as string;

  const [firstCameraUsed, setFirstCameraUsed] = useState<CameraType | null>(
    null
  );

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const currentUser = await getUserLocally();
      setUser(currentUser);

      if (currentUser && groupId) {
        // Check if user has posted in this specific group
        const groupsPosted = currentUser.groupsPosted || [];
        const hasPostedInGroup = groupsPosted.includes(groupId);
        setIsFirstPostInGroup(!hasPostedInGroup);

        console.log("📷 Camera for group:", groupName);
        console.log("🔍 First post in this group:", !hasPostedInGroup);
      }
    } catch (error) {
      console.error("❌ Error loading user:", error);
    }
  };

  const takeDualPhoto = async () => {
    if (!cameraRef.current) {
      showAlert("Error", "Camera not ready");
      return;
    }

    // Determine which camera to use first based on current facing
    const firstCamera = facing;
    const secondCamera = facing === "back" ? "front" : "back";

    // Set this BEFORE starting the capture process
    setFirstCameraUsed(firstCamera);
    setIsLoading(true);
    setCaptureMode("capturing");

    try {
      console.log("📸 Starting dual camera capture...");
      console.log("🎯 First camera:", firstCamera);

      // Step 1: Take first photo with current camera
      const firstPhoto = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (firstPhoto?.uri) {
        if (firstCamera === "back") {
          setBackPhoto(firstPhoto.uri);
        } else {
          setFrontPhoto(firstPhoto.uri);
        }
        console.log(`✅ ${firstCamera} camera photo taken`);

        // Step 2: Switch to second camera
        console.log("🔄 Switching to:", secondCamera);
        setFacing(secondCamera);
        setCaptureMode("second");

        // Wait for camera to initialize with a longer delay
        console.log("⏳ Waiting for camera to initialize...");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Increased to 1 second

        // Additional wait for camera to stabilize
        console.log("⏳ Waiting for camera to stabilize...");
        await new Promise((resolve) => setTimeout(resolve, 500)); // Additional 500ms

        // Step 3: Take second photo with adjusted settings
        console.log("📸 Taking second photo...");
        const secondPhoto = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          // Add camera settings to help with color balance
          exif: true,
          skipProcessing: false, // Ensure image processing is applied
        });

        if (secondPhoto?.uri) {
          console.log("✅ Second photo taken successfully");
          if (secondCamera === "back") {
            setBackPhoto(secondPhoto.uri);
          } else {
            setFrontPhoto(secondPhoto.uri);
          }

          // Navigate to caption screen with both photos
          console.log("🔄 Navigating to caption screen...");
          router.push({
            pathname: "/screens/CaptionScreen",
            params: {
              imageUri:
                firstCamera === "back" ? firstPhoto.uri : secondPhoto.uri,
              frontImageUri:
                firstCamera === "front" ? firstPhoto.uri : secondPhoto.uri,
              groupId: groupId,
              groupName: groupName,
              firstCameraUsed: firstCamera,
            },
          });
        } else {
          console.log("❌ Second photo capture failed");
          throw new Error("Failed to capture second photo");
        }
      }
    } catch (error) {
      console.error("❌ Error taking dual photo:", error);
      showAlert("Error", "Failed to take photos. Please try again.");
      // Reset state
      setBackPhoto(null);
      setFrontPhoto(null);
      setCaptureMode("ready");
      setFacing("back");
      setFirstCameraUsed(null);
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromGallery = async () => {
    setIsLoading(true);
    try {
      console.log("📱 Opening image picker...");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log("✅ Image selected from gallery:", result.assets[0].uri);

        router.push({
          pathname: "/screens/CaptionScreen",
          params: {
            imageUri: result.assets[0].uri,
            groupId: groupId,
            groupName: groupName,
          },
        });
      }
    } catch (error) {
      console.error("❌ Error selecting image:", error);
      showAlert("Error", "Failed to select image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  const toggleCamera = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  // Permission loading state
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionMessage}>
            This app needs camera access to let you take photos for your group.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={selectFromGallery}
          >
            <Text style={styles.galleryButtonText}>
              Choose from Gallery Instead
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isFirstPostInGroup ? "First Photo!" : "BeYou Moment"}
            </Text>
            <Text style={styles.groupName}>{groupName}</Text>
          </View>
          <TouchableOpacity
            style={styles.galleryHeaderButton}
            onPress={selectFromGallery}
          >
            <Text style={styles.galleryHeaderText}>📁</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          {/* Capture Progress Indicator */}
          {captureMode !== "ready" && (
            <View style={styles.captureProgressOverlay}>
              <View style={styles.progressCard}>
                <ActivityIndicator size="large" color="white" />
              </View>
            </View>
          )}

          {/* First Upload Welcome */}
          {isFirstPostInGroup && captureMode === "ready" && (
            <View style={styles.welcomeOverlay}>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeText}>
                  Welcome to {groupName}! 👋
                </Text>
                <Text style={styles.welcomeSubtext}>
                  Take your first BeYou moment to unlock this group's feed
                </Text>
              </View>
            </View>
          )}
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Text style={styles.instructionsText}>
          {captureMode === "ready"
            ? "Tap to capture front & back camera"
            : "Taking BeYou moment..."}
        </Text>

        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCamera}
            disabled={isLoading || captureMode !== "ready"}
          >
            <Text style={styles.flipButtonText}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.captureButton,
              (isLoading || captureMode !== "ready") &&
                styles.captureButtonDisabled,
            ]}
            onPress={takeDualPhoto}
            disabled={isLoading || captureMode !== "ready"}
          >
            {isLoading ? (
              <ActivityIndicator color="black" size="large" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>

          <View style={styles.placeholder} />
        </View>

        <Text style={styles.beyouText}>BeYou</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 24,
  },
  permissionContent: {
    alignItems: "center",
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 16,
  },
  permissionMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "600",
  },
  galleryButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  galleryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  headerSafe: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "300",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  groupName: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  galleryHeaderButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryHeaderText: {
    fontSize: 18,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  captureProgressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  welcomeOverlay: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
  },
  welcomeCard: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  welcomeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  controls: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  instructionsText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "black",
  },
  beyouText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 2,
  },
  cameraControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  flipButtonText: {
    fontSize: 24,
  },
  placeholder: {
    width: 50, // Same width as flip button for symmetry
  },
});
