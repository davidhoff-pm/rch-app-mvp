import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import HomeScreen from '../screens/HomeScreen';
import SurveyScreen from '../screens/SurveyScreen';
import StatsScreen from '../screens/StatsScreen';
import TreatmentScreen from '../screens/TreatmentScreen';
import ExportScreen from '../screens/ExportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import IBDiskQuestionnaireScreen from '../screens/IBDiskQuestionnaireScreen';
import CustomTabBar from '../components/navigation/CustomTabBar';
import designSystem from '../theme/designSystem';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: designSystem.colors.background.tertiary,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: designSystem.colors.border.light,
        },
        headerTitleStyle: {
          fontSize: designSystem.typography.fontSize.lg,
          fontWeight: designSystem.typography.fontWeight.bold,
          color: designSystem.colors.text.primary,
        },
        tabBarActiveTintColor: designSystem.colors.primary[500],
        tabBarInactiveTintColor: designSystem.colors.text.tertiary,
        tabBarLabelStyle: { 
          fontSize: designSystem.typography.fontSize.xs,
          fontWeight: designSystem.typography.fontWeight.medium,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : designSystem.layout.tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          borderTopWidth: 0,
          backgroundColor: designSystem.colors.background.tertiary,
          ...designSystem.shadows.lg,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName = 'home';
          if (route.name === 'Accueil') iconName = 'home';
          if (route.name === 'Bilan') iconName = 'clipboard-text';
          if (route.name === 'Statistiques') iconName = 'chart-line';
          if (route.name === 'Traitement') iconName = 'pill';
          if (route.name === 'Paramètres') iconName = 'cog';
          return <MaterialCommunityIcons name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Bilan" component={SurveyScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Statistiques" component={StatsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Traitement" component={TreatmentScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Paramètres" component={SettingsScreen} options={{ headerShown: false }} />
      <Tab.Screen
        name="Export"
        component={ExportScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
          tabBarVisible: false,
        }}
      />
    </Tab.Navigator>
  );
}

const AppNavigator = React.forwardRef((props, ref) => {
  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator
        screenOptions={{
          animation: 'fade', // Transition fade entre écrans
          animationDuration: 250,
          headerStyle: {
            backgroundColor: designSystem.colors.background.tertiary,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: designSystem.colors.border.light,
          },
          headerTitleStyle: {
            fontSize: designSystem.typography.fontSize.lg,
            fontWeight: designSystem.typography.fontWeight.bold,
            color: designSystem.colors.text.primary,
          },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="IBDiskQuestionnaire" 
          component={IBDiskQuestionnaireScreen} 
          options={{ 
            title: 'Votre quotidien',
            presentation: 'modal',
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
});

export default AppNavigator;
