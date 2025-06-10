// app/screens/JoinGroupScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { getUserLocally } from "../../src/services/userService";
import { joinGroup } from "../../src/services/groupService";
import { Modal } from "../../src/components/Modal";

interface User {
  id: string;
  name: string;
}

export default function JoinGroupScreen() {
  const router = useRouter();
  const [groupCode, setGroupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "error",
  });

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getUserLocally();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
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

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      showModal("Error", "Please enter a group code", "error");
      return;
    }

    if (!user) {
      showModal("Error", "User not found", "error");
      return;
    }

    setLoading(true);
    try {
      const success = await joinGroup(user.id, groupCode.trim());
      if (success) {
        showModal("Success!", `You've successfully joined the group!`, "info");
        setTimeout(() => {
          setModalVisible(false);
          router.back();
        }, 1500);
      } else {
        showModal("Error", "Failed to join group. Please try again.", "error");
      }
    } catch (error: any) {
      console.error("Error joining group:", error);
      let errorMessage = "Failed to join group. Please try again.";

      if (error.message === "Group not found") {
        errorMessage = "Group not found. Please check the group code.";
      } else if (error.message === "You are already a member of this group") {
        errorMessage = "You are already a member of this group.";
      }

      showModal("Error", errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleModalClose = () => {
    setModalVisible(false);
    if (modalConfig.type === "info") {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Join a Group</Text>
          <Text style={styles.subtitle}>Enter the group code to join</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter group code"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={groupCode}
              onChangeText={setGroupCode}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.joinButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleJoinGroup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.joinButtonText}>
              {loading ? "Joining..." : "Join Group"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={handleModalClose}
      />
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
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 24,
  },
  form: {
    flex: 1,
    paddingHorizontal: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "white",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  footer: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#333333",
    borderWidth: 1,
    borderColor: "#555555",
  },
  joinButton: {
    backgroundColor: "white",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "black",
  },
});
