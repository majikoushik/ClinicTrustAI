/**
 * Blockchain Service
 * 
 * This service handles blockchain-related operations including fetching transaction history
 */

import { get } from '../utils/apiUtils';
import { blockchainTransactionsMockData, blockchainTransactionDetailsMockData } from './mockData';

/**
 * Get blockchain transaction history
 * 
 * @returns {Promise<Array>} Promise that resolves with transaction history
 */
export const getTransactionHistory = async () => {
  try {
    // Mock mode only when explicitly enabled — matches every other service in the app
    if (process.env.REACT_APP_MOCK_API === 'true') {
      await new Promise(resolve => setTimeout(resolve, 800));
      return blockchainTransactionsMockData;
    }

    // Real API call — server wraps the list in { success, data, pagination }
    const response = await get('/blockchain/transactions', { limit: 100 });
    return response?.data || [];
  } catch (error) {
    console.error('Error fetching blockchain transactions:', error);
    throw error;
  }
};

/**
 * Get transaction details
 * 
 * @param {string} hash - Transaction hash
 * @returns {Promise<Object>} Promise that resolves with transaction details
 */
export const getTransactionDetails = async (hash) => {
  try {
    // Mock mode only when explicitly enabled — matches every other service in the app
    if (process.env.REACT_APP_MOCK_API === 'true') {
      await new Promise(resolve => setTimeout(resolve, 500));
      const transaction = blockchainTransactionDetailsMockData[hash];
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      return transaction;
    }

    // Real API call — server wraps the record in { success, data }
    const response = await get(`/blockchain/transactions/${hash}`);
    return response?.data || response;
  } catch (error) {
    console.error(`Error fetching transaction details for ${hash}:`, error);
    throw error;
  }
};

const blockchainService = {
  getTransactionHistory,
  getTransactionDetails
};

export default blockchainService;
