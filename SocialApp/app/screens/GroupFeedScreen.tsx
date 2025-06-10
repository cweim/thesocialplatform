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
  frontImageUrl: string;
  caption: string;
  authorId: string;
  authorName: string;
  createdAt: any;
  location?: string;
}

export default function GroupFeedScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [toggledPosts, setToggledPosts] = useState<{ [key: string]: boolean }>(
    {}
  );
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

  const formatPostTime = (createdAt: any) => {
    if (!createdAt) return "Recently";

    try {
      const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      const now = new Date();
      const diffInHours = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      );

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60)
        );
        return diffInMinutes < 1 ? "Just now" : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch (error) {
      return "Recently";
    }
  };

  const formatPostDateTime = (createdAt: any) => {
    if (!createdAt) return { time: "", date: "" };

    try {
      const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      return {
        time: date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        date: date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      };
    } catch (error) {
      return { time: "", date: "" };
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

  const togglePostImages = (postId: string) => {
    setToggledPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  const renderPost = (post: Post, index: number) => {
    const { time, date } = formatPostDateTime(post.createdAt);
    const isToggled = toggledPosts[post.id];

    return (
      <View key={post.id || index} style={styles.postContainer}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {post.authorId === user?.id
                  ? user.name?.charAt(0).toUpperCase()
                  : post.authorName?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {post.authorId === user?.id ? user.name : post.authorName}
              </Text>
              <Text style={styles.location}>{post.location || "BeYou"}</Text>
            </View>
          </View>

          <View style={styles.timeSection}>
            <Text style={styles.postTime}>{time}</Text>
            <Text style={styles.postDate}>{date}</Text>
          </View>
        </View>

        {/* Post Image Container */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => togglePostImages(post.id)}
          activeOpacity={0.9}
        >
          {/* Main Image */}
          <Image
            source={{ uri: isToggled ? post.frontImageUrl : post.imageUrl }}
            style={styles.mainImage}
            resizeMode="cover"
          />

          {/* Front Camera Overlay (BeReal-style) */}
          <View style={styles.overlayContainer}>
            <Image
              source={{ uri: isToggled ? post.imageUrl : post.frontImageUrl }}
              style={styles.overlayImage}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>

        {/* Post Caption */}
        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{post.caption}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToGroups}
        >
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.memberCount}>{posts.length} moments</Text>
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
        contentContainerStyle={styles.feedContent}
      >
        {posts.length > 0 ? (
          posts.map((post, index) => renderPost(post, index))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>No moments yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to share a BeYou moment!
            </Text>
          </View>
        )}
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
                You can see there are already {posts.length} amazing moments
                shared in this group!
              </Text>
              <Text style={styles.lockExplanation}>
                Share your first BeYou moment to unlock the full feed and start
                connecting with your group.
              </Text>

              {/* Take Photo Button */}
              <TouchableOpacity
                style={styles.takePhotoButton}
                onPress={handleTakePhoto}
              >
                <Text style={styles.takePhotoButtonText}>
                  📷 Share Your First Moment
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
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "300",
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
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraHeaderText: {
    fontSize: 18,
  },
  feedContainer: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  blurredContent: {
    opacity: 0.3,
  },
  postContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  timeSection: {
    alignItems: "flex-end",
  },
  postTime: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  postDate: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 1,
  },
  imageContainer: {
    position: "relative",
    backgroundColor: "#000000",
  },
  mainImage: {
    width: "100%",
    height: 650,
    backgroundColor: "#000000",
  },
  overlayContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  overlayImage: {
    width: "100%",
    height: "100%",
  },
  captionContainer: {
    padding: 16,
    paddingTop: 12,
  },
  caption: {
    fontSize: 15,
    color: "white",
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
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
