import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../../src/services/firebase";

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace("/screens/GroupsOverviewScreen");
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      console.log("ProfileScreen userId param:", userId);
      if (!userId) return;
      setLoading(true);
      try {
        const userRef = doc(db, "users", String(userId));
        const userSnap = await getDoc(userRef);
        console.log("userSnap.exists:", userSnap.exists());
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        } else {
          setProfile(null);
        }
        // Fetch recent posts
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", String(userId)),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const postsSnap = await getDocs(postsQuery);
        const postsArr = postsSnap.docs.map((doc) => doc.data());
        setRecentPosts(postsArr);
      } catch (e) {
        console.log("Error fetching profile:", e);
        setProfile(null);
        setRecentPosts([]);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#00bfff"
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>User not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.profileCard}>
          {profile.profilePicUrl ? (
            <Image
              source={{ uri: profile.profilePicUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {profile.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          {profile.instagram && (
            <Text style={styles.social}>Instagram: @{profile.instagram}</Text>
          )}
          {profile.linkedin && (
            <Text style={styles.social}>LinkedIn: {profile.linkedin}</Text>
          )}
          {profile.phone && (
            <Text style={styles.social}>Phone: {profile.phone}</Text>
          )}
        </View>
        {/* Recent Posts */}
        {recentPosts.length > 0 && (
          <View style={styles.recentPostsSection}>
            <Text style={styles.recentPostsTitle}>Recent Posts</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recentPostsRow}
            >
              {recentPosts.map((post, idx) => (
                <Image
                  key={idx}
                  source={{ uri: post.imageUrl }}
                  style={styles.recentPostImage}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    alignItems: "center",
    padding: 24,
  },
  profileCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 350,
    marginTop: 40,
    borderWidth: 1,
    borderColor: "#333",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: "#333",
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  social: {
    fontSize: 16,
    color: "#00bfff",
    marginBottom: 8,
  },
  notFound: {
    color: "white",
    fontSize: 20,
    textAlign: "center",
    marginTop: 80,
  },
  backButton: {
    position: "absolute",
    top: 24,
    left: 24,
    zIndex: 2,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  recentPostsSection: {
    marginTop: 32,
    width: "100%",
    alignItems: "flex-start",
  },
  recentPostsTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    marginLeft: 4,
  },
  recentPostsRow: {
    flexDirection: "row",
  },
  recentPostImage: {
    width: 90,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#222",
  },
});
