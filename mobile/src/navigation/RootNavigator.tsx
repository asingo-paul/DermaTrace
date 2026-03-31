import React from 'react';
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

// ---------------------------------------------------------------------------
// Stack / Tab types
// ---------------------------------------------------------------------------

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
// AuthStack
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

// ---------------------------------------------------------------------------
// ProductsStack
// ---------------------------------------------------------------------------

function ProductsStack() {
  return (
    <ProductsStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#FFFFFF'},
        headerTintColor: '#4A90D9',
        headerTitleStyle: {color: '#1A1A2E', fontWeight: '600'},
      }}>
      <ProductsStackNav.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{headerShown: false}}
      />
      <ProductsStackNav.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{title: 'Add Product', headerBackTitle: 'Back'}}
      />
      <ProductsStackNav.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={({route}) => ({
          title: route.params.product.name,
          headerBackTitle: 'Back',
        })}
      />
    </ProductsStackNav.Navigator>
  );
}

// ---------------------------------------------------------------------------
// ReactionsStack
// ---------------------------------------------------------------------------

function ReactionsStack() {
  return (
    <ReactionsStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#FFFFFF'},
        headerTintColor: '#4A90D9',
        headerTitleStyle: {color: '#1A1A2E', fontWeight: '600'},
      }}>
      <ReactionsStackNav.Screen
        name="ReactionList"
        component={ReactionListScreen}
        options={{headerShown: false}}
      />
      <ReactionsStackNav.Screen
        name="AddReaction"
        component={AddReactionScreen}
        options={{title: 'Log Reaction', headerBackTitle: 'Back'}}
      />
    </ReactionsStackNav.Navigator>
  );
}

// ---------------------------------------------------------------------------
// InsightsStack
// ---------------------------------------------------------------------------

function InsightsStack() {
  return (
    <InsightsStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#FFFFFF'},
        headerTintColor: '#4A90D9',
        headerTitleStyle: {color: '#1A1A2E', fontWeight: '600'},
      }}>
      <InsightsStackNav.Screen
        name="TriggerAnalysis"
        component={TriggerAnalysisScreen}
        options={{title: 'Insights'}}
      />
      <InsightsStackNav.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{title: 'Recommendations', headerBackTitle: 'Back'}}
      />
    </InsightsStackNav.Navigator>
  );
}

// ---------------------------------------------------------------------------
// ProfileStack
// ---------------------------------------------------------------------------

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#FFFFFF'},
        headerTintColor: '#4A90D9',
        headerTitleStyle: {color: '#1A1A2E', fontWeight: '600'},
      }}>
      <ProfileStackNav.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
      <ProfileStackNav.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{title: 'Subscription', headerBackTitle: 'Back'}}
      />
      <ProfileStackNav.Screen
        name="Billing"
        component={BillingScreen}
        options={{title: 'Billing', headerBackTitle: 'Back'}}
      />
    </ProfileStackNav.Navigator>
  );
}

// ---------------------------------------------------------------------------
// AppTabs
// ---------------------------------------------------------------------------

function AppTabs() {
  return (
    <AppTabsNav.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {backgroundColor: '#FFFFFF'},
        tabBarActiveTintColor: '#4A90D9',
        tabBarInactiveTintColor: '#9B9B9B',
      }}>
      <AppTabsNav.Screen name="Dashboard" component={DashboardScreen} />
      <AppTabsNav.Screen name="Products" component={ProductsStack} />
      <AppTabsNav.Screen name="Reactions" component={ReactionsStack} />
      <AppTabsNav.Screen name="Insights" component={InsightsStack} />
      <AppTabsNav.Screen name="Profile" component={ProfileStack} />
    </AppTabsNav.Navigator>
  );
}

// ---------------------------------------------------------------------------
// RootNavigator
// ---------------------------------------------------------------------------

export function RootNavigator() {
  const accessToken = useAuthStore(state => state.accessToken);

  return (
    <NavigationContainer>
      {accessToken == null ? <AuthStack /> : <AppTabs />}
    </NavigationContainer>
  );
}
