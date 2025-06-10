// app/screens/NameEntryScreen.tsx
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
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createUserInFirebase,
  updateUserActivity,
} from "../../src/services/userService";

export default function NameEntryScreen() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateName = (inputName: string): boolean => {
    // Remove extra spaces and check length
    const trimmedName = inputName.trim();
    if (trimmedName.length < 2) {
      Alert.alert("Invalid Name", "Please enter at least 2 characters");
      return false;
    }
    if (trimmedName.length > 30) {
      Alert.alert("Invalid Name", "Name must be less than 30 characters");
      return false;
    }
    // Check for valid characters (letters, spaces, basic punctuation)
    const validNameRegex = /^[a-zA-Z\s\-\.\']+$/;
    if (!validNameRegex.test(trimmedName)) {
      Alert.alert(
        "Invalid Name",
        "Please use only letters, spaces, hyphens, and apostrophes"
      );
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateName(name)) {
      return;
    }

    setIsLoading(true);
    try {
      const trimmedName = name.trim();
      console.log("✅ Name validated:", trimmedName);

      // Create user account without a specific group initially
      const newUser = await createUserInFirebase(trimmedName);

      if (newUser) {
        // Track user creation activity
        await updateUserActivity("user_created", { name: trimmedName });

        console.log("✅ User created successfully:", newUser);

        // Navigate directly to GroupsOverviewScreen per new user flow
        router.replace("/screens/GroupsOverviewScreen");
      } else {
        throw new Error("Failed to create user account");
      }
    } catch (error) {
      console.error("❌ Error creating user:", error);
      Alert.alert("Error", "Failed to create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>
              This is how others in your groups will see you
            </Text>
          </View>

          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={name}
              onChangeText={setName}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              maxLength={30}
            />
            <Text style={styles.characterCount}>
              {name.length}/30 characters
            </Text>
          </View>

          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                { opacity: name.trim().length < 2 ? 0.5 : 1 },
              ]}
              onPress={handleContinue}
              disabled={isLoading || name.trim().length < 2}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                {isLoading ? "Creating Account..." : "Continue"}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                You'll be able to change this later in your profile
              </Text>
            </View>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  inputSection: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  input: {
    fontSize: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "#333333",
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    textAlign: "center",
    color: "white",
    fontWeight: "500",
  },
  characterCount: {
    textAlign: "right",
    marginTop: 12,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  buttonSection: {
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: "white",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  continueButtonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 20,
  },
});
