/**
 * Analytics Service
 * 
 * This service handles analytics-related API calls
 */

import { get, post, mockResponse } from '../utils/apiUtils';
import { 
  generateAnalytics, 
  mockNaturalLanguageSummaries,
  mockPatientRiskAnalytics,
  mockReferralAnalytics,
  mockTokenAnalytics,
  mockPredictiveAlerts,
  mockProviderBenchmarkingData
} from './mockData';

/**
 * Get all analytics reports
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Page size
 * @param {string} options.type - Filter by report type
 * @param {string} options.status - Filter by status
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order (asc, desc)
 * @returns {Promise} Promise that resolves with the analytics reports list
 */
export const getAnalyticsReports = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      page: 0,
      limit: 10,
      type: '',
      status: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock analytics reports
      const mockReports = generateAnalytics(20);
      
      // Filter by type
      let filteredReports = mockReports;
      if (queryOptions.type) {
        filteredReports = mockReports.filter(
          report => report.type === queryOptions.type
        );
      }
      
      // Filter by status
      if (queryOptions.status) {
        filteredReports = filteredReports.filter(
          report => report.status === queryOptions.status
        );
      }
      
      // Sort reports
      filteredReports.sort((a, b) => {
        const field = queryOptions.sortBy;
        const order = queryOptions.sortOrder === 'asc' ? 1 : -1;
        
        if (a[field] < b[field]) return -1 * order;
        if (a[field] > b[field]) return 1 * order;
        return 0;
      });
      
      // Paginate reports
      const startIndex = queryOptions.page * queryOptions.limit;
      const endIndex = startIndex + queryOptions.limit;
      const paginatedReports = filteredReports.slice(startIndex, endIndex);
      
      // Create response
      const mockResponsObj = {
        reports: paginatedReports,
        pagination: {
          total: filteredReports.length,
          page: queryOptions.page,
          limit: queryOptions.limit,
          pages: Math.ceil(filteredReports.length / queryOptions.limit)
        }
      };
      
      return await mockResponse(mockResponsObj, 800);
    }
    
    // Real API call
    return await get('/analytics/reports', queryOptions);
  } catch (error) {
    console.error('Get analytics reports error:', error);
    throw error;
  }
};

/**
 * Get an analytics report by ID
 * 
 * @param {string} reportId - Report ID
 * @returns {Promise} Promise that resolves with the report data
 */
export const getAnalyticsReportById = async (reportId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock analytics reports
      const mockReports = generateAnalytics(20);
      
      // Find the report
      const report = mockReports.find(r => r.id === reportId) || mockReports[0];
      report.id = reportId;
      
      return await mockResponse(report);
    }
    
    // Real API call
    return await get(`/api/analytics/reports/${reportId}`);
  } catch (error) {
    console.error('Get analytics report by ID error:', error);
    throw error;
  }
};

/**
 * Create a new analytics report
 * 
 * @param {Object} reportData - Report data
 * @returns {Promise} Promise that resolves with the created report
 */
export const createAnalyticsReport = async (reportData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock report
      const mockReport = {
        ...reportData,
        id: Math.random().toString(36).substring(2, 15),
        status: 'processing',
        createdAt: new Date().toISOString()
      };
      
      return await mockResponse(mockReport, 1500);
    }
    
    // Real API call
    return await post('/analytics/reports', reportData);
  } catch (error) {
    console.error('Create analytics report error:', error);
    throw error;
  }
};

/**
 * Get patient risk analytics
 * 
 * @param {Object} options - Query options
 * @param {string} options.dateRange - Date range (e.g., '7d', '30d', '90d', 'custom')
 * @param {string} options.startDate - Start date (for custom date range)
 * @param {string} options.endDate - End date (for custom date range)
 * @param {Array} options.departments - Departments to include
 * @returns {Promise} Promise that resolves with the patient risk analytics
 */
export const getPatientRiskAnalytics = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      dateRange: '30d',
      startDate: '',
      endDate: '',
      departments: []
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock patient risk analytics from mockData.js
      const mockAnalytics = { ...mockPatientRiskAnalytics };
      
      // Generate dynamic data for trends
      mockAnalytics.trends.labels = generateTrendLabels(queryOptions);
      mockAnalytics.trends.datasets = mockAnalytics.trends.datasets.map(dataset => {
        let min = 150;
        let max = 200;
        
        if (dataset.label === 'Medium Risk') {
          min = 400;
          max = 450;
        } else if (dataset.label === 'Low Risk') {
          min = 600;
          max = 650;
        }
        
        return {
          ...dataset,
          data: generateRandomTrendData(queryOptions, min, max)
        };
      });
      
      return await mockResponse(mockAnalytics, 1200);
    }
    
    // Real API call
    return await get('/analytics/patient-risk', queryOptions);
  } catch (error) {
    console.error('Get patient risk analytics error:', error);
    throw error;
  }
};

/**
 * Get referral analytics
 * 
 * @param {Object} options - Query options
 * @param {string} options.dateRange - Date range (e.g., '7d', '30d', '90d', 'custom')
 * @param {string} options.startDate - Start date (for custom date range)
 * @param {string} options.endDate - End date (for custom date range)
 * @param {Array} options.specialties - Specialties to include
 * @returns {Promise} Promise that resolves with the referral analytics
 */
export const getReferralAnalytics = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      dateRange: '30d',
      startDate: '',
      endDate: '',
      specialties: []
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock referral analytics from mockData.js
      const mockAnalytics = { ...mockReferralAnalytics };
      
      // Generate dynamic data for trends
      mockAnalytics.trends.labels = generateTrendLabels(queryOptions);
      mockAnalytics.trends.datasets = mockAnalytics.trends.datasets.map(dataset => {
        return {
          ...dataset,
          data: generateRandomTrendData(queryOptions, 20, 40)
        };
      });
      
      return await mockResponse(mockAnalytics, 1200);
    }
    
    // Real API call
    return await get('/analytics/referrals', queryOptions);
  } catch (error) {
    console.error('Get referral analytics error:', error);
    throw error;
  }
};

/**
 * Get token analytics
 * 
 * @param {Object} options - Query options
 * @param {string} options.dateRange - Date range (e.g., '7d', '30d', '90d', 'custom')
 * @param {string} options.startDate - Start date (for custom date range)
 * @param {string} options.endDate - End date (for custom date range)
 * @returns {Promise} Promise that resolves with the token analytics
 */
export const getTokenAnalytics = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      dateRange: '30d',
      startDate: '',
      endDate: ''
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock token analytics from mockData.js
      const mockAnalytics = { ...mockTokenAnalytics };
      
      // Generate dynamic data for trends
      mockAnalytics.trends.labels = generateTrendLabels(queryOptions);
      mockAnalytics.trends.datasets = mockAnalytics.trends.datasets.map(dataset => {
        let min = 1000;
        let max = 2000;
        
        if (dataset.label === 'Tokens Spent') {
          min = 800;
          max = 1500;
        }
        
        return {
          ...dataset,
          data: generateRandomTrendData(queryOptions, min, max)
        };
      });
      
      return await mockResponse(mockAnalytics, 1200);
    }
    
    // Real API call
    return await get('/analytics/tokens', queryOptions);
  } catch (error) {
    console.error('Get token analytics error:', error);
    throw error;
  }
};

/**
 * Generate trend labels based on date range
 * 
 * @param {Object} options - Date range options
 * @returns {Array} Array of labels
 */
const generateTrendLabels = (options) => {
  const { dateRange } = options;
  const labels = [];
  
  switch (dateRange) {
    case '7d':
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      break;
    case '30d':
      // Last 30 days (weekly)
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      break;
    case '90d':
      // Last 90 days (monthly)
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      }
      break;
    case 'custom':
      // Custom date range (monthly)
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();
      
      for (let i = 0; i <= months; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      }
      break;
    default:
      // Default to last 30 days (weekly)
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
  }
  
  return labels;
};

/**
 * Generate random trend data
 * 
 * @param {Object} options - Date range options
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Array} Array of random data
 */
const generateRandomTrendData = (options, min, max) => {
  const { dateRange } = options;
  let count;
  
  switch (dateRange) {
    case '7d':
      count = 7;
      break;
    case '30d':
      count = 5;
      break;
    case '90d':
      count = 4;
      break;
    case 'custom':
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      count = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth() + 1;
      break;
    default:
      count = 5;
  }
  
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

/**
 * Get predictive alerts
 * 
 * @param {Object} options - Query options
 * @param {string} options.timeframe - Timeframe (e.g., 'day', 'week', 'month')
 * @param {string} options.type - Alert type (e.g., 'readmission', 'trend', 'all')
 * @returns {Promise} Promise that resolves with the predictive alerts
 */
export const getPredictiveAlerts = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      timeframe: 'week',
      type: 'all'
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock predictive alerts from mockData.js
      const mockAlerts = [...mockPredictiveAlerts];
      
      // Update creation timestamps to be current
      mockAlerts.forEach(alert => {
        alert.createdAt = new Date().toISOString();
      });
      
      // Filter by type if specified
      let filteredAlerts = mockAlerts;
      if (queryOptions.type !== 'all') {
        filteredAlerts = mockAlerts.filter(alert => alert.type === queryOptions.type);
      }
      
      // Filter by timeframe if needed
      // This would be more sophisticated in a real implementation
      
      return await mockResponse(filteredAlerts, 800);
    }
    
    // Real API call
    return await get('/analytics/predictive-alerts', queryOptions);
  } catch (error) {
    console.error('Get predictive alerts error:', error);
    throw error;
  }
};

/**
 * Get natural language summary
 * 
 * @param {Object} options - Query options
 * @param {string} options.timeframe - Timeframe (e.g., 'week', 'month', 'quarter')
 * @returns {Promise} Promise that resolves with the natural language summary
 */
export const getNaturalLanguageSummary = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      timeframe: 'month'
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock natural language summary from mockData.js
      const summary = mockNaturalLanguageSummaries[queryOptions.timeframe] || mockNaturalLanguageSummaries.month;
      
      return await mockResponse({ summary }, 1200);
    }
    
    // Real API call
    return await get('/analytics/natural-language-summary', queryOptions);
  } catch (error) {
    console.error('Get natural language summary error:', error);
    throw error;
  }
};

/**
 * Get provider benchmarking data
 * 
 * @param {Object} options - Query options
 * @param {string} options.timeframe - Timeframe (e.g., 'month', 'quarter', 'year')
 * @param {Array} options.metrics - Specific metrics to include
 * @returns {Promise} Promise that resolves with the provider benchmarking data
 */
export const getProviderBenchmarking = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      timeframe: 'month',
      metrics: []
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Use mock provider benchmarking data from mockData.js
      const mockBenchmarkingData = [...mockProviderBenchmarkingData];
      
      // Filter metrics if specified
      let filteredMetrics = mockBenchmarkingData;
      if (queryOptions.metrics && queryOptions.metrics.length > 0) {
        filteredMetrics = mockBenchmarkingData.filter(metric => 
          queryOptions.metrics.includes(metric.id) || queryOptions.metrics.includes(metric.name)
        );
      }
      
      return await mockResponse(filteredMetrics, 1000);
    }
    
    // Real API call
    return await get('/analytics/provider-benchmarking', queryOptions);
  } catch (error) {
    console.error('Get provider benchmarking error:', error);
    throw error;
  }
};

// Export all analytics service functions
const analyticsService = {
  getAnalyticsReports,
  getAnalyticsReportById,
  createAnalyticsReport,
  getPatientRiskAnalytics,
  getReferralAnalytics,
  getTokenAnalytics,
  getPredictiveAlerts,
  getNaturalLanguageSummary,
  getProviderBenchmarking
};

export default analyticsService;
