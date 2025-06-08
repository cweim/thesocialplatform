// app/screens/WelcomeScreen.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { getUserLocally } from "../../src/services/userService";

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Start animations (disable native driver for web to avoid warnings)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: Platform.OS !== "web", // Disable for web
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: Platform.OS !== "web", // Disable for web
      }),
    ]).start();

    // Check for existing user and navigate accordingly
    const checkUserAndNavigate = async () => {
      try {
        console.log("🔄 Welcome screen: Checking for existing user...");

        // Wait for 3 seconds to show splash
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const existingUser = await getUserLocally();

        if (existingUser) {
          console.log("✅ Existing user found:", existingUser.name);
          router.replace("/screens/GroupFeedScreen");
        } else {
          console.log("ℹ️ No existing user, go to name entry");
          // New user, go to name entry
          router.replace("/screens/NameEntryScreen");
        }
      } catch (error) {
        console.error("❌ Error checking user:", error);
        // On error, go to name entry as fallback
        console.log("🔄 Error occurred, navigating to name entry as fallback");
        router.replace("/screens/NameEntryScreen");
      }
    };

    checkUserAndNavigate();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          Platform.OS === "web"
            ? {
                // Static styles for web to avoid animation issues
                opacity: 1,
                transform: [{ scale: 1 }],
              }
            : {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
        ]}
      >
        <Text style={styles.appName}>PhotoSync</Text>
        <Text style={styles.tagline}>Share moments with your group</Text>
        <View style={styles.loadingDots}>
          <Text style={styles.dots}>• • •</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  appName: {
    fontSize: 48,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    textAlign: "center",
  },
  tagline: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 40,
    textAlign: "center",
  },
  loadingDots: {
    marginTop: 20,
  },
  dots: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 4,
  },
});
