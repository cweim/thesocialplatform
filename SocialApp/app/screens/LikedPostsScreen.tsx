import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { getUserLocally } from "../../src/services/userService";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../src/services/firebase";

const numColumns = 3;
const { width } = Dimensions.get("window");
const imageSize = width / numColumns - 8;

export default function LikedPostsScreen() {
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLikedPosts();
  }, []);

  const fetchLikedPosts = async () => {
    setLoading(true);
    try {
      const user = await getUserLocally();
      if (!user) return;
      // Query all posts where likes array contains the user id
      const postsQuery = query(
        collection(db, "posts"),
        where("likes", "array-contains", user.id)
      );
      const snapshot = await getDocs(postsQuery);
      const posts: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          imageUrl: data.imageUrl || "",
          frontImageUrl: data.frontImageUrl || "",
          groupId: data.groupId || "",
          groupName: data.groupName || "",
        });
      });
      setLikedPosts(posts);
    } catch (error) {
      console.error("Error fetching liked posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostPress = (post: any) => {
    // Navigate to GroupFeedScreen and scroll to the post
    router.push({
      pathname: "/screens/GroupFeedScreen",
      params: {
        groupId: post.groupId,
        groupName: post.groupName,
        highlightPostId: post.id,
      },
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.imageWrapper}
      onPress={() => handlePostPress(item)}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Liked Posts</Text>
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#00bfff"
          style={{ marginTop: 40 }}
        />
      ) : likedPosts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>You haven't liked any posts yet.</Text>
        </View>
      ) : (
        <FlatList
          data={likedPosts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.gallery}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  backButton: {
    marginRight: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backButtonText: {
    fontSize: 22,
    color: "white",
    fontWeight: "bold",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    flex: 1,
  },
  gallery: {
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  imageWrapper: {
    flex: 1,
    margin: 4,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: "#aaa",
    fontSize: 16,
  },
});
