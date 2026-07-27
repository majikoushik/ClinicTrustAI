/**
 * Referral Service
 * 
 * This service handles referral-related API calls
 */

import { get, post, put, del, mockResponse } from '../utils/apiUtils';
import { generateReferrals } from './mockData';

/**
 * Get all referrals
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Page size
 * @param {string} options.search - Search term
 * @param {string} options.status - Filter by status
 * @param {string} options.priority - Filter by priority
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order (asc, desc)
 * @param {string} options.direction - Filter by direction (sent, received)
 * @returns {Promise} Promise that resolves with the referrals list
 */
export const getReferrals = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      page: 0,
      limit: 10,
      search: '',
      status: '',
      priority: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      direction: ''
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };

    console.log('Referral service getReferrals called with options:', queryOptions);
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock referrals
      const mockReferrals = generateReferrals(30);
      // Filter by search term
      let filteredReferrals = mockReferrals;
      if (queryOptions.search) {
        const searchTerm = queryOptions.search.toLowerCase();
        filteredReferrals = mockReferrals.filter(referral => 
          referral.patient.firstName.toLowerCase().includes(searchTerm) ||
          referral.patient.lastName.toLowerCase().includes(searchTerm) ||
          referral.referringDoctor.firstName.toLowerCase().includes(searchTerm) ||
          referral.referringDoctor.lastName.toLowerCase().includes(searchTerm) ||
          referral.receivingDoctor.firstName.toLowerCase().includes(searchTerm) ||
          referral.receivingDoctor.lastName.toLowerCase().includes(searchTerm) ||
          referral.specialty.toLowerCase().includes(searchTerm)
        );
      }
      
      // Filter by status
      if (queryOptions.status && queryOptions.status !== 'all') {
        filteredReferrals = filteredReferrals.filter(
          referral => referral.status === queryOptions.status
        );
      }
      
      // Filter by priority
      if (queryOptions.priority && queryOptions.priority !== 'all') {
        filteredReferrals = filteredReferrals.filter(
          referral => referral.priority === queryOptions.priority
        );
      }
      
      // Filter by direction
      if (queryOptions.direction) {
        // In a real app, we would filter based on the current user's ID
        // For mock data, we'll just split the referrals
        if (queryOptions.direction === 'sent') {
          filteredReferrals = filteredReferrals.filter((_, index) => index % 2 === 0);
        } else if (queryOptions.direction === 'received') {
          filteredReferrals = filteredReferrals.filter((_, index) => index % 2 === 1);
        }
      }
      
      // Sort referrals
      filteredReferrals.sort((a, b) => {
        const field = queryOptions.sortBy;
        const order = queryOptions.sortOrder === 'asc' ? 1 : -1;
        
        if (a[field] < b[field]) return -1 * order;
        if (a[field] > b[field]) return 1 * order;
        return 0;
      });
      
      // Paginate referrals
      const paginatedReferrals = filteredReferrals;
      
      // Create response
      const mockResponseObj = {
        referrals: paginatedReferrals,
        pagination: {
          total: filteredReferrals.length,
          page: queryOptions.page,
          limit: queryOptions.limit,
          pages: Math.ceil(filteredReferrals.length / queryOptions.limit)
        }
      };
      console.log('Generated mock referrals:', paginatedReferrals.length, 'of', filteredReferrals.length, 'total');
      
      return mockResponseObj;
    }
    
    // Real API call
    return await get('/referrals', queryOptions);
  } catch (error) {
    console.error('Get referrals error:', error);
    throw error;
  }
};

/**
 * Get a referral by ID
 * 
 * @param {string} referralId - Referral ID
 * @returns {Promise} Promise that resolves with the referral data
 */
export const getReferralById = async (referralId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock referrals
      const mockReferrals = generateReferrals(30);
      
      // Find the referral
      const referral = mockReferrals.find(r => r.id === referralId) || mockReferrals[0];
      referral.id = referralId;
      
      return referral;
    }
    
    // Real API call
    return await get(`/referrals/${referralId}`);
  } catch (error) {
    console.error('Get referral by ID error:', error);
    throw error;
  }
};

/**
 * Create a new referral
 * 
 * @param {Object} referralData - Referral data
 * @returns {Promise} Promise that resolves with the created referral
 */
export const createReferral = async (referralData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock referral
      const mockReferral = {
        ...referralData,
        id: Math.random().toString(36).substring(2, 15),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blockchainId: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      };
      
      return await mockResponse(mockReferral, 1500);
    }
    
    // Real API call
    return await post('/referrals', referralData);
  } catch (error) {
    console.error('Create referral error:', error);
    throw error;
  }
};

/**
 * Update a referral
 * 
 * @param {string} referralId - Referral ID
 * @param {Object} referralData - Updated referral data
 * @returns {Promise} Promise that resolves with the updated referral
 */
export const updateReferral = async (referralId, referralData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock updated referral
      const mockReferral = {
        ...referralData,
        id: referralId,
        updatedAt: new Date().toISOString()
      };
      
      return await mockResponse(mockReferral, 1000);
    }
    
    // Real API call
    return await put(`/referrals/${referralId}`, referralData);
  } catch (error) {
    console.error('Update referral error:', error);
    throw error;
  }
};

/**
 * Delete a referral
 * 
 * @param {string} referralId - Referral ID
 * @returns {Promise} Promise that resolves when the referral is deleted
 */
export const deleteReferral = async (referralId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true }, 1000);
    }
    
    // Real API call
    return await del(`/referrals/${referralId}`);
  } catch (error) {
    console.error('Delete referral error:', error);
    throw error;
  }
};

/**
 * Accept a referral
 * 
 * @param {string} referralId - Referral ID
 * @param {Object} data - Additional data
 * @returns {Promise} Promise that resolves with the updated referral
 */
export const acceptReferral = async (referralId, data = {}) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock accepted referral
      const mockReferral = {
        id: referralId,
        status: 'accepted',
        updatedAt: new Date().toISOString(),
        ...data
      };
      
      return await mockResponse(mockReferral, 1000);
    }
    
    // Real API call — server only exposes a single status-transition endpoint
    return await put(`/referrals/${referralId}/status`, { status: 'accepted', ...data });
  } catch (error) {
    console.error('Accept referral error:', error);
    throw error;
  }
};

/**
 * Reject a referral
 * 
 * @param {string} referralId - Referral ID
 * @param {Object} data - Additional data
 * @returns {Promise} Promise that resolves with the updated referral
 */
export const rejectReferral = async (referralId, data = {}) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock rejected referral
      const mockReferral = {
        id: referralId,
        status: 'rejected',
        updatedAt: new Date().toISOString(),
        ...data
      };
      
      return await mockResponse(mockReferral, 1000);
    }
    
    // Real API call — server only exposes a single status-transition endpoint
    return await put(`/referrals/${referralId}/status`, { status: 'rejected', ...data });
  } catch (error) {
    console.error('Reject referral error:', error);
    throw error;
  }
};

/**
 * Complete a referral
 * 
 * @param {string} referralId - Referral ID
 * @param {Object} data - Additional data
 * @returns {Promise} Promise that resolves with the updated referral
 */
export const completeReferral = async (referralId, data = {}) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock completed referral
      const mockReferral = {
        id: referralId,
        status: 'completed',
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        ...data
      };
      
      return await mockResponse(mockReferral, 1000);
    }
    
    // Real API call — server only exposes a single status-transition endpoint
    return await put(`/referrals/${referralId}/status`, { status: 'completed', ...data });
  } catch (error) {
    console.error('Complete referral error:', error);
    throw error;
  }
};

/**
 * Cancel a referral
 * 
 * @param {string} referralId - Referral ID
 * @param {Object} data - Additional data
 * @returns {Promise} Promise that resolves with the updated referral
 */
export const cancelReferral = async (referralId, data = {}) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock cancelled referral
      const mockReferral = {
        id: referralId,
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
        ...data
      };
      
      return await mockResponse(mockReferral, 1000);
    }
    
    // Real API call — server only exposes a single status-transition endpoint
    return await put(`/referrals/${referralId}/status`, { status: 'cancelled', ...data });
  } catch (error) {
    console.error('Cancel referral error:', error);
    throw error;
  }
};

/**
 * Upload an attachment to a referral
 * 
 * @param {string} referralId - Referral ID
 * @param {File} file - File to upload
 * @returns {Promise} Promise that resolves with the uploaded attachment
 */
export const uploadReferralAttachment = async (referralId, file) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock attachment
      const mockAttachment = {
        id: Math.random().toString(36).substring(2, 15),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString()
      };
      
      return await mockResponse(mockAttachment, 2000);
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Real API call
    return await post(`/referrals/${referralId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  } catch (error) {
    console.error('Upload referral attachment error:', error);
    throw error;
  }
};

/**
 * Delete a referral attachment
 * 
 * @param {string} referralId - Referral ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise} Promise that resolves when the attachment is deleted
 */
export const deleteReferralAttachment = async (referralId, attachmentId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true }, 1000);
    }
    
    // Real API call
    return await del(`/referrals/${referralId}/attachments/${attachmentId}`);
  } catch (error) {
    console.error('Delete referral attachment error:', error);
    throw error;
  }
};

/**
 * Get patients list
 * 
 * @returns {Promise} Promise that resolves with the patients list
 */
export const getPatients = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock patients
      const mockPatients = Array.from({ length: 15 }, (_, i) => ({
        id: `p-${i + 1}`,
        name: `Patient ${i + 1}`,
        patientId: `PT-${100000 + i}`,
        dateOfBirth: new Date(
          1950 + Math.floor(Math.random() * 50),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ).toISOString(),
        gender: i % 3 === 0 ? 'female' : (i % 3 === 1 ? 'male' : 'other')
      }));
      
      return await mockResponse(mockPatients, 1000);
    }
    
    // Real API call
    return await get('/patients');
  } catch (error) {
    console.error('Get patients error:', error);
    throw error;
  }
};

/**
 * Get providers list
 * 
 * @returns {Promise} Promise that resolves with the providers list
 */
export const getProviders = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock providers
      const mockProviders = [
        {
          id: 'prov-1',
          name: 'Dr. Robert Chen',
          organization: 'City Medical Center',
          specialty: 'Cardiology'
        },
        {
          id: 'prov-2',
          name: 'Dr. Sarah Miller',
          organization: 'Advanced Diagnostics',
          specialty: 'Radiology'
        },
        {
          id: 'prov-3',
          name: 'Dr. James Wilson',
          organization: 'Specialized Care Clinic',
          specialty: 'Orthopedics'
        },
        {
          id: 'prov-4',
          name: 'Dr. Emily Taylor',
          organization: 'Community Health Partners',
          specialty: 'Neurology'
        },
        {
          id: 'prov-5',
          name: 'Dr. Michael Brown',
          organization: 'Premier Medical Group',
          specialty: 'Endocrinology'
        }
      ];
      
      return await mockResponse(mockProviders, 1000);
    }
    
    // Real API call
    return await get('/providers');
  } catch (error) {
    console.error('Get providers error:', error);
    throw error;
  }
};

/**
 * Get patient records
 * 
 * @param {string} patientId - Patient ID
 * @returns {Promise} Promise that resolves with the patient records
 */
export const getPatientRecords = async (patientId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock patient records
      const recordTypes = [
        'Lab Results',
        'Imaging',
        'Consultation Notes',
        'Medication List',
        'Allergy Information',
        'Vaccination Records',
        'Medical History',
        'Surgical History'
      ];
      
      const descriptions = [
        'Annual physical results',
        'Chest X-ray',
        'Cardiology consultation',
        'Current medications',
        'Food and drug allergies',
        'COVID-19 vaccination',
        'Chronic conditions summary',
        'Appendectomy report'
      ];
      
      const mockRecords = Array.from({ length: 8 }, (_, i) => ({
        id: `rec-${patientId}-${i + 1}`,
        patientId: patientId,
        recordType: recordTypes[i],
        description: descriptions[i],
        date: new Date(
          2022,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ).toISOString()
      }));
      
      return await mockResponse(mockRecords, 1000);
    }
    
    // Real API call
    return await get(`/patients/${patientId}/records`);
  } catch (error) {
    console.error('Get patient records error:', error);
    throw error;
  }
};

/**
 * Get counts of referrals by status
 * 
 * @returns {Promise} Promise that resolves with counts for each status
 */
export const getReferralStatusCounts = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock referrals to count
      const mockReferrals = generateReferrals(30);
      
      // Count referrals by status
      const counts = {
        all: mockReferrals.length,
        pending: mockReferrals.filter(r => r.status === 'pending').length,
        accepted: mockReferrals.filter(r => r.status === 'accepted').length,
        completed: mockReferrals.filter(r => r.status === 'completed').length,
        rejected: mockReferrals.filter(r => r.status === 'rejected').length,
        cancelled: mockReferrals.filter(r => r.status === 'cancelled').length
      };
      
      return await mockResponse(counts, 300);
    }
    
    // Real API call — unwrap the nested data object
    const response = await get('/referrals/status-counts');
    return response.data || response;
  } catch (error) {
    console.error('Get referral status counts error:', error);
    // Return empty counts to prevent UI issues
    return {
      all: 0,
      pending: 0,
      accepted: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0
    };
  }
};

// Export all referral service functions
const referralService = {
  getReferrals,
  getReferralById,
  createReferral,
  updateReferral,
  deleteReferral,
  acceptReferral,
  rejectReferral,
  completeReferral,
  cancelReferral,
  uploadReferralAttachment,
  deleteReferralAttachment,
  getReferralStatusCounts,
  getPatients,
  getProviders,
  getPatientRecords
};

export default referralService;
