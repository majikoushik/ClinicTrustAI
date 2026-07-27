/**
 * Admin Authentication Service
 * 
 * This service handles admin-specific authentication
 */

import { get, post } from '../utils/apiUtils';
import { authStorage } from '../utils/storageUtils';

/**
 * Admin login
 * 
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - Admin email
 * @param {string} credentials.password - Admin password
 * @returns {Promise} Promise that resolves with login result
 */
export const adminLogin = async (credentials) => {
  try {
    authStorage.clear();
    const response = await post('/admin/auth/login', credentials);
    if (response.success) {
      authStorage.set('token', response.token);
      authStorage.set('user', response.user);
    }
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
};

/**
 * Verify admin token
 * 
 * @returns {Promise} Promise that resolves with verification result
 */
export const verifyAdminToken = async () => {
  try {
    const token = authStorage.get('token');
    
    if (!token) {
      return { success: false, error: 'No token found' };
    }
    
    // For development with mock data
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get stored user
      const user = authStorage.get('user');
      
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Not authorized as admin' };
      }
      
      return {
        success: true,
        user
      };
    }
    
    // Real API call
    const response = await get('/admin/auth/verify');

    return response;
  } catch (error) {
    console.error('Admin token verification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Admin logout
 */
export const adminLogout = () => {
  authStorage.clear();
  window.location.href = '/admin/login';
};

const adminAuthService = {
  adminLogin,
  verifyAdminToken,
  adminLogout
};

export default adminAuthService;
