/**
 * Auth Slice - Redux state management for authentication
 * 
 * Per requirements-frontend.md Phase 1.4:
 * - userSlice: Anchors, preferences
 * 
 * Manages:
 * - Current user state
 * - Authentication status
 * - Loading states
 * - Error handling
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthService } from '@/services/auth';
import type { AuthState, User, SignUpData, AuthProvider } from '@/services/auth';

/**
 * Initial state
 */
const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

/**
 * Async thunks
 */

// Initialize auth (check for existing user)
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      // No user, start anonymous
      return await AuthService.initializeAnonymous();
    }
    return user;
  }
);

// Sign up
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (data: SignUpData, { rejectWithValue }) => {
    try {
      const response = await AuthService.signUp(data);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign up failed');
    }
  }
);

// Sign in
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (provider: AuthProvider, { rejectWithValue }) => {
    try {
      const response = await AuthService.signIn(provider);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign in failed');
    }
  }
);

// Sign out
export const signOut = createAsyncThunk(
  'auth/signOut',
  async () => {
    await AuthService.signOut();
    return await AuthService.getCurrentUser(); // Returns anonymous user
  }
);

/**
 * Auth slice
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Update user
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // Initialize auth
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !action.payload.isAnonymous;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initialize auth';
      });

    // Sign up
    builder
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sign in
    builder
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sign out
    builder
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = false;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Sign out failed';
      });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
