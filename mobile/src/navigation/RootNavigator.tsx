import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useAuthStore} from '../store/authStore';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {RegisterScreen} from '../screens/auth/RegisterScreen';
import {OnboardingScreen} from '../screens/auth/OnboardingScreen';
import {DashboardScreen} from '../screens/DashboardScreen';
import {ProductListScreen, Product} from '../screens/products/ProductListScreen';
import {AddProductScreen} from '../screens/products/AddProductScreen';
import {ProductDetailScreen} from '../screens/products/ProductDetailScreen';
import {ReactionListScreen} from '../screens/reactions/ReactionListScreen';
import {AddReactionScreen} from '../screens/reactions/AddReactionScreen';
import {TriggerAnalysisScreen} from '../screens/insights/TriggerAnalysisScreen';
import {RecommendationsScreen} from '../screens/insights/RecommendationsScreen';
import {ProfileScreen} from '../screens/profile/ProfileScreen';
import {SubscriptionScreen} from '../screens/profile/SubscriptionScreen';
import {BillingScreen} from '../screens/profile/BillingScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

export type AppTabsParamList = {
  Dashboard: undefined;
  Products: undefined;
  Reactions: undefined;
  Insights: undefined;
  Profile: undefined;
};

export type ProductsStackParamList = {
  ProductList: undefined;
  AddProduct: undefined;
  ProductDetail: {product: Product};
};

export type ReactionsStackParamList = {
  ReactionList: undefined;
  AddReaction: undefined;
};

export type InsightsStackParamList = {
  TriggerAnalysis: undefined;
  Recommendations: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Subscription: undefined;
  Billing: {plan: 'monthly' | 'annual'};
};

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const AppTabsNav = createBottomTabNavigator<AppTabsParamList>();
const ProductsStackNav = createNativeStackNavigator<ProductsStackParamList>();
const ReactionsStackNav = createNativeStackNavigator<ReactionsStackParamList>();
const InsightsStackNav = createNativeStackNavigator<InsightsStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

// ---------------------------------------------------------------------------
// Tab icons — pure React Native, no external icon library
// ---------------------------------------------------------------------------

function TabIcon({name, focused}: {name: string; focused: boolean}) {
  const color = focused ? '#1A6FD4' : '#94A3B8';
  const icons: Record<string, string> = {
    Dashboard: '⊞',
    Products: '◫',
    Reactions: '◎',
    Insights: '◈',
    Profile: '◉',
  };

  // Use Unicode geometric shapes as clean minimal icons
  const unicodeIcons: Record<string, {active: string; inactive: string}> = {
    Dashboard: {active: '▦', inactive: '▦'},
    Products: {active: '▣', inactive: '▣'},
    Reactions: {active: '◉', inactive: '◎'},
    Insights: {active: '◈', inactive: '◇'},
    Profile: {active: '●', inactive: '○'},
  };

  const icon = unicodeIcons[name] ?? {active: '●', inactive: '○'};

  return (
    <View style={tabIconStyles.container}>
      <Text style={[tabIconStyles.icon, {color}]}>
        {focused ? icon.active : icon.inactive}
      </Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: {alignItems: 'center', justifyContent: 'center'},
  icon: {fontSize: 20},
});

// ---------------------------------------------------------------------------
// Stacks
// ---------------------------------------------------------------------------

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{headerShown: false}}>
      <AuthStackNav.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
    </AuthStackNav.Navigator>
  );
}

function ProductsStack() {
  return (
    <ProductsStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#FFFFFF'},
        headerTintColor: '#1A6FD4',
        headerTitleStyle: {color: '#0F172A', fontWeight: '600'},
        headerShadowVisible: false,
      }}>
      <ProductsStackNav.Screen name="ProductList" component={ProductListScreen} options={{headerShown: false}} />
      <ProductsStackNav.Screen name="AddProduct" component={AddProductScreen} options={{title: 'Add Product'}} />
      <ProductsStackNav.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={({route}) => ({title: route.params.product.name})}
      />
    </ProductsStackNav.Navigator>
  );
}

function ReactionsStack() {
  return (
    <ReactionsStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#FFFFFF'},
        headerTintColor: '#1A6FD4',
        headerTitleStyle: {color: '#0F172A', fontWeight: '600'},
        headerShadowVisible: false,
      }}>
      <ReactionsStackNav.Screen name="ReactionList" component={ReactionListScreen} options={{headerShown: false}} />
      <ReactionsStackNav.Screen name="AddReaction" component={AddReactionScreen} options={{title: 'Log Reaction'}} />
    </ReactionsStackNav.Navigator>
  );
}

function InsightsStack() {
  return (
    <InsightsStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#FFFFFF'},
        headerTintColor: '#1A6FD4',
        headerTitleStyle: {color: '#0F172A', fontWeight: '600'},
        headerShadowVisible: false,
      }}>
      <InsightsStackNav.Screen name="TriggerAnalysis" component={TriggerAnalysisScreen} options={{title: 'Insights'}} />
      <InsightsStackNav.Screen name="Recommendations" component={RecommendationsScreen} options={{title: 'Recommendations'}} />
    </InsightsStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#FFFFFF'},
        headerTintColor: '#1A6FD4',
        headerTitleStyle: {color: '#0F172A', fontWeight: '600'},
        headerShadowVisible: false,
      }}>
      <ProfileStackNav.Screen name="Profile" component={ProfileScreen} options={{title: 'Profile'}} />
      <ProfileStackNav.Screen name="Subscription" component={SubscriptionScreen} options={{title: 'Subscription'}} />
      <ProfileStackNav.Screen name="Billing" component={BillingScreen} options={{title: 'Checkout'}} />
    </ProfileStackNav.Navigator>
  );
}

function AppTabs() {
  return (
    <AppTabsNav.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused}) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#1A6FD4',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}>
      <AppTabsNav.Screen name="Dashboard" component={DashboardScreen} />
      <AppTabsNav.Screen name="Products" component={ProductsStack} />
      <AppTabsNav.Screen name="Reactions" component={ReactionsStack} />
      <AppTabsNav.Screen name="Insights" component={InsightsStack} />
      <AppTabsNav.Screen name="Profile" component={ProfileStack} />
    </AppTabsNav.Navigator>
  );
}

export function RootNavigator() {
  const accessToken = useAuthStore(state => state.accessToken);
  return (
    <NavigationContainer>
      {accessToken == null ? <AuthStack /> : <AppTabs />}
    </NavigationContainer>
  );
}
