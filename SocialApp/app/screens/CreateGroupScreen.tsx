// app/screens/CreateGroupScreen.tsx
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
import { createGroup } from "../../src/services/groupService";
import { Modal } from "../../src/components/Modal";

export default function CreateGroupScreen() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    groupId: "",
    type: "info" as "info" | "error",
  });

  const showModal = (
    title: string,
    message: string,
    groupId: string = "",
    type: "info" | "error" = "info"
  ) => {
    setModalConfig({ title, message, groupId, type });
    setModalVisible(true);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showModal("Error", "Please enter a group name", "", "error");
      return;
    }

    if (!description.trim()) {
      showModal("Error", "Please enter a group description", "", "error");
      return;
    }

    setLoading(true);
    try {
      const user = await getUserLocally();
      if (!user) {
        showModal("Error", "User not found", "", "error");
        return;
      }

      const newGroup = await createGroup(
        user.id,
        groupName.trim(),
        description.trim()
      );

      showModal(
        "Success!",
        `Group "${newGroup.name}" has been created successfully. Share this code with others to join your group:`,
        newGroup.id,
        "info"
      );
    } catch (error) {
      console.error("Error creating group:", error);
      showModal(
        "Error",
        "Failed to create group. Please try again.",
        "",
        "error"
      );
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
      setTimeout(() => {
        router.back();
      }, 500);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create New Group</Text>
          <Text style={styles.subtitle}>
            Create a space for sharing photos with your friends and family
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter group name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this group for?"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
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
              styles.createButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleCreateGroup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>
              {loading ? "Creating..." : "Create Group"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        groupId={modalConfig.groupId}
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
  textArea: {
    height: 100,
    paddingTop: 16,
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
  createButton: {
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
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "black",
  },
});
