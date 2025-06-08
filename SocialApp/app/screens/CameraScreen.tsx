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
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { getUserLocally } from "../../src/services/userService";

const { width, height } = Dimensions.get("window");

export default function CameraScreen() {
  const [user, setUser] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstUpload, setIsFirstUpload] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      // Load user info
      const currentUser = await getUserLocally();
      setUser(currentUser);

      if (currentUser && !currentUser.hasUploaded) {
        setIsFirstUpload(true);
        console.log("📷 First upload for user:", currentUser.name);
      }
    } catch (error) {
      console.error("❌ Error loading user:", error);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      Alert.alert("Error", "Camera not ready");
      return;
    }

    setIsLoading(true);
    try {
      console.log("📸 Taking picture...");

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      console.log("✅ Picture taken:", photo?.uri);

      if (photo?.uri) {
        // Navigate to caption screen with photo
        router.push({
          pathname: "/screens/CaptionScreen",
          params: {
            imageUri: photo.uri,
            isFirstUpload: isFirstUpload.toString(),
          },
        });
      }
    } catch (error) {
      console.error("❌ Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture. Please try again.");
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
            isFirstUpload: isFirstUpload.toString(),
          },
        });
      }
    } catch (error) {
      console.error("❌ Error selecting image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const goBack = () => {
    if (isFirstUpload) {
      // First upload users must take a photo - go back to feed (locked)
      router.back();
    } else {
      // Returning users can go back to feed
      router.back();
    }
  };

  // Permission loading state
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
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
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFirstUpload ? "First Photo!" : "Take Photo"}
        </Text>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={toggleCameraFacing}
        >
          <Text style={styles.flipButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          {/* First Upload Overlay Message */}
          {isFirstUpload && (
            <View style={styles.firstUploadOverlay}>
              <Text style={styles.firstUploadText}>
                Welcome {user?.name}! 👋
              </Text>
              <Text style={styles.firstUploadSubtext}>
                Take your first photo to unlock the group feed
              </Text>
            </View>
          )}
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Gallery Button */}
        <TouchableOpacity
          style={styles.galleryControlButton}
          onPress={selectFromGallery}
          disabled={isLoading}
        >
          <Text style={styles.controlButtonText}>📁</Text>
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            isLoading && styles.captureButtonDisabled,
          ]}
          onPress={takePicture}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="large" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        {/* Flip Camera Button */}
        <TouchableOpacity
          style={styles.flipControlButton}
          onPress={toggleCameraFacing}
          disabled={isLoading}
        >
          <Text style={styles.controlButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          {isFirstUpload
            ? "This will unlock your group feed!"
            : "Add another photo to your group"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  permissionMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: "#667eea",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  galleryButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#667eea",
  },
  galleryButtonText: {
    color: "#667eea",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  flipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  flipButtonText: {
    fontSize: 20,
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  firstUploadOverlay: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(102, 126, 234, 0.9)",
    padding: 16,
    borderRadius: 12,
  },
  firstUploadText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  firstUploadSubtext: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  galleryControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  flipControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonText: {
    fontSize: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  instructionsContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  instructionsText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
});
