/**
 * Authentication Service - Agentic Mobile Map
 * 
 * Progressive authentication:
 * 1. Start anonymous (local storage only)
 * 2. Prompt after first successful route
 * 3. Support Google, Apple, Phone OTP
 * 4. Sync data on sign-up
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, AuthTokens, SignInResponse, SignUpData } from './types';

const STORAGE_KEYS = {
  USER: '@agentic_map:user',
  TOKENS: '@agentic_map:tokens',
  ANONYMOUS_ID: '@agentic_map:anonymous_id',
  ONBOARDING_COMPLETE: '@agentic_map:onboarding_complete',
} as const;

/**
 * AuthService - Main authentication service
 */
export class AuthService {
  /**
   * Initialize anonymous session
   * Called on app first launch
   */
  static async initializeAnonymous(): Promise<User> {
    const existingUser = await this.getCurrentUser();
    if (existingUser) return existingUser;

    // Create anonymous user
    const anonymousUser: User = {
      id: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'anonymous',
      isAnonymous: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(anonymousUser));
    await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_ID, anonymousUser.id);

    return anonymousUser;
  }

  /**
   * Get current user from storage
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (!userJson) return null;
      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (not anonymous)
   */
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null && !user.isAnonymous;
  }

  /**
   * Sign up with provider
   * @param data - Sign up data
   * @returns User and tokens
   */
  static async signUp(data: SignUpData): Promise<SignInResponse> {
    // This would call your backend API
    // For now, mock implementation
    
    const user: User = {
      id: `user_${Date.now()}`,
      provider: data.provider,
      email: data.email,
      phoneNumber: data.phoneNumber,
      displayName: data.displayName,
      isAnonymous: false,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    const tokens: AuthTokens = {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiresAt: Date.now() + 3600000, // 1 hour
    };

    // Store user and tokens
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));

    // TODO: Sync anonymous user data to authenticated account
    await this.syncAnonymousData();

    return { user, tokens };
  }

  /**
   * Sign in with provider
   * @param provider - Auth provider
   * @returns User and tokens
   */
  static async signIn(provider: AuthProvider): Promise<SignInResponse> {
    // This would integrate with expo-auth-session for social login
    // For now, mock implementation
    
    const user: User = {
      id: `user_${Date.now()}`,
      provider,
      isAnonymous: false,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    const tokens: AuthTokens = {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiresAt: Date.now() + 3600000,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));

    return { user, tokens };
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    // Clear tokens but keep anonymous mode available
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKENS);
    
    // Reinitialize as anonymous
    await this.initializeAnonymous();
  }

  /**
   * Sync anonymous user data to authenticated account
   * Syncs: saved routes, anchors, preferences
   */
  private static async syncAnonymousData(): Promise<void> {
    // This would sync local data to backend
    // For now, just remove anonymous ID
    await AsyncStorage.removeItem(STORAGE_KEYS.ANONYMOUS_ID);
  }

  /**
   * Check if onboarding is complete
   */
  static async isOnboardingComplete(): Promise<boolean> {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  }

  /**
   * Mark onboarding as complete
   */
  static async completeOnboarding(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  }

  /**
   * Get auth tokens
   */
  static async getTokens(): Promise<AuthTokens | null> {
    try {
      const tokensJson = await AsyncStorage.getItem(STORAGE_KEYS.TOKENS);
      if (!tokensJson) return null;
      return JSON.parse(tokensJson) as AuthTokens;
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<AuthTokens | null> {
    const currentTokens = await this.getTokens();
    if (!currentTokens) return null;

    // This would call your backend API to refresh
    // For now, mock implementation
    const newTokens: AuthTokens = {
      accessToken: 'new_mock_access_token',
      refreshToken: currentTokens.refreshToken,
      expiresAt: Date.now() + 3600000,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(newTokens));
    return newTokens;
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(tokens: AuthTokens): boolean {
    return Date.now() >= tokens.expiresAt;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    if (!tokens) return null;

    if (this.isTokenExpired(tokens)) {
      const newTokens = await this.refreshToken();
      return newTokens?.accessToken || null;
    }

    return tokens.accessToken;
  }
}

export default AuthService;
