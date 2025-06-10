// app/screens/GroupsOverviewScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { getUserLocally } from "../../src/services/userService";
import { getUserGroups } from "../../src/services/groupService";
import { Group as ServiceGroup } from "../../src/services/groupService";
import { showAlert } from "../../src/utils/alert";

interface Group extends ServiceGroup {
  isOwner: boolean;
}

export default function GroupsOverviewScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndGroups();
  }, []);

  // Add focus effect to refresh groups
  useFocusEffect(
    React.useCallback(() => {
      loadUserAndGroups();
    }, [])
  );

  const loadUserAndGroups = async () => {
    try {
      const user = await getUserLocally();
      if (user) {
        setUserName(user.name);
        const userGroups = await getUserGroups(user.id);
        const groupsWithOwner = userGroups.map((group) => ({
          ...group,
          isOwner: group.ownerId === user.id,
        }));
        setGroups(groupsWithOwner);
      }
    } catch (error) {
      console.error("Error loading user and groups:", error);
      showAlert("Error", "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupPress = (group: Group) => {
    // Navigate to GroupFeedScreen with the selected group
    router.push({
      pathname: "/screens/GroupFeedScreen",
      params: { groupId: group.id, groupName: group.name },
    });
  };

  const handleCreateGroup = () => {
    router.push("/screens/CreateGroupScreen");
  };

  const handleJoinGroup = () => {
    router.push("/screens/JoinGroupScreen");
  };

  const formatDate = (date: any) => {
    if (!date) return "Never";
    if (typeof date === "string") return date;
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const renderGroupCard = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => handleGroupPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{item.name}</Text>
        {item.isOwner && <Text style={styles.ownerBadge}>Owner</Text>}
      </View>
      <Text style={styles.groupDescription}>{item.description}</Text>
      <View style={styles.groupInfo}>
        <Text style={styles.groupCode}>Code: {item.id}</Text>
        <Text style={styles.memberCount}>{item.memberCount} members</Text>
      </View>
      <Text style={styles.lastActivity}>
        Last active: {formatDate(item.lastActivity)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your groups...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back, {userName}!</Text>
        <Text style={styles.subtitle}>Your Groups</Text>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first group or join an existing one to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.groupsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.createButton]}
          onPress={handleCreateGroup}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Create Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.joinButton]}
          onPress={handleJoinGroup}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Join Group</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
  },
  groupsList: {
    padding: 16,
    paddingTop: 0,
  },
  groupCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333333",
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groupName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  ownerBadge: {
    backgroundColor: "#333333",
    color: "white",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: "500",
  },
  groupDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 12,
    lineHeight: 20,
  },
  groupInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  groupCode: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  memberCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  lastActivity: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  bottomActions: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createButton: {
    backgroundColor: "white",
  },
  joinButton: {
    backgroundColor: "#333333",
    borderWidth: 1,
    borderColor: "#555555",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
