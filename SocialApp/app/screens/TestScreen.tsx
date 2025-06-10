// app/screens/TestScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  clearAllTestData,
  getUserLocally,
  getUserStats,
} from "../../src/services/userService";

export default function TestScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info", // 'info' or 'error'
  });
  const router = useRouter();

  React.useEffect(() => {
    loadCurrentUserInfo();
  }, []);

  const loadCurrentUserInfo = async () => {
    try {
      const user = await getUserLocally();
      const stats = await getUserStats();
      setUserInfo({ user, stats });
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  };

  const showModal = (
    title: string,
    message: string,
    type: "info" | "error" = "info"
  ) => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const handleResetAsNewUser = async () => {
    showModal(
      "Reset as New User",
      "This will clear all your data and reset you as a new user. Are you sure?",
      "info"
    );
  };

  const handleConfirmReset = async () => {
    setModalVisible(false);
    setIsLoading(true);
    try {
      console.log("🧹 Starting reset process...");
      console.log("Current user before reset:", await getUserLocally());

      const success = await clearAllTestData();
      console.log("Reset operation result:", success);

      if (success) {
        console.log("✅ All data cleared successfully");
        console.log("User after reset:", await getUserLocally());
        router.replace("/screens/WelcomeScreen");
      } else {
        throw new Error("Failed to clear data");
      }
    } catch (error) {
      console.error("❌ Error resetting user:", error);
      showModal(
        "Error",
        "Failed to reset user data. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToGroupsOverview = () => {
    router.push("/screens/GroupsOverviewScreen");
  };

  const handleGoToWelcomeScreen = () => {
    router.push("/screens/WelcomeScreen");
  };

  const refreshUserInfo = () => {
    loadCurrentUserInfo();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Testing & Debug</Text>
        <Text style={styles.subtitle}>
          Developer tools for testing user flows
        </Text>

        {/* Current User Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Current User Status</Text>
            <TouchableOpacity
              onPress={refreshUserInfo}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>

          {userInfo?.user ? (
            <View style={styles.userCard}>
              <Text style={styles.userName}>👤 {userInfo.user.name}</Text>
              <Text style={styles.userDetail}>ID: {userInfo.user.id}</Text>
              <Text style={styles.userDetail}>
                Groups: {userInfo.stats?.groupCount || 0}
              </Text>
              <Text style={styles.userDetail}>
                Groups Posted: {userInfo.user.groupsPosted?.length || 0}
              </Text>
              <Text style={styles.userDetail}>
                Has Uploaded: {userInfo.user.hasUploaded ? "Yes" : "No"}
              </Text>
              {userInfo.user.groupsPosted?.length > 0 && (
                <Text style={styles.userDetail}>
                  Posted in: {userInfo.user.groupsPosted.join(", ")}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.noUserCard}>
              <Text style={styles.noUserText}>❌ No user found</Text>
              <Text style={styles.noUserSubtext}>
                You're in "new user" state
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsTitle}>Actions</Text>

          {/* Reset as New User */}
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={handleResetAsNewUser}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.resetButtonText}>🧹 Reset as New User</Text>
            )}
          </TouchableOpacity>

          {/* Navigation Buttons */}
          <TouchableOpacity
            style={[styles.actionButton, styles.navButton]}
            onPress={handleGoToWelcomeScreen}
          >
            <Text style={styles.navButtonText}>🏠 Go to Welcome Screen</Text>
          </TouchableOpacity>

          {userInfo?.user && (
            <TouchableOpacity
              style={[styles.actionButton, styles.navButton]}
              onPress={handleGoToGroupsOverview}
            >
              <Text style={styles.navButtonText}>📱 Go to Groups Overview</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>How to Test:</Text>
          <Text style={styles.instruction}>
            1. Click "Reset as New User" to clear all data
          </Text>
          <Text style={styles.instruction}>
            2. You'll be taken to WelcomeScreen
          </Text>
          <Text style={styles.instruction}>
            3. WelcomeScreen will detect no user and go to NameEntryScreen
          </Text>
          <Text style={styles.instruction}>4. Complete the new user flow</Text>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>

            <View style={styles.modalButtons}>
              {modalConfig.type === "info" ? (
                <>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonConfirm]}
                    onPress={handleConfirmReset}
                  >
                    <Text style={styles.modalButtonText}>Reset</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 32,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  userCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333333",
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  userDetail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  noUserCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
  },
  noUserText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  noUserSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  actionsSection: {
    marginBottom: 32,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  resetButton: {
    backgroundColor: "#dc3545",
  },
  resetButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  navButton: {
    backgroundColor: "#333333",
    borderWidth: 1,
    borderColor: "#555555",
  },
  navButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  instructionsSection: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333333",
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 12,
  },
  instruction: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 6,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#333333",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#333333",
    borderWidth: 1,
    borderColor: "#555555",
  },
  modalButtonConfirm: {
    backgroundColor: "#dc3545",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
