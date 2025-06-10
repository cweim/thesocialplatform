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
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getUserLocally } from "../../src/services/userService";
import { getGroupPosts } from "../../src/services/postService";

interface User {
  id: string;
  name: string;
  groupsPosted?: string[]; // Array of group IDs where user has posted
}

interface Post {
  id: string;
  imageUrl: string;
  caption: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

export default function GroupFeedScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get group info from navigation params
  const groupId = params.groupId as string;
  const groupName = params.groupName as string;

  useEffect(() => {
    loadUserAndFeed();
  }, [groupId]);

  const loadUserAndFeed = async () => {
    try {
      console.log("📱 Loading user and feed data for group:", groupId);
      const currentUser = await getUserLocally();
      setUser(currentUser);

      if (currentUser && groupId) {
        console.log("👤 User found:", currentUser.name);

        // Check if user has posted in THIS specific group
        const hasPostedInGroup =
          currentUser.groupsPosted?.includes(groupId) || false;
        console.log("📊 Has posted in this group:", hasPostedInGroup);

        // Always load the feed (for preview behind overlay)
        const groupPosts = await getGroupPosts(groupId);
        setPosts(groupPosts);

        // Show lock overlay if user hasn't posted in THIS group
        if (!hasPostedInGroup) {
          setIsLocked(true);
          console.log(
            "🔒 Feed locked - user needs to upload first photo to this group"
          );
        } else {
          setIsLocked(false);
          console.log("✅ Feed unlocked - user has posted in this group");
        }
      }
    } catch (error) {
      console.error("❌ Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = () => {
    console.log("📷 Going to camera for group:", groupId);
    router.push({
      pathname: "/screens/CameraScreen",
      params: { groupId, groupName },
    });
  };

  const handleBackToGroups = () => {
    router.push("/screens/GroupsOverviewScreen");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToGroups}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.memberCount}>{posts.length} photos</Text>
        </View>
        {!isLocked && (
          <TouchableOpacity
            style={styles.cameraHeaderButton}
            onPress={handleTakePhoto}
          >
            <Text style={styles.cameraHeaderText}>📷</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Feed Content */}
      <ScrollView
        style={[styles.feedContainer, isLocked && styles.blurredContent]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isLocked}
      >
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <View key={post.id || index} style={styles.postCard}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {post.authorId === user?.id
                        ? "You"
                        : post.authorName?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
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

              {/* Post Image */}
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />

              {/* Post Content */}
              <View style={styles.postContent}>
                <Text style={styles.postCaption}>{post.caption}</Text>
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
              <Text style={styles.lockTitle}>Welcome to {groupName}! 🎉</Text>
              <Text style={styles.lockSubtitle}>Hi {user?.name}!</Text>

              {/* Explanation */}
              <Text style={styles.lockMessage}>
                You can see there are already {posts.length} amazing photos
                shared in this group!
              </Text>
              <Text style={styles.lockExplanation}>
                To unlock the full feed and start interacting with your group,
                you need to contribute your first photo to this group.
              </Text>

              {/* Take Photo Button */}
              <TouchableOpacity
                style={styles.takePhotoButton}
                onPress={handleTakePhoto}
              >
                <Text style={styles.takePhotoButtonText}>
                  📷 Share Your First Photo!
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

      {/* Floating Camera Button (only show when unlocked) */}
      {!isLocked && (
        <TouchableOpacity
          style={styles.floatingCameraButton}
          onPress={handleTakePhoto}
        >
          <Text style={styles.floatingCameraText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  memberCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 2,
  },
  cameraHeaderButton: {
    padding: 8,
  },
  cameraHeaderText: {
    fontSize: 20,
  },
  feedContainer: {
    flex: 1,
  },
  blurredContent: {
    opacity: 0.3,
  },
  postCard: {
    backgroundColor: "#000000",
    marginBottom: 32,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  postTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  postImage: {
    width: "100%",
    height: 400,
    backgroundColor: "#1a1a1a",
  },
  postContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postCaption: {
    fontSize: 14,
    color: "white",
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
  bottomPadding: {
    height: 100,
  },
  floatingCameraButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: "white",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCameraText: {
    fontSize: 24,
    color: "black",
    fontWeight: "300",
  },
  // Lock Overlay Styles
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  lockContent: {
    width: "100%",
    maxWidth: 400,
  },
  lockCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  lockIcon: {
    width: 80,
    height: 80,
    backgroundColor: "#333333",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  lockEmoji: {
    fontSize: 36,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  lockSubtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  lockMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  lockExplanation: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  takePhotoButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    minWidth: 250,
  },
  takePhotoButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },
  previewHint: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    fontStyle: "italic",
  },
});
