/**
 * User Service
 * 
 * This service handles user-related API calls
 */

import { get, post, put, mockResponse } from '../utils/apiUtils';
import { generateUsers } from './mockData';
import { authStorage } from '../utils/storageUtils';

/**
 * Get the current user's profile
 * 
 * @returns {Promise} Promise that resolves with the user profile
 */
export const getUserProfile = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Get user from storage or generate a mock user
      const storedUser = authStorage.get('user');
      const mockUser = storedUser || generateUsers(1)[0];
      
      // Add additional profile fields
      const mockProfile = {
        ...mockUser,
        address: '123 Main St, City, State 12345',
        phoneNumber: '(123) 456-7890',
        dateOfBirth: '1985-05-15',
        gender: 'Male',
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phoneNumber: '(123) 456-7891'
        },
        education: [
          {
            institution: 'Medical University',
            degree: 'Doctor of Medicine',
            year: '2010'
          }
        ],
        certifications: [
          {
            name: 'Board Certification in Cardiology',
            issuedBy: 'American Board of Internal Medicine',
            year: '2012',
            expiryYear: '2022'
          }
        ],
        registrationDate: '2023-01-15T10:30:00Z',
        lastVerified: '2023-03-20T14:45:00Z'
      };
      
      return await mockResponse(mockProfile);
    }
    
    // Real API call
    return await get('/users/profile');
  } catch (error) {
    console.error('Get user profile error:', error);
    throw error;
  }
};

/**
 * Update the current user's profile
 * 
 * @param {Object} profileData - Updated profile data
 * @returns {Promise} Promise that resolves with the updated profile
 */
export const updateUserProfile = async (profileData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Get user from storage
      const storedUser = authStorage.get('user');
      
      // Update user data
      const updatedUser = {
        ...storedUser,
        ...profileData
      };
      
      // Update user in storage
      authStorage.set('user', updatedUser);
      
      return await mockResponse(updatedUser, 1000);
    }
    
    // Real API call
    const response = await put('/users/profile', profileData);
    
    // Update user in storage
    const storedUser = authStorage.get('user');
    if (storedUser) {
      authStorage.set('user', {
        ...storedUser,
        ...response
      });
    }
    
    return response;
  } catch (error) {
    console.error('Update user profile error:', error);
    throw error;
  }
};

/**
 * Update the user's profile image
 * 
 * @param {File} imageFile - Image file
 * @returns {Promise} Promise that resolves with the updated profile
 */
export const updateProfileImage = async (imageFile) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate a mock image URL
      const mockImageUrl = `https://i.pravatar.cc/150?u=${Date.now()}`;
      
      // Get user from storage
      const storedUser = authStorage.get('user');
      
      // Update user data
      const updatedUser = {
        ...storedUser,
        profileImage: mockImageUrl
      };
      
      // Update user in storage
      authStorage.set('user', updatedUser);
      
      return await mockResponse({ profileImage: mockImageUrl }, 1500);
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('image', imageFile);
    
    // Real API call
    const response = await post('/users/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    // Extract the image URL from the response envelope { success, data: { profileImage } }
    const profileImage = response?.data?.profileImage || response?.profileImage;

    // Update user in storage
    const storedUser = authStorage.get('user');
    if (storedUser) {
      authStorage.set('user', { ...storedUser, profileImage });
    }

    return { profileImage };
  } catch (error) {
    console.error('Update profile image error:', error);
    throw error;
  }
};

/**
 * Get user settings
 * 
 * @returns {Promise} Promise that resolves with the user settings
 */
export const getUserSettings = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock settings
      const mockSettings = {
        security: {
          twoFactorEnabled: false,
          loginNotifications: true,
          passwordExpiry: 90,
          lastPasswordChange: '2023-05-10T08:15:00Z'
        },
        notifications: {
          email: true,
          referrals: true,
          tokenTransactions: true,
          analytics: true,
          marketing: false
        },
        privacy: {
          dataSharing: true,
          aiAnalysis: true,
          researchParticipation: false,
          dataRetention: 'standard' // standard, extended, minimal
        },
        preferences: {
          language: 'en',
          theme: 'system', // light, dark, system
          dashboardView: 'detailed' // simple, detailed, compact
        }
      };
      
      return await mockResponse(mockSettings);
    }
    
    // Real API call
    return await get('/users/settings');
  } catch (error) {
    console.error('Get user settings error:', error);
    throw error;
  }
};

/**
 * Update user settings
 * 
 * @param {Object} settings - Updated settings
 * @returns {Promise} Promise that resolves with the updated settings
 */
export const updateUserSettings = async (settings) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse(settings, 1000);
    }
    
    // Real API call
    return await put('/users/settings', settings);
  } catch (error) {
    console.error('Update user settings error:', error);
    throw error;
  }
};

/**
 * Request blockchain identity verification
 * 
 * @returns {Promise} Promise that resolves with the verification request result
 */
export const requestBlockchainVerification = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock response
      const mockResult = {
        success: true,
        message: 'Verification request submitted successfully',
        verificationStatus: 'pending',
        requestId: Math.random().toString(36).substring(2, 15)
      };

      // Update user in storage
      const storedUser = authStorage.get('user');
      if (storedUser) {
        authStorage.set('user', {
          ...storedUser,
          verificationStatus: 'pending'
        });
      }

      return await mockResponse(mockResult, 2000);
    }
    
    // Real API call — server responds with { success, data: { blockchainId, walletAddress, alreadyVerified } }
    const response = await post('/users/blockchain/verify');

    // Update user in storage so a page refresh still shows the new blockchain identity
    const storedUser = authStorage.get('user');
    if (storedUser && response?.data) {
      authStorage.set('user', {
        ...storedUser,
        blockchainId: response.data.blockchainId,
        walletAddress: response.data.walletAddress,
      });
    }

    return response;
  } catch (error) {
    console.error('Blockchain verification request error:', error);
    throw error;
  }
};

/**
 * Get all users (admin only)
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Page size
 * @param {string} options.search - Search term
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order (asc, desc)
 * @returns {Promise} Promise that resolves with the users list
 */
export const getAllUsers = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      page: 0,
      limit: 10,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock users
      const mockUsers = generateUsers(50);
      
      // Filter by search term
      let filteredUsers = mockUsers;
      if (queryOptions.search) {
        const searchTerm = queryOptions.search.toLowerCase();
        filteredUsers = mockUsers.filter(user => 
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.role.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort users
      filteredUsers.sort((a, b) => {
        const field = queryOptions.sortBy;
        const order = queryOptions.sortOrder === 'asc' ? 1 : -1;
        
        if (a[field] < b[field]) return -1 * order;
        if (a[field] > b[field]) return 1 * order;
        return 0;
      });
      
      // Paginate users
      const startIndex = queryOptions.page * queryOptions.limit;
      const endIndex = startIndex + queryOptions.limit;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
      
      // Create response
      const mockResponse = {
        users: paginatedUsers,
        pagination: {
          total: filteredUsers.length,
          page: queryOptions.page,
          limit: queryOptions.limit,
          pages: Math.ceil(filteredUsers.length / queryOptions.limit)
        }
      };
      
      return await mockResponse(mockResponse, 800);
    }
    
    // Real API call
    return await get('/users', queryOptions);
  } catch (error) {
    console.error('Get all users error:', error);
    throw error;
  }
};

/**
 * Get a user by ID (admin only)
 * 
 * @param {string} userId - User ID
 * @returns {Promise} Promise that resolves with the user data
 */
export const getUserById = async (userId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate a mock user
      const mockUser = generateUsers(1)[0];
      mockUser.id = userId;
      
      return await mockResponse(mockUser);
    }
    
    // Real API call
    return await get(`/users/${userId}`);
  } catch (error) {
    console.error('Get user by ID error:', error);
    throw error;
  }
};

// Export all user service functions
const userService = {
  getUserProfile,
  updateUserProfile,
  updateProfileImage,
  getUserSettings,
  updateUserSettings,
  requestBlockchainVerification,
  getAllUsers,
  getUserById
};

export default userService;
