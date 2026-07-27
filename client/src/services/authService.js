/**
 * Auth Service
 * 
 * This service handles authentication-related API calls
 */

import { post, get, mockResponse } from '../utils/apiUtils';
import { authStorage } from '../utils/storageUtils';

/**
 * Login a user
 * 
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise} Promise that resolves with the login result
 */
export const login = async (credentials) => {
  try {
    const response = await post('/auth/login', credentials);

    if (!response || !response.token) {
      console.error('Invalid login response:', response);
      throw new Error('Invalid login response: No token received');
    }

    authStorage.set('token', response.token);
    if (response.refreshToken) {
      authStorage.set('refreshToken', response.refreshToken);
    }
    authStorage.set('user', response.user);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Register a new user
 * 
 * @param {Object} userData - User data
 * @param {string} userData.firstName - User first name
 * @param {string} userData.lastName - User last name
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.role - User role
 * @param {string} userData.specialty - User specialty (for doctors)
 * @returns {Promise} Promise that resolves with the registration result
 */
export const register = async (userData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock response
      const mockUser = {
        id: '123456',
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        specialty: userData.specialty,
        profileImage: 'https://i.pravatar.cc/150?u=123456',
        tokenBalance: 100,
        blockchainId: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
        verificationStatus: 'pending'
      };
      
      const mockData = {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token'
      };

      const response = await mockResponse(mockData, 1500);
      
      // Store tokens in local storage
      authStorage.set('token', response.data.token);
      authStorage.set('refreshToken', response.data.refreshToken);
      authStorage.set('user', response.data.user);
      
      return response.data;
    }
    
    // Real API call
    const response = await post('/auth/register', userData);
    
    // Ensure we have a valid response with token
    if (!response || !response.token) {
      throw new Error('Invalid registration response: No token received');
    }
    
    // Store tokens in local storage
    authStorage.set('token', response.token);
    if (response.refreshToken) {
      authStorage.set('refreshToken', response.refreshToken);
    }
    authStorage.set('user', response.user);
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Logout a user
 * 
 * @returns {Promise} Promise that resolves when logout is complete
 */
export const logout = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock response
      await mockResponse({ success: true }, 500);
      
      // Clear auth storage
      authStorage.clear();
      
      return { success: true };
    }
    
    // Real API call
    const response = await post('/auth/logout');
    
    // Clear auth storage
    authStorage.clear();
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Clear auth storage even if API call fails
    authStorage.clear();
    
    throw error;
  }
};

/**
 * Refresh the authentication token
 * 
 * @returns {Promise} Promise that resolves with the new token
 */
export const refreshToken = async () => {
  try {
    const refreshToken = authStorage.get('refreshToken', false);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock response
      const mockData = {
        token: 'mock-jwt-token-refreshed',
        refreshToken: 'mock-refresh-token-refreshed'
      };

      const response = await mockResponse(mockData, 500);
      
      // Store new tokens in local storage
      authStorage.set('token', response.data.token);
      authStorage.set('refreshToken', response.data.refreshToken);
      
      return response.data;
    }
    
    // Real API call
    const response = await post('/api/auth/refresh-token', { refreshToken });
    
    // Ensure we have a valid response with token
    if (!response || !response.token) {
      throw new Error('Invalid refresh token response: No token received');
    }
    
    // Store new tokens in local storage
    authStorage.set('token', response.token);
    if (response.refreshToken) {
      authStorage.set('refreshToken', response.refreshToken);
    }
    
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear auth storage if refresh fails
    authStorage.clear();
    
    throw error;
  }
};

/**
 * Request a password reset
 * 
 * @param {Object} data - Password reset data
 * @param {string} data.email - User email
 * @returns {Promise} Promise that resolves with the reset request result
 */
export const requestPasswordReset = async (data) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock response
      return await mockResponse({ success: true, message: 'Password reset email sent' }, 1000);
    }
    
    // Real API call
    return await post('/auth/request-password-reset', data);
  } catch (error) {
    console.error('Password reset request error:', error);
    throw error;
  }
};

/**
 * Check whether a password-reset token is valid, without consuming it.
 * Used by the Reset Password screen to show an error state up front instead
 * of only discovering an expired/invalid link after the user fills the form.
 *
 * @param {string} token - Reset token from the emailed link
 * @returns {Promise} Promise that resolves if the token is valid, rejects otherwise
 */
export const verifyResetToken = async (token) => {
  if (process.env.REACT_APP_MOCK_API === 'true') {
    return await mockResponse({ success: true }, 500);
  }
  return await get('/auth/verify-reset-token', { token });
};

/**
 * Reset a password
 *
 * @param {Object} data - Password reset data
 * @param {string} data.token - Reset token
 * @param {string} data.password - New password
 * @returns {Promise} Promise that resolves with the reset result
 */
export const resetPassword = async (data) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock response
      return await mockResponse({ success: true, message: 'Password reset successful' }, 1000);
    }
    
    // Real API call
    return await post('/auth/reset-password', data);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

/**
 * Change a password
 * 
 * @param {Object} data - Password change data
 * @param {string} data.currentPassword - Current password
 * @param {string} data.newPassword - New password
 * @returns {Promise} Promise that resolves with the change result
 */
export const changePassword = async (data) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock response
      return await mockResponse({ success: true, message: 'Password changed successfully' }, 1000);
    }
    
    // Real API call
    return await post('/auth/change-password', data);
  } catch (error) {
    console.error('Password change error:', error);
    throw error;
  }
};

/**
 * Get the current user
 * 
 * @returns {Promise} Promise that resolves with the user data
 */
export const getCurrentUser = async () => {
  try {
    // Check if user data is in storage
    const user = authStorage.get('user');
    
    if (user) {
      return user;
    }
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock response
      const mockUser = {
        id: '123456',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@clinictrust.ai',
        role: 'Doctor',
        specialty: 'Cardiology',
        profileImage: 'https://i.pravatar.cc/150?u=123456',
        tokenBalance: 1250,
        blockchainId: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
        verificationStatus: 'verified'
      };
      
      const response = await mockResponse(mockUser, 500);
      
      // Store user data in local storage
      authStorage.set('user', response.data);
      
      return response.data;
    }
    
    // Real API call
    const response = await get('/auth/me');
    
    // Store user data in local storage
    authStorage.set('user', response);
    
    return response;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

/**
 * Check if user is authenticated
 * 
 * @returns {boolean} Whether the user is authenticated
 */
export const isAuthenticated = () => {
  return Boolean(authStorage.get('token', false));
};

// Export all auth service functions
const authService = {
  login,
  register,
  logout,
  refreshToken,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  changePassword,
  getCurrentUser,
  isAuthenticated
};

export default authService;
