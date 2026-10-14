import React from 'react';

import { useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

import { PeaksProvider } from './src/store/PeaksContext';
import { PlannerProvider } from './src/store/PlannerContext';
import { LocaleProvider, useLocale } from './src/store/LocaleContext';
import { ThemeProvider } from './src/store/ThemeContext';
import { Colors } from './src/utils/theme';
import type {
  RootStackParamList,
  PlannerStackParamList,
  TabParamList,
} from './src/types/navigation';

import HomeScreen from './src/screens/HomeScreen';
import PeakDetailScreen from './src/screens/PeakDetailScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import WeeklyReviewScreen from './src/screens/WeeklyReviewScreen';
import ManageBlocksScreen from './src/screens/ManageBlocksScreen';
import TodayScreen from './src/screens/TodayScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './src/utils/i18n';

const Stack = createNativeStackNavigator<RootStackParamList>();
const PlannerStack = createNativeStackNavigator<PlannerStackParamList>();
const BlocchiStackNav = createNativeStackNavigator<any>();
const Tab = createBottomTabNavigator<TabParamList>();

function VetteStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Outfit_700Bold' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="PeakDetail" component={PeakDetailScreen} />
    </Stack.Navigator>
  );
}

function PlannerStackNavigator() {
  return (
    <PlannerStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Outfit_700Bold' },
      }}
    >
      <PlannerStack.Screen name="PlannerHome" component={PlannerScreen} />
      <PlannerStack.Screen
        name="WeeklyReview"
        component={WeeklyReviewScreen}
        options={{ title: t('review.title') }}
      />
    </PlannerStack.Navigator>
  );
}

function BlocchiStack() {
  return (
    <BlocchiStackNav.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Outfit_700Bold' },
      }}
    >
      <BlocchiStackNav.Screen name="GestisciBlocchi" component={ManageBlocksScreen} />
    </BlocchiStackNav.Navigator>
  );
}

import { t } from './src/utils/i18n';

function TabNavigator() {
  const { colors } = useThemeColors();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: 'Outfit_500Medium' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="OggiTab"
        component={TodayScreen}
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="VetteTab"
        component={VetteStack}
        options={{
          title: t('tabs.peaks'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PlannerTab"
        component={PlannerStackNavigator}
        options={{
          title: t('tabs.planner'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BlocchiTab"
        component={BlocchiStack}
        options={{
          title: t('tabs.blocks'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
    primary: Colors.light.primary,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    primary: Colors.dark.primary,
  },
};

import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useThemeColors } from './src/utils/useThemeColors';

function RootNavigator() {
  const { locale, isReloading } = useLocale();
  const { colors, isDark } = useThemeColors();

  return (
    <>
      <NavigationContainer theme={isDark ? DarkNavTheme : LightNavTheme} key={locale}>
        <TabNavigator />
      </NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isReloading && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 20, color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            {t('settings.changingLanguage')}
          </Text>
        </View>
      )}
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocaleProvider>
          <PeaksProvider>
            <PlannerProvider>
              <RootNavigator />
            </PlannerProvider>
          </PeaksProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
