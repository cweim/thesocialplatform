// app/screens/CodeEntryScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  verifyGroupCode,
  createUserInFirebase,
} from "../../src/services/userService";

export default function CodeEntryScreen() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { userName } = useLocalSearchParams();

  const formatCode = (input: string): string => {
    // Remove any non-alphanumeric characters and convert to uppercase
    return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  };

  const handleCodeChange = (input: string) => {
    const formattedCode = formatCode(input);
    if (formattedCode.length <= 7) {
      setCode(formattedCode);
    }
  };

  const handleJoinGroup = async () => {
    if (code.length < 3) {
      Alert.alert("Invalid Code", "Group code must be at least 3 characters");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🔄 Verifying group code:", code);

      // Verify the group code exists
      const groupExists = await verifyGroupCode(code);

      if (!groupExists) {
        Alert.alert(
          "Invalid Group Code",
          "This group code doesn't exist. Please check with your group admin."
        );
        setIsLoading(false);
        return;
      }

      console.log("✅ Group code verified, creating user...");

      // Create user with the verified group code
      const newUser = await createUserInFirebase(userName as string, code);

      if (!newUser) {
        throw new Error("Failed to create user");
      }

      console.log("✅ User created successfully:", newUser.name);

      router.replace("/screens/GroupFeedScreen");
    } catch (error) {
      console.error("❌ Error joining group:", error);
      Alert.alert("Error", "Failed to join group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const createTestGroup = async () => {
    setIsLoading(true);
    try {
      // Import createGroup function
      const { createGroup } = await import("../../src/services/userService");

      const testCode =
        "TEST" + Math.random().toString(36).substr(2, 3).toUpperCase();
      await createGroup(testCode);

      Alert.alert(
        "Test Group Created!",
        `Group code: ${testCode}\n\nThis is for testing purposes only.`,
        [
          { text: "Use This Code", onPress: () => setCode(testCode) },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } catch (error) {
      console.error("❌ Error creating test group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Join a Group</Text>
          <Text style={styles.subtitle}>
            Enter the group code shared by your group admin
          </Text>
          <Text style={styles.userName}>Welcome, {userName}!</Text>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="GROUP CODE"
            placeholderTextColor="#999"
            value={code}
            onChangeText={handleCodeChange}
            autoCapitalize="characters"
            autoFocus={true}
            returnKeyType="done"
            onSubmitEditing={handleJoinGroup}
            maxLength={7}
          />

          <Text style={styles.characterCount}>{code.length}/7 characters</Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.joinButton, { opacity: code.length < 3 ? 0.5 : 1 }]}
            onPress={handleJoinGroup}
            disabled={isLoading || code.length < 3}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.joinButtonText}>Join Group</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={createTestGroup}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>Create Test Group</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have a group code? Ask your group admin to share it with you.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    color: "#667eea",
    fontWeight: "600",
  },
  inputSection: {
    flex: 1,
    justifyContent: "center",
    marginTop: -100,
  },
  input: {
    fontSize: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    backgroundColor: "white",
    textAlign: "center",
    color: "#333",
    fontWeight: "bold",
    letterSpacing: 2,
  },
  characterCount: {
    textAlign: "right",
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  buttonSection: {
    marginBottom: 20,
  },
  joinButton: {
    backgroundColor: "#667eea",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  joinButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  testButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#667eea",
  },
  testButtonText: {
    color: "#667eea",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});
