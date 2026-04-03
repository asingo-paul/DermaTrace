import React from 'react';
import {View, StyleSheet} from 'react-native';
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

function TabIcon({name, focused}: {name: string; focused: boolean}) {
  const c = focused ? '#1A6FD4' : '#94A3B8';
  const op = focused ? 1 : 0.55;

  if (name === 'Dashboard') {
    return (
      <View style={[s.grid, {opacity: op}]}>
        <View style={s.gridRow}>
          <View style={[s.cell, {backgroundColor: c}]} />
          <View style={[s.cell, {backgroundColor: c}]} />
        </View>
        <View style={s.gridRow}>
          <View style={[s.cell, {backgroundColor: c}]} />
          <View style={[s.cell, {backgroundColor: c}]} />
        </View>
      </View>
    );
  }
  if (name === 'Products') {
    return (
      <View style={[s.pkg, {borderColor: c, opacity: op}]}>
        <View style={[s.pkgTop, {backgroundColor: c}]} />
        <View style={[s.pkgLine, {backgroundColor: c}]} />
      </View>
    );
  }
  if (name === 'Reactions') {
    return (
      <View style={[s.ring, {borderColor: c, opacity: op}]}>
        {focused && <View style={[s.dot, {backgroundColor: c}]} />}
      </View>
    );
  }
  if (name === 'Insights') {
    return (
      <View style={[s.sparkWrap, {opacity: op}]}>
        <View style={[s.sparkV, {backgroundColor: c}]} />
        <View style={[s.sparkH, {backgroundColor: c}]} />
      </View>
    );
  }
  if (name === 'Profile') {
    return (
      <View style={[s.personWrap, {opacity: op}]}>
        <View style={[s.head, {backgroundColor: c}]} />
        <View style={[s.body, {backgroundColor: c}]} />
      </View>
    );
  }
  return null;
}

const s = StyleSheet.create({
  grid: {width: 22, height: 22, gap: 3},
  gridRow: {flexDirection: 'row', gap: 3},
  cell: {width: 9, height: 9, borderRadius: 2},
  pkg: {width: 20, height: 18, borderWidth: 2, borderRadius: 3, overflow: 'hidden', alignItems: 'center'},
  pkgTop: {width: '100%', height: 5},
  pkgLine: {width: 8, height: 2, marginTop: 3, borderRadius: 1},
  ring: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  dot: {width: 6, height: 6, borderRadius: 3},
  sparkWrap: {width: 22, height: 22, alignItems: 'center', justifyContent: 'center'},
  sparkV: {position: 'absolute', width: 2, height: 18, borderRadius: 1},
  sparkH: {position: 'absolute', width: 18, height: 2, borderRadius: 1},
  personWrap: {alignItems: 'center', gap: 3},
  head: {width: 10, height: 10, borderRadius: 5},
  body: {width: 18, height: 8, borderRadius: 9},
});

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
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {fontSize: 11, fontWeight: '500', marginTop: 2},
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
