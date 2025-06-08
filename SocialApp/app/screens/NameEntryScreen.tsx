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
} from "react-native";
import { useRouter } from "expo-router";

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
      // Store name temporarily (we'll save full user data when they join a group)
      const trimmedName = name.trim();
      console.log("✅ Name validated:", trimmedName);

      // Navigate to code entry with the name
      router.push({
        pathname: "screens/CodeEntryScreen" as any,
        params: { userName: trimmedName },
      });
    } catch (error) {
      console.error("❌ Error processing name:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
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
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>
            This is how others in your group will see you
          </Text>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoFocus={true}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            maxLength={30}
          />

          <Text style={styles.characterCount}>{name.length}/30 characters</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            { opacity: name.trim().length < 2 ? 0.5 : 1 },
          ]}
          onPress={handleContinue}
          disabled={isLoading || name.trim().length < 2}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? "Processing..." : "Continue"}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You'll be able to change this later in your profile
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
  },
  inputSection: {
    flex: 1,
    justifyContent: "center",
    marginTop: -100,
  },
  input: {
    fontSize: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    backgroundColor: "white",
    textAlign: "center",
    color: "#333",
  },
  characterCount: {
    textAlign: "right",
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  continueButton: {
    backgroundColor: "#667eea",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  continueButtonText: {
    color: "white",
    fontSize: 18,
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
  },
});
