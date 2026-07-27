/**
 * Admin Provider Service
 * 
 * This service handles API calls for admin provider management
 */

import { get, put, del } from '../utils/apiUtils';
import { adminMockData } from './mockData';

/**
 * Get all providers
 * 
 * @returns {Promise} Promise that resolves with providers data
 */
export const getAllProviders = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock data
      console.log(adminMockData.providers)
      return { success: true, data: adminMockData.providers };
    }
    
    // Make API call using apiUtils
    return await get('/admin/providers');
  } catch (error) {
    console.error('Error fetching providers:', error);
    return { success: false, error: error.message || 'Failed to fetch providers' };
  }
};

/**
 * Get provider by ID
 * 
 * @param {string} providerId - Provider ID
 * @returns {Promise} Promise that resolves with provider data
 */
export const getProviderById = async (providerId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Find provider in mock data
      const provider = adminMockData.providers.find(p => p.id === providerId);
      
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }
      
      return { success: true, data: provider };
    }
    
    // Make API call using apiUtils
    return await get(`/admin/providers/${providerId}`);
  } catch (error) {
    console.error(`Error fetching provider ${providerId}:`, error);
    return { success: false, error: error.message || 'Failed to fetch provider' };
  }
};

/**
 * Update provider
 * 
 * @param {string} providerId - Provider ID
 * @param {Object} providerData - Provider data to update
 * @returns {Promise} Promise that resolves with updated provider data
 */
export const updateProvider = async (providerId, providerData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Find provider index in mock data
      const providerIndex = adminMockData.providers.findIndex(p => p.id === providerId);
      
      if (providerIndex === -1) {
        return { success: false, error: 'Provider not found' };
      }
      
      // Update provider in mock data
      const updatedProvider = {
        ...adminMockData.providers[providerIndex],
        ...providerData,
        lastUpdated: new Date().toISOString()
      };
      
      // Return updated provider
      return { success: true, data: updatedProvider };
    }
    
    // Make API call using apiUtils
    return await put(`/admin/providers/${providerId}`, providerData);
  } catch (error) {
    console.error(`Error updating provider ${providerId}:`, error);
    return { success: false, error: error.message || 'Failed to update provider' };
  }
};

/**
 * Approve provider
 * 
 * @param {string} providerId - Provider ID
 * @returns {Promise} Promise that resolves with approved provider data
 */
export const approveProvider = async (providerId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Find provider index in mock data
      const providerIndex = adminMockData.providers.findIndex(p => p.id === providerId);
      
      if (providerIndex === -1) {
        return { success: false, error: 'Provider not found' };
      }
      
      // Update provider status in mock data
      const updatedProvider = {
        ...adminMockData.providers[providerIndex],
        status: 'active',
        approvedAt: new Date().toISOString()
      };
      
      // Return updated provider
      return { success: true, data: updatedProvider };
    }
    
    // Make API call using apiUtils
    return await put(`/admin/providers/${providerId}/approve`, {});
  } catch (error) {
    console.error(`Error approving provider ${providerId}:`, error);
    return { success: false, error: error.message || 'Failed to approve provider' };
  }
};

/**
 * Reject provider
 * 
 * @param {string} providerId - Provider ID
 * @param {string} reason - Rejection reason
 * @returns {Promise} Promise that resolves with rejected provider data
 */
export const rejectProvider = async (providerId, reason) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Find provider index in mock data
      const providerIndex = adminMockData.providers.findIndex(p => p.id === providerId);
      
      if (providerIndex === -1) {
        return { success: false, error: 'Provider not found' };
      }
      
      // Update provider status in mock data
      const updatedProvider = {
        ...adminMockData.providers[providerIndex],
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date().toISOString()
      };
      
      // Return updated provider
      return { success: true, data: updatedProvider };
    }
    
    // Make API call using apiUtils
    return await put(`/admin/providers/${providerId}/reject`, { reason });
  } catch (error) {
    console.error(`Error rejecting provider ${providerId}:`, error);
    return { success: false, error: error.message || 'Failed to reject provider' };
  }
};

/**
 * Suspend provider
 * 
 * @param {string} providerId - Provider ID
 * @param {string} reason - Suspension reason
 * @returns {Promise} Promise that resolves with suspended provider data
 */
export const suspendProvider = async (providerId, reason) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Find provider index in mock data
      const providerIndex = adminMockData.providers.findIndex(p => p.id === providerId);
      
      if (providerIndex === -1) {
        return { success: false, error: 'Provider not found' };
      }
      
      // Update provider status in mock data
      const updatedProvider = {
        ...adminMockData.providers[providerIndex],
        status: 'suspended',
        suspensionReason: reason,
        suspendedAt: new Date().toISOString()
      };
      
      // Return updated provider
      return { success: true, data: updatedProvider };
    }
    
    // Make API call using apiUtils
    return await put(`/admin/providers/${providerId}/suspend`, { reason });
  } catch (error) {
    console.error(`Error suspending provider ${providerId}:`, error);
    return { success: false, error: error.message || 'Failed to suspend provider' };
  }
};

/**
 * Reactivate provider
 * 
 * @param {string} providerId - Provider ID
 * @returns {Promise} Promise that resolves with reactivated provider data
 */
export const reactivateProvider = async (providerId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Find provider index in mock data
      const providerIndex = adminMockData.providers.findIndex(p => p.id === providerId);
      
      if (providerIndex === -1) {
        return { success: false, error: 'Provider not found' };
      }
      
      // Update provider status in mock data
      const updatedProvider = {
        ...adminMockData.providers[providerIndex],
        status: 'active',
        reactivatedAt: new Date().toISOString()
      };
      
      // Return updated provider
      return { success: true, data: updatedProvider };
    }
    
    // Make API call using apiUtils
    return await put(`/admin/providers/${providerId}/activate`, {});
  } catch (error) {
    console.error(`Error reactivating provider ${providerId}:`, error);
    return { success: false, error: error.message || 'Failed to reactivate provider' };
  }
};

/**
 * Delete provider
 * 
 * @param {string} providerId - Provider ID
 * @returns {Promise} Promise that resolves with success message
 */
export const deleteProvider = async (providerId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Find provider index in mock data
      const providerIndex = adminMockData.providers.findIndex(p => p.id === providerId);
      
      if (providerIndex === -1) {
        return { success: false, error: 'Provider not found' };
      }
      
      // Return success message
      return { 
        success: true, 
        message: `Provider ${providerId} deleted successfully` 
      };
    }
    
    // Make API call using apiUtils
    return await del(`/admin/providers/${providerId}`);
  } catch (error) {
    console.error(`Error deleting provider ${providerId}:`, error);
    return { success: false, error: error.message || 'Failed to delete provider' };
  }
};

/**
 * Get provider statistics
 * 
 * @returns {Promise} Promise that resolves with provider statistics
 */
export const getProviderStatistics = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock statistics
      const providers = adminMockData.providers;
      
      const statistics = {
        total: providers.length,
        active: providers.filter(p => p.status === 'active').length,
        pending: providers.filter(p => p.status === 'pending').length,
        suspended: providers.filter(p => p.status === 'suspended').length,
        rejected: providers.filter(p => p.status === 'rejected').length,
        bySpecialty: {
          Cardiology: providers.filter(p => p.specialty === 'Cardiology').length,
          Neurology: providers.filter(p => p.specialty === 'Neurology').length,
          Dermatology: providers.filter(p => p.specialty === 'Dermatology').length,
          Pediatrics: providers.filter(p => p.specialty === 'Pediatrics').length,
          Oncology: providers.filter(p => p.specialty === 'Oncology').length,
          Other: providers.filter(p => !['Cardiology', 'Neurology', 'Dermatology', 'Pediatrics', 'Oncology'].includes(p.specialty)).length
        }
      };
      
      return { success: true, data: statistics };
    }
    
    // Make API call using apiUtils
    return await get('/admin/providers/statistics');
  } catch (error) {
    console.error('Error fetching provider statistics:', error);
    return { success: false, error: error.message || 'Failed to fetch provider statistics' };
  }
};

const adminProviderService = {
  getAllProviders,
  getProviderById,
  updateProvider,
  approveProvider,
  rejectProvider,
  suspendProvider,
  reactivateProvider,
  deleteProvider,
  getProviderStatistics
};

export default adminProviderService;
