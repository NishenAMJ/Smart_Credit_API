import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// Only import screens that EXIST right now
import LenderDashboardScreen from '../screens/lender/LenderDashboardScreen';
import LenderProfileScreen   from '../screens/lender/LenderProfileScreen';
import MyBorrowersScreen     from '../screens/lender/MyBorrowersScreen';
import QRScannerScreen from '../screens/lender/QRScannerScreen'
import ChatNavigator from './ChatNavigator';

const Tab = createBottomTabNavigator();

// ── Big round QR button in center ────────────────────
function QRTabButton({ onPress }: any) {
  return (
    <TouchableOpacity 
      style={styles.qrButton} 
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Feather name="maximize" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

export default function LenderTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          backgroundColor: '#FFFFFF',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      {/* Tab 1 — Home */}
      <Tab.Screen
        name="Home"
        component={LenderDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Tab 2 — Borrowers */}
      <Tab.Screen
        name="BorrowersTab"
        component={MyBorrowersScreen}
        options={{
          tabBarLabel: 'Borrowers',
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />

      {/* Tab 3 — QR Scanner (center button) */}
      <Tab.Screen
        name="QRScannerTab"
        component={QRScannerScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => <QRTabButton {...props} />,
        }}
      />

      {/* Tab 4 — Chat/Applications */}
      <Tab.Screen
        name="chat"
        component={ChatNavigator}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Feather name="inbox" size={size} color={color} />
          ),
        }}
      />

      {/* Tab 5 — Profile */}
      <Tab.Screen
        name="ProfileTab"
        component={LenderProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />

    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  qrButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});