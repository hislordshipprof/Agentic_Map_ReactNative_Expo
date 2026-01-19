/**
 * SecureStorage Service - Agentic Mobile Map
 *
 * Secure storage for sensitive data using expo-secure-store.
 * Falls back to AsyncStorage for web (with console warning).
 *
 * Security features:
 * - Uses device keychain/keystore on iOS/Android
 * - Encrypted at rest
 * - Requires device authentication on supported devices
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Storage keys for secure data
 */
export const SecureKeys = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  DEVICE_ID: 'device_id',
  BIOMETRIC_ENABLED: 'biometric_enabled',
} as const;

export type SecureKey = typeof SecureKeys[keyof typeof SecureKeys];

/**
 * Check if SecureStore is available
 */
const isSecureStoreAvailable = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

/**
 * SecureStorage class
 */
class SecureStorageService {
  private readonly isSecure: boolean;

  constructor() {
    this.isSecure = isSecureStoreAvailable();
    if (!this.isSecure && __DEV__) {
      console.warn(
        '[SecureStorage] SecureStore not available on this platform. ' +
        'Using AsyncStorage fallback. DO NOT use in production for sensitive data.'
      );
    }
  }

  /**
   * Store a value securely
   */
  async setItem(key: SecureKey, value: string): Promise<void> {
    if (!value) {
      await this.deleteItem(key);
      return;
    }

    try {
      if (this.isSecure) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      } else {
        // Fallback for web - prefix to identify secure items
        await AsyncStorage.setItem(`@secure:${key}`, value);
      }
    } catch (error) {
      console.error(`[SecureStorage] Failed to store ${key}:`, error);
      throw new Error(`Failed to securely store ${key}`);
    }
  }

  /**
   * Retrieve a value securely
   */
  async getItem(key: SecureKey): Promise<string | null> {
    try {
      if (this.isSecure) {
        return await SecureStore.getItemAsync(key);
      } else {
        return await AsyncStorage.getItem(`@secure:${key}`);
      }
    } catch (error) {
      console.error(`[SecureStorage] Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value
   */
  async deleteItem(key: SecureKey): Promise<void> {
    try {
      if (this.isSecure) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(`@secure:${key}`);
      }
    } catch (error) {
      console.error(`[SecureStorage] Failed to delete ${key}:`, error);
    }
  }

  /**
   * Check if a key exists
   */
  async hasItem(key: SecureKey): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  /**
   * Clear all secure storage
   */
  async clearAll(): Promise<void> {
    const keys = Object.values(SecureKeys);
    await Promise.all(keys.map((key) => this.deleteItem(key)));
  }

  /**
   * Store auth tokens
   */
  async setAuthTokens(accessToken: string, refreshToken?: string): Promise<void> {
    await this.setItem(SecureKeys.AUTH_TOKEN, accessToken);
    if (refreshToken) {
      await this.setItem(SecureKeys.REFRESH_TOKEN, refreshToken);
    }
  }

  /**
   * Get auth token
   */
  async getAuthToken(): Promise<string | null> {
    return this.getItem(SecureKeys.AUTH_TOKEN);
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return this.getItem(SecureKeys.REFRESH_TOKEN);
  }

  /**
   * Clear auth tokens
   */
  async clearAuthTokens(): Promise<void> {
    await Promise.all([
      this.deleteItem(SecureKeys.AUTH_TOKEN),
      this.deleteItem(SecureKeys.REFRESH_TOKEN),
    ]);
  }

  /**
   * Generate and store a device ID
   */
  async getOrCreateDeviceId(): Promise<string> {
    let deviceId = await this.getItem(SecureKeys.DEVICE_ID);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      await this.setItem(SecureKeys.DEVICE_ID, deviceId);
    }
    return deviceId;
  }
}

/**
 * Singleton instance
 */
export const SecureStorage = new SecureStorageService();

export default SecureStorage;
