/**
 * Token Service
 * 
 * This service handles token-related API calls
 */

import { get, post, mockResponse } from '../utils/apiUtils';
import { 
  generateTokenTransactions, 
  mockTokenTransactions, 
  mockRedemptionServices, 
  mockTokenEarnSources,
  generateMockTokenTransfer,
  generateMockTokenRedemption 
} from './mockData';
import { authStorage } from '../utils/storageUtils';

/**
 * Get the current user's token balance
 * 
 * @returns {Promise} Promise that resolves with the token balance
 */
export const getTokenBalance = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate a random balance between 50 and 500 for demo purposes
      // In a real app, this would come from the server
      const savedBalance = localStorage.getItem('mockTokenBalance');
      let balance;
      
      if (savedBalance) {
        balance = parseInt(savedBalance, 10);
      } else {
        balance = Math.floor(Math.random() * 450) + 50;
        localStorage.setItem('mockTokenBalance', balance.toString());
      }
      
      return await mockResponse({ balance }, 300);
    }
    
    // Real API call
    return await get('/tokens/balance');
  } catch (error) {
    console.error('Get token balance error:', error);
    throw error;
  }
};

/**
 * Get the current user's token transactions
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Page size
 * @param {string} options.type - Transaction type (reward, transfer, redemption, system)
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order (asc, desc)
 * @returns {Promise} Promise that resolves with the transactions list
 */
export const getTokenTransactions = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      page: 0,
      limit: 10,
      type: '',
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock token transactions from mockData.js
      const mockTransactions = [...mockTokenTransactions];
      
      // Filter by type
      let filteredTransactions = mockTransactions;
      if (queryOptions.type) {
        filteredTransactions = mockTransactions.filter(
          transaction => transaction.type === queryOptions.type
        );
      }
      
      // Sort transactions
      filteredTransactions.sort((a, b) => {
        const field = queryOptions.sortBy;
        const order = queryOptions.sortOrder === 'asc' ? 1 : -1;
        
        if (a[field] < b[field]) return -1 * order;
        if (a[field] > b[field]) return 1 * order;
        return 0;
      });
      
      // Paginate transactions
      const startIndex = queryOptions.page * queryOptions.limit;
      const endIndex = startIndex + queryOptions.limit;
      const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
      
      // Create response
      const mockResponseObj = {
        transactions: paginatedTransactions,
        pagination: {
          total: filteredTransactions.length,
          page: queryOptions.page,
          limit: queryOptions.limit,
          pages: Math.ceil(filteredTransactions.length / queryOptions.limit)
        }
      };
      
      return await mockResponse(mockResponseObj, 800);
    }
    
    // Real API call
    return await get('/tokens/transactions', queryOptions);
  } catch (error) {
    console.error('Get token transactions error:', error);
    throw error;
  }
};

/**
 * Get a token transaction by ID
 * 
 * @param {string} transactionId - Transaction ID
 * @returns {Promise} Promise that resolves with the transaction data
 */
export const getTokenTransaction = async (transactionId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock transactions
      const mockTransactions = generateTokenTransactions(30);
      
      // Find the transaction
      const transaction = mockTransactions.find(t => t.id === transactionId) || mockTransactions[0];
      transaction.id = transactionId;
      
      return await mockResponse(transaction);
    }
    
    // Real API call
    return await get(`/tokens/transactions/${transactionId}`);
  } catch (error) {
    console.error('Get token transaction error:', error);
    throw error;
  }
};

/**
 * Transfer tokens to another user
 * 
 * @param {Object} transferData - Transfer data
 * @param {string} transferData.recipientId - Recipient user ID
 * @param {number} transferData.amount - Amount to transfer
 * @param {string} transferData.description - Transfer description
 * @returns {Promise} Promise that resolves with the transfer result
 */
export const transferTokens = async (transferData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Get user from storage
      const storedUser = authStorage.get('user');
      
      // Check if user has enough tokens
      if (storedUser && storedUser.tokenBalance < transferData.amount) {
        return await mockResponse(
          { error: 'Insufficient tokens' },
          1000,
          false,
          400
        );
      }
      
      // Create mock transaction using the generator function from mockData.js
      const mockTransaction = generateMockTokenTransfer(transferData, storedUser);
      
      // Update user token balance in storage
      if (storedUser) {
        authStorage.set('user', {
          ...storedUser,
          tokenBalance: storedUser.tokenBalance - transferData.amount
        });
      }
      
      return await mockResponse(mockTransaction, 1500);
    }
    
    // Real API call
    return await post('/tokens/transfer', transferData);
  } catch (error) {
    console.error('Transfer tokens error:', error);
    throw error;
  }
};

/**
 * Redeem tokens for a service
 * 
 * @param {Object} redemptionData - Redemption data
 * @param {string} redemptionData.serviceId - Service ID
 * @param {number} redemptionData.amount - Amount to redeem
 * @param {Object} redemptionData.parameters - Service parameters
 * @returns {Promise} Promise that resolves with the redemption result
 */
export const redeemTokens = async (redemptionData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Get user from storage
      const storedUser = authStorage.get('user');
      
      // Check if user has enough tokens
      if (storedUser && storedUser.tokenBalance < redemptionData.amount) {
        return await mockResponse(
          { error: 'Insufficient tokens' },
          1000,
          false,
          400
        );
      }
      
      // Create mock transaction using the generator function from mockData.js
      const mockTransaction = generateMockTokenRedemption(redemptionData, storedUser);
      
      // Update user token balance in storage
      if (storedUser) {
        authStorage.set('user', {
          ...storedUser,
          tokenBalance: storedUser.tokenBalance - redemptionData.amount
        });
      }
      
      return await mockResponse(mockTransaction, 2000);
    }
    
    // Real API call
    return await post('/tokens/redeem', redemptionData);
  } catch (error) {
    console.error('Redeem tokens error:', error);
    throw error;
  }
};

/**
 * Get available services for token redemption
 * 
 * @returns {Promise} Promise that resolves with the services list
 */
export const getRedemptionServices = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock redemption services from mockData.js
      const mockServices = [...mockRedemptionServices];
      
      return await mockResponse(mockServices);
    }
    
    // Real API call
    return await get('/tokens/services');
  } catch (error) {
    console.error('Get redemption services error:', error);
    throw error;
  }
};

/**
 * Get token earn sources
 * 
 * @returns {Promise} Promise that resolves with the earn sources list
 */
export const getTokenEarnSources = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock token earn sources from mockData.js
      const mockEarnSources = [...mockTokenEarnSources];
      
      return await mockResponse(mockEarnSources, 500);
    }
    
    // Real API call
    return await get('/tokens/earn-sources');
  } catch (error) {
    console.error('Get token earn sources error:', error);
    throw error;
  }
};

// Export all token service functions
const tokenService = {
  getTokenBalance,
  getTokenTransactions,
  getTokenTransaction,
  transferTokens,
  redeemTokens,
  getRedemptionServices,
  getTokenEarnSources
};

export default tokenService;
