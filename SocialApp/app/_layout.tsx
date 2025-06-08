// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="screens/WelcomeScreen" />
        <Stack.Screen name="screens/NameEntryScreen" />
        <Stack.Screen name="screens/CodeEntryScreen" />
        <Stack.Screen name="screens/CameraScreen" />
        <Stack.Screen name="screens/CaptionScreen" />
        <Stack.Screen name="screens/GroupFeedScreen" />
      </Stack>
    </>
  );
}
