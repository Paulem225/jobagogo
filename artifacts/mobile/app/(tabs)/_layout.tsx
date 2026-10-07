import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

type TabIconName = "home" | "search" | "bookmark" | "user";

function TabIcon({ name, color, focused }: { name: TabIconName; color: string; focused: boolean }) {
  const strokeWidth = focused ? 2.4 : 1.9;

  if (name === "home") {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill={focused ? color : "none"}>
        <Path d="M3 10.8 12 3l9 7.8V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10.2Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Path d="M9 22v-7h6v7" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === "search") {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Circle cx="10.8" cy="10.8" r="6.8" stroke={color} strokeWidth={strokeWidth} />
        <Path d="m16 16 5 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "bookmark") {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill={focused ? color : "none"}>
        <Path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V22l-6-3.8L6 22V3.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Découvrir</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} />
        <Label>Sauvegardés</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={"light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              {isIOS ? (
                <SymbolView name="house" tintColor={color} size={24} />
              ) : (
                <TabIcon name="home" color={color} focused={focused} />
              )}
              {focused && <View style={[styles.tabDot, { backgroundColor: color }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Découvrir",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              {isIOS ? (
                <SymbolView name="magnifyingglass" tintColor={color} size={24} />
              ) : (
                <TabIcon name="search" color={color} focused={focused} />
              )}
              {focused && <View style={[styles.tabDot, { backgroundColor: color }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Sauvegardés",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              {isIOS ? (
                <SymbolView name="bookmark" tintColor={color} size={24} />
              ) : (
                <TabIcon name="bookmark" color={color} focused={focused} />
              )}
              {focused && <View style={[styles.tabDot, { backgroundColor: color }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              {isIOS ? (
                <SymbolView name="person" tintColor={color} size={24} />
              ) : (
                <TabIcon name="user" color={color} focused={focused} />
              )}
              {focused && <View style={[styles.tabDot, { backgroundColor: color }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  // NativeTabs uses SF Symbols, which are available on iOS only.
  // Use the classic Expo Router tabs on Android so Feather icons render
  // correctly in Expo Go and on Android builds.
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  tabIconContainer: {
    minWidth: 32,
    height: 34,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  tabDot: {
    width: 4,
    height: 4,
    marginTop: 4,
    borderRadius: 2,
  },
});
