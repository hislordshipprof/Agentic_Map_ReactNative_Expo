/**
 * Authentication Types - Agentic Mobile Map
 * 
 * Type definitions for authentication system
 */

export type AuthProvider = 'anonymous' | 'google' | 'apple' | 'phone';

export interface User {
  id: string;
  provider: AuthProvider;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  isAnonymous: boolean;
  createdAt: number;
  lastLoginAt: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SignInResponse {
  user: User;
  tokens: AuthTokens;
}

export interface SignUpData {
  provider: AuthProvider;
  email?: string;
  password?: string;
  phoneNumber?: string;
  displayName?: string;
}
