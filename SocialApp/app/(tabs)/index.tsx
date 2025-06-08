import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { testFirebaseConnection } from "../../src/services/testFirebase";
import { testAuthSystem } from "../../src/services/testUserService";
import { testImageUpload } from "../../src/services/imageService";
import { testPostsSystem } from "../../src/services/postService";

export default function TabOneScreen() {
  const [testResults, setTestResults] = useState({
    firebase: "Testing...",
    auth: "Testing...",
    imageUpload: "Testing...",
    postsSystem: "Testing...",
  });

  useEffect(() => {
    const runAllTests = async () => {
      try {
        console.log("🚀 Starting Phase 2 Backend Tests...");

        // Test 1: Firebase Connection
        const firebaseResult = await testFirebaseConnection();
        setTestResults((prev) => ({
          ...prev,
          firebase: firebaseResult
            ? "✅ Firebase Connected!"
            : "❌ Firebase Connection Failed",
        }));

        if (!firebaseResult) {
          console.log("❌ Stopping tests - Firebase connection failed");
          return;
        }

        // Test 2: Authentication System
        const authResult = await testAuthSystem();
        setTestResults((prev) => ({
          ...prev,
          auth: authResult
            ? "✅ Authentication System Working!"
            : "❌ Authentication System Failed",
        }));

        if (!authResult) {
          console.log("❌ Stopping tests - Authentication failed");
          return;
        }

        // Test 3: Image Upload System
        const imageResult = await testImageUpload();
        setTestResults((prev) => ({
          ...prev,
          imageUpload: imageResult
            ? "✅ Image Upload Working!"
            : "❌ Image Upload Failed",
        }));

        if (!imageResult) {
          console.log("❌ Stopping tests - Image upload failed");
          return;
        }

        // Test 4: Complete Posts System
        const postsResult = await testPostsSystem();
        setTestResults((prev) => ({
          ...prev,
          postsSystem: postsResult
            ? "✅ Posts System Working!"
            : "❌ Posts System Failed",
        }));

        // Final results
        if (firebaseResult && authResult && imageResult && postsResult) {
          console.log("🎉 ALL PHASE 2 TESTS PASSED!");
          console.log("✅ Firebase Database: Working");
          console.log("✅ User Authentication: Working");
          console.log("✅ Image Storage: Working");
          console.log("✅ Posts System: Working");
          console.log("");
          console.log("🏗️ Backend infrastructure is complete!");
          console.log("📱 Ready to build app screens in Phase 3");
        } else {
          console.log("❌ Some tests failed - check the results above");
        }
      } catch (error: any) {
        console.error("Test suite error:", error);
        setTestResults((prev) => ({
          ...prev,
          firebase: "❌ Test Error: " + error.message,
        }));
      }
    };

    runAllTests();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Phase 2 Backend Test Suite</Text>

        <View style={styles.testSection}>
          <Text style={styles.subtitle}>Firebase Connection</Text>
          <Text style={styles.status}>{testResults.firebase}</Text>
        </View>

        <View style={styles.testSection}>
          <Text style={styles.subtitle}>Authentication System</Text>
          <Text style={styles.status}>{testResults.auth}</Text>
        </View>

        <View style={styles.testSection}>
          <Text style={styles.subtitle}>Image Upload System</Text>
          <Text style={styles.status}>{testResults.imageUpload}</Text>
        </View>

        <View style={styles.testSection}>
          <Text style={styles.subtitle}>Posts System</Text>
          <Text style={styles.status}>{testResults.postsSystem}</Text>
        </View>

        <View style={styles.testSection}>
          <Text style={styles.subtitle}>What's Being Tested:</Text>
          <Text style={styles.testItem}>• Firebase Firestore Connection</Text>
          <Text style={styles.testItem}>• Read/Write Database Operations</Text>
          <Text style={styles.testItem}>• Group Creation & Verification</Text>
          <Text style={styles.testItem}>• User Creation & Management</Text>
          <Text style={styles.testItem}>• Local Storage (AsyncStorage)</Text>
          <Text style={styles.testItem}>• Firebase Storage Setup</Text>
          <Text style={styles.testItem}>• Image Upload to Cloud</Text>
          <Text style={styles.testItem}>• Image URL Generation</Text>
          <Text style={styles.testItem}>• Post Creation with Images</Text>
          <Text style={styles.testItem}>• Post Retrieval by Group</Text>
          <Text style={styles.testItem}>• Complete Data Flow</Text>
        </View>

        <View style={styles.progressSection}>
          <Text style={styles.subtitle}>Backend Progress</Text>
          <Text style={styles.progressText}>
            {testResults.firebase.includes("✅") ? "✅" : "⏳"} Database Setup
          </Text>
          <Text style={styles.progressText}>
            {testResults.auth.includes("✅") ? "✅" : "⏳"} User Management
          </Text>
          <Text style={styles.progressText}>
            {testResults.imageUpload.includes("✅") ? "✅" : "⏳"} Image Storage
          </Text>
          <Text style={styles.progressText}>
            {testResults.postsSystem.includes("✅") ? "✅" : "⏳"} Posts System
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#444",
  },
  testSection: {
    width: "100%",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  progressSection: {
    width: "100%",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#e8f5e8",
    borderRadius: 10,
  },
  status: {
    fontSize: 16,
    marginTop: 5,
    fontWeight: "600",
  },
  testItem: {
    fontSize: 14,
    marginVertical: 3,
    color: "#666",
  },
  progressText: {
    fontSize: 16,
    marginVertical: 2,
    color: "#555",
  },
});
