/**
 * Admin Token Service
 * 
 * This service handles admin token management API calls
 */

import { get, post, del, mockResponse } from '../utils/apiUtils';
import { 
  mockProviders, 
  mockProviderTokenHistory, 
  mockCatalogItems, 
  mockConversionRules 
} from './mockData';

// No need for getToken function as apiUtils handles authentication

/**
 * Get provider token balances
 * 
 * @returns {Promise} Promise that resolves with provider token balances
 */
export const getProviderTokenBalances = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use imported mock provider data
      return { success: true, data: mockProviders }
    }
    
    // Real API call using apiUtils
    const response = await get('/admin/tokens/providers');
    return response;
  } catch (error) {
    console.error('Error in getProviderTokenBalances:', error);
    throw error;
  }
};

/**
 * Get provider token history
 * 
 * @param {string} providerId - Provider ID
 * @returns {Promise} Promise that resolves with provider token history
 */
export const getProviderTokenHistory = async (providerId) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use imported mock provider data
      return { success: true, data: mockProviderTokenHistory }
    }
    
    // Real API call using apiUtils
    const response = await get(`/admin/tokens/providers/${providerId}/history`);
    return response;
    
  } catch (error) {
    console.error(`Error in getProviderTokenHistory for provider ${providerId}:`, error);
    throw error;
  }
};

/**
 * Mint tokens for a provider
 * 
 * @param {Object} mintData - Mint data
 * @param {string} mintData.providerId - Provider ID
 * @param {number} mintData.amount - Amount to mint
 * @param {string} mintData.reason - Reason for minting
 * @returns {Promise} Promise that resolves with the mint result
 */
export const mintTokens = async (mintData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true });
    }
    
    // Real API call using apiUtils
    const response = await post('/admin/tokens/mint', mintData);
    return response;
  } catch (error) {
    console.error('Error in mintTokens:', error);
    throw error;
  }
};

/**
 * Burn tokens from a provider
 * 
 * @param {Object} burnData - Burn data
 * @param {string} burnData.providerId - Provider ID
 * @param {number} burnData.amount - Amount to burn
 * @param {string} burnData.reason - Reason for burning
 * @returns {Promise} Promise that resolves with the burn result
 */
export const burnTokens = async (burnData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true });
    }
    
    // Real API call using apiUtils
    const response = await post('/admin/tokens/burn', burnData);
    return response;
  } catch (error) {
    console.error('Error in burnTokens:', error);
    throw error;
  }
};

/**
 * Approve bonus tokens for a provider
 * 
 * @param {Object} bonusData - Bonus data
 * @param {string} bonusData.providerId - Provider ID
 * @param {number} bonusData.amount - Amount to bonus
 * @param {string} bonusData.reason - Reason for bonus
 * @returns {Promise} Promise that resolves with the bonus result
 */
export const approveBonus = async (bonusData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true });
    }
    
    // Real API call using apiUtils
    const response = await post('/admin/tokens/bonus', bonusData);
    return response;
  } catch (error) {
    console.error('Error in approveBonus:', error);
    throw error;
  }
};

/**
 * Get token redemption catalog
 * 
 * @returns {Promise} Promise that resolves with the catalog items
 */
export const getTokenCatalog = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use imported mock catalog data
      return { success: true, data: mockCatalogItems };
    }
    
    // Real API call using apiUtils
    const response = await get('/admin/tokens/catalog');
    return response;
  } catch (error) {
    console.error('Error in getTokenCatalog:', error);
    throw error;
  }
};

/**
 * Add catalog item
 * 
 * @param {Object} itemData - Item data
 * @returns {Promise} Promise that resolves with the add result
 */
export const addCatalogItem = async (itemData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true });
    }
    
    // Real API call using apiUtils
    const response = await post('/admin/tokens/catalog', itemData);
    return response;
  } catch (error) {
    console.error('Error in addCatalogItem:', error);
    throw error;
  }
};

/**
 * Remove catalog item
 * 
 * @param {string} itemId - Item ID
 * @returns {Promise} Promise that resolves with the remove result
 */
export const removeCatalogItem = async (itemId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true });
    }
    
    // Real API call using apiUtils
    const response = await del(`/admin/tokens/catalog/${itemId}`);
    return response;
  } catch (error) {
    console.error(`Error in removeCatalogItem for item ${itemId}:`, error);
    throw error;
  }
};

/**
 * Get token conversion rules
 * 
 * @returns {Promise} Promise that resolves with the conversion rules
 */
export const getTokenConversionRules = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use imported mock conversion rules
      return { success: true, data: mockConversionRules };
    }
    
    // Real API call using apiUtils
    const response = await get('/admin/tokens/conversion-rules');
    return response;
  } catch (error) {
    console.error('Error in getTokenConversionRules:', error);
    throw error;
  }
};

/**
 * Add conversion rule
 * 
 * @param {Object} ruleData - Rule data
 * @returns {Promise} Promise that resolves with the add result
 */
export const addConversionRule = async (ruleData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true });
    }
    
    // Real API call using apiUtils
    const response = await post('/admin/tokens/conversion-rules', ruleData);
    return response;
  } catch (error) {
    console.error('Error in addConversionRule:', error);
    throw error;
  }
};

/**
 * Remove conversion rule
 * 
 * @param {string} ruleId - Rule ID
 * @returns {Promise} Promise that resolves with the remove result
 */
export const removeConversionRule = async (ruleId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true });
    }
    
    // Real API call using apiUtils
    const response = await del(`/admin/tokens/conversion-rules/${ruleId}`);
    return response;
  } catch (error) {
    console.error(`Error in removeConversionRule for rule ${ruleId}:`, error);
    throw error;
  }
};

// Export all admin token service functions
const adminTokenService = {
  getProviderTokenBalances,
  getProviderTokenHistory,
  mintTokens,
  burnTokens,
  approveBonus,
  getTokenCatalog,
  addCatalogItem,
  removeCatalogItem,
  getTokenConversionRules,
  addConversionRule,
  removeConversionRule
};

export default adminTokenService;
