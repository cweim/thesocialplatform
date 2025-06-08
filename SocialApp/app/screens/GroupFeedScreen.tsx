// app/screens/GroupFeedScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { getUserLocally } from "../../src/services/userService";
import { getGroupPosts } from "../../src/services/postService";

export default function GroupFeedScreen() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUserAndFeed();
  }, []);

  const loadUserAndFeed = async () => {
    try {
      console.log("📱 Loading user and feed data...");

      const currentUser = await getUserLocally();
      setUser(currentUser);

      if (currentUser) {
        console.log("👤 User found:", currentUser.name);
        console.log("📊 Has uploaded:", currentUser.hasUploaded);

        // Always load the feed (for preview behind overlay)
        const groupPosts = await getGroupPosts(currentUser.groupId);
        setPosts(groupPosts);

        // Show lock overlay if user hasn't uploaded
        if (!currentUser.hasUploaded) {
          setIsLocked(true);
          console.log("🔒 Feed locked - user needs to upload first photo");
        } else {
          setIsLocked(false);
          console.log("✅ Feed unlocked - user has uploaded");
        }
      }
    } catch (error) {
      console.error("❌ Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = () => {
    console.log("📷 Going to camera...");
    router.push("/screens/CameraScreen");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your group feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Group Feed</Text>
        <Text style={styles.groupCode}>Group: {user?.groupId}</Text>
        {!isLocked && (
          <Text style={styles.memberName}>Welcome back, {user?.name}! 👋</Text>
        )}
      </View>

      {/* Feed Content (Always rendered, but may be covered by overlay) */}
      <ScrollView
        style={[styles.feedContainer, isLocked && styles.blurredContent]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isLocked} // Disable scrolling when locked
      >
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <View key={post.id || index} style={styles.postCard}>
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
              <View style={styles.postContent}>
                <Text style={styles.postCaption}>{post.caption}</Text>
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>
                    {post.authorId === user?.id ? "You" : post.authorName}
                  </Text>
                  <Text style={styles.postTime}>
                    {post.createdAt
                      ? new Date(post.createdAt.toDate()).toLocaleDateString()
                      : "Recently"}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to share a moment with your group!
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Camera Button (only show when unlocked) */}
      {!isLocked && (
        <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
          <Text style={styles.cameraButtonText}>📷</Text>
        </TouchableOpacity>
      )}

      {/* Stats Bar (only show when unlocked) */}
      {!isLocked && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {posts.length} photos • {user?.groupId} • Your contributions:{" "}
            {posts.filter((p) => p.authorId === user?.id).length}
          </Text>
        </View>
      )}

      {/* Lock Overlay - Only shows when feed is locked */}
      {isLocked && (
        <View style={styles.lockOverlay}>
          <View style={styles.lockContent}>
            <View style={styles.lockCard}>
              {/* Lock Icon */}
              <View style={styles.lockIcon}>
                <Text style={styles.lockEmoji}>🔒</Text>
              </View>

              {/* Welcome Message */}
              <Text style={styles.lockTitle}>Welcome to the group! 🎉</Text>
              <Text style={styles.lockSubtitle}>Hi {user?.name}!</Text>

              {/* Explanation */}
              <Text style={styles.lockMessage}>
                You can see there are already {posts.length} amazing photos
                shared in this group!
              </Text>

              <Text style={styles.lockExplanation}>
                To unlock the full feed and start interacting with your group,
                you need to contribute your first photo.
              </Text>

              {/* Take Photo Button */}
              <TouchableOpacity
                style={styles.takePhotoButton}
                onPress={handleTakePhoto}
              >
                <Text style={styles.takePhotoButtonText}>
                  📷 Take My First Photo!
                </Text>
              </TouchableOpacity>

              {/* Preview hint */}
              <Text style={styles.previewHint}>
                This is a preview of what you'll unlock ✨
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  groupCode: {
    fontSize: 16,
    color: "#667eea",
    fontWeight: "600",
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    color: "#28a745",
    fontWeight: "500",
  },
  feedContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  blurredContent: {
    opacity: 0.3, // Make content faded when locked
  },
  postCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#f0f0f0",
  },
  postContent: {
    padding: 16,
  },
  postCaption: {
    fontSize: 16,
    color: "#333",
    marginBottom: 12,
    lineHeight: 22,
  },
  postMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postAuthor: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
  },
  postTime: {
    fontSize: 12,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  bottomPadding: {
    height: 100,
  },
  cameraButton: {
    position: "absolute",
    bottom: 90,
    right: 24,
    width: 60,
    height: 60,
    backgroundColor: "#667eea",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  cameraButtonText: {
    fontSize: 24,
  },
  statsBar: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "#e1e5e9",
  },
  statsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  // Lock Overlay Styles
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)", // Almost opaque white
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  lockContent: {
    width: "100%",
    maxWidth: 400,
  },
  lockCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: "#667eea",
  },
  lockIcon: {
    width: 80,
    height: 80,
    backgroundColor: "#667eea",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  lockEmoji: {
    fontSize: 36,
  },
  lockTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  lockSubtitle: {
    fontSize: 20,
    color: "#667eea",
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  lockMessage: {
    fontSize: 16,
    color: "#555",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  lockExplanation: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  takePhotoButton: {
    backgroundColor: "#667eea",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    minWidth: 250,
  },
  takePhotoButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  previewHint: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
});
