import { get, post, put, del } from '../utils/apiUtils';

/**
 * Get system status information
 * @returns {Promise} Promise with system status data
 */
export const getSystemStatus = async () => {
  try {
    const response = await get('/admin/system-status');
    return response;
  } catch (error) {
    console.error('Error in getSystemStatus:', error);
    throw error;
  }
};

/**
 * Get all admin settings
 * @returns {Promise} Promise with all settings
 */
export const getAllSettings = async () => {
  try {
    const response = await get('/admin/settings');
    return response;
  } catch (error) {
    console.error('Error in getAllSettings:', error);
    throw error;
  }
};

/**
 * Get settings by category
 * @param {string} category - The category to fetch settings for
 * @returns {Promise} Promise with category settings
 */
export const getSettingsByCategory = async (category) => {
  try {
    const response = await get(`/admin/settings/${category}`);
    return response;
  } catch (error) {
    console.error(`Error in getSettingsByCategory for ${category}:`, error);
    throw error;
  }
};

/**
 * Get setting by key
 * @param {string} key - The setting key
 * @returns {Promise} Promise with setting data
 */
export const getSettingByKey = async (key) => {
  try {
    const response = await get(`/admin/settings/key/${key}`);
    return response;
  } catch (error) {
    console.error(`Error in getSettingByKey for key ${key}:`, error);
    throw error;
  }
};

/**
 * Create a new setting
 * @param {Object} settingData - The setting data
 * @returns {Promise} Promise with created setting
 */
export const createSetting = async (settingData) => {
  try {
    const response = await post('/admin/settings', settingData);
    return response;
  } catch (error) {
    console.error('Error in createSetting:', error);
    throw error;
  }
};

/**
 * Update a setting
 * @param {string} key - The setting key
 * @param {Object} settingData - The updated setting data
 * @returns {Promise} Promise with updated setting
 */
export const updateSetting = async (key, settingData) => {
  try {
    const response = await put(`/admin/settings/${key}`, settingData);
    return response;
  } catch (error) {
    console.error(`Error in updateSetting for key ${key}:`, error);
    throw error;
  }
};

/**
 * Delete a setting
 * @param {string} key - The setting key to delete
 * @returns {Promise} Promise with deletion result
 */
export const deleteSetting = async (key) => {
  try {
    const response = await del(`/admin/settings/${key}`);
    return response;
  } catch (error) {
    console.error(`Error in deleteSetting for key ${key}:`, error);
    throw error;
  }
};

/**
 * Initialize default settings
 * @param {boolean} reset - Whether to reset existing settings
 * @returns {Promise} Promise with initialized settings
 */
export const initializeSettings = async (reset = false) => {
  try {
    const response = await post('/admin/initialize', { reset });
    return response;
  } catch (error) {
    console.error('Error in initializeSettings:', error);
    throw error;
  }
};

/**
 * Get all users
 * @returns {Promise} Promise with all users
 */
export const getAllUsers = async () => {
  try {
    const response = await get('/admin/users');
    return response;
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
};

/**
 * Update a user
 * @param {string} userId - The user ID
 * @param {Object} userData - The updated user data
 * @returns {Promise} Promise with updated user
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await put(`/admin/users/${userId}`, userData);
    return response;
  } catch (error) {
    console.error(`Error in updateUser for user ${userId}:`, error);
    throw error;
  }
};

const adminService = {
  getSystemStatus,
  getAllSettings,
  getSettingsByCategory,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  initializeSettings,
  getAllUsers,
  updateUser
};

export default adminService;
