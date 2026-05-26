import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../src/theme'
import { useAppStore } from '../../src/store/appStore'
import { View, StyleSheet } from 'react-native'

type IoniconsName = keyof typeof Ionicons.glyphMap

const tabs: { name: string; title: string; icon: IoniconsName; iconFocused: IoniconsName }[] = [
  { name: 'index', title: 'ARIA', icon: 'chatbubble-ellipses-outline', iconFocused: 'chatbubble-ellipses' },
  { name: 'notes', title: 'Notes', icon: 'document-text-outline', iconFocused: 'document-text' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'email', title: 'Email', icon: 'mail-outline', iconFocused: 'mail' },
  { name: 'tasks', title: 'Tasks', icon: 'checkmark-circle-outline', iconFocused: 'checkmark-circle' },
  { name: 'laptop', title: 'Laptop', icon: 'laptop-outline', iconFocused: 'laptop' },
]

export default function TabLayout() {
  const { laptopStatus } = useAppStore()

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerRight: () => <LaptopIndicator connected={laptopStatus.connected} />,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
      {/* Hidden from tab bar */}
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  )
}

function LaptopIndicator({ connected }: { connected: boolean }) {
  return (
    <View style={styles.indicator}>
      <View style={[styles.dot, connected ? styles.dotOnline : styles.dotOffline]} />
    </View>
  )
}

const styles = StyleSheet.create({
  indicator: { paddingRight: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: colors.success },
  dotOffline: { backgroundColor: colors.textDim },
})
