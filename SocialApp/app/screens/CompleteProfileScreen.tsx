import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  updateUserLocally,
  getUserLocally,
} from "../../src/services/userService";
import { uploadImage } from "../../src/services/imageService";

export default function CompleteProfileScreen() {
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let profilePicUrl = null;
      const user = await getUserLocally();
      if (!user) throw new Error("User not found");
      if (profilePic) {
        // Upload image to Firebase Storage
        const uploadResult = await uploadImage(
          profilePic,
          "profile",
          user.id,
          "profilePic"
        );
        profilePicUrl = uploadResult.downloadURL;
      }
      // Update user profile with optional fields
      await updateUserLocally(
        {
          profilePicUrl: profilePicUrl || undefined,
          instagram: instagram.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          phone: phone.trim() || undefined,
          profileComplete: true,
        },
        true
      );
      setLoading(false);
      router.replace("/screens/GroupsOverviewScreen");
    } catch (error) {
      setLoading(false);
      alert("Failed to save profile. Please try again.");
      console.error(error);
    }
  };

  const handleSkip = () => {
    router.replace("/screens/GroupsOverviewScreen");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Complete Your Profile</Text>
      <TouchableOpacity
        style={styles.profilePicWrapper}
        onPress={pickProfileImage}
      >
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.profilePic} />
        ) : (
          <View style={styles.profilePicPlaceholder}>
            <Text style={styles.profilePicPlaceholderText}>Upload Photo</Text>
          </View>
        )}
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Instagram (optional)"
        placeholderTextColor="#aaa"
        value={instagram}
        onChangeText={setInstagram}
      />
      <TextInput
        style={styles.input}
        placeholder="LinkedIn (optional)"
        placeholderTextColor="#aaa"
        value={linkedin}
        onChangeText={setLinkedin}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone (optional)"
        placeholderTextColor="#aaa"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    padding: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginVertical: 32,
    textAlign: "center",
  },
  profilePicWrapper: {
    marginBottom: 24,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#00bfff",
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  profilePicPlaceholderText: {
    color: "#aaa",
    fontSize: 14,
  },
  input: {
    width: "100%",
    backgroundColor: "#181818",
    borderRadius: 12,
    padding: 16,
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 24,
    gap: 16,
  },
  skipButton: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#00bfff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
