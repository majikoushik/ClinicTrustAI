/**
 * Notification Service
 * 
 * This service handles notification-related API calls
 */

import { get, put, del, mockResponse } from '../utils/apiUtils';

/**
 * Get the current user's notifications
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Page size
 * @param {string} options.type - Notification type
 * @param {boolean} options.unreadOnly - Get only unread notifications
 * @returns {Promise} Promise that resolves with the notifications list
 */
export const getNotifications = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      page: 0,
      limit: 10,
      type: '',
      unreadOnly: false
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Mock notifications
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'referral',
          title: 'New referral received',
          message: 'You have received a new referral from Dr. Johnson for Patient Smith',
          createdAt: new Date(2023, 7, 15, 9, 30).toISOString(),
          isRead: false,
          priority: 'high',
          actionUrl: '/referrals/ref-123'
        },
        {
          id: 'notif-2',
          type: 'analytics',
          title: 'Analytics report completed',
          message: 'Your requested analytics report for Q3 is now available',
          createdAt: new Date(2023, 7, 14, 15, 45).toISOString(),
          isRead: true,
          priority: 'medium',
          actionUrl: '/analytics/reports/q3-2023'
        },
        {
          id: 'notif-3',
          type: 'token',
          title: '15 tokens received',
          message: 'You have received 15 tokens for completing a patient referral',
          createdAt: new Date(2023, 7, 14, 10, 15).toISOString(),
          isRead: false,
          priority: 'low',
          actionUrl: '/tokens'
        },
        {
          id: 'notif-4',
          type: 'alert',
          title: 'High-risk patient alert',
          message: 'Patient Jones has been flagged as high-risk for readmission',
          createdAt: new Date(2023, 7, 13, 8, 0).toISOString(),
          isRead: false,
          priority: 'critical',
          actionUrl: '/patients/p-456'
        },
        {
          id: 'notif-5',
          type: 'system',
          title: 'System maintenance scheduled',
          message: 'The system will be down for maintenance on Sunday from 2-4 AM',
          createdAt: new Date(2023, 7, 12, 14, 30).toISOString(),
          isRead: true,
          priority: 'medium',
          actionUrl: null
        },
        {
          id: 'notif-6',
          type: 'referral',
          title: 'Referral status updated',
          message: 'Your referral for Patient Brown has been accepted',
          createdAt: new Date(2023, 7, 11, 11, 20).toISOString(),
          isRead: true,
          priority: 'medium',
          actionUrl: '/referrals/ref-789'
        },
        {
          id: 'notif-7',
          type: 'token',
          title: 'Token bonus awarded',
          message: 'You have received a 50 token bonus for your performance this month',
          createdAt: new Date(2023, 7, 10, 9, 0).toISOString(),
          isRead: false,
          priority: 'medium',
          actionUrl: '/tokens'
        },
        {
          id: 'notif-8',
          type: 'alert',
          title: 'New AI insight available',
          message: 'AI has detected a potential pattern in your patient data',
          createdAt: new Date(2023, 7, 9, 16, 45).toISOString(),
          isRead: true,
          priority: 'high',
          actionUrl: '/analytics/insights/ai-123'
        }
      ];
      
      // Filter by type
      let filteredNotifications = [...mockNotifications];
      if (queryOptions.type) {
        filteredNotifications = filteredNotifications.filter(
          notification => notification.type === queryOptions.type
        );
      }
      
      // Filter by read status
      if (queryOptions.unreadOnly) {
        filteredNotifications = filteredNotifications.filter(
          notification => !notification.isRead
        );
      }
      
      // Sort by date (newest first)
      filteredNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Paginate
      const startIndex = queryOptions.page * queryOptions.limit;
      const endIndex = startIndex + queryOptions.limit;
      const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
      
      // Calculate total pages
      const totalPages = Math.ceil(filteredNotifications.length / queryOptions.limit);
      
      // Get unread count
      const unreadCount = mockNotifications.filter(notification => !notification.isRead).length;
      
      // Create response
      const response = {
        notifications: paginatedNotifications,
        pagination: {
          page: queryOptions.page,
          limit: queryOptions.limit,
          total: filteredNotifications.length,
          pages: totalPages
        },
        unreadCount
      };
      
      return await mockResponse(response, 500);
    }
    
    // Real API call
    return await get('/notifications', queryOptions);
  } catch (error) {
    console.error('Get notifications error:', error);
    throw error;
  }
};

/**
 * Get the unread notification count
 * 
 * @returns {Promise} Promise that resolves with the unread count
 */
export const getUnreadCount = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Get saved unread count or generate a new one
      const savedCount = localStorage.getItem('mockUnreadNotifications');
      let unreadCount;
      
      if (savedCount) {
        unreadCount = parseInt(savedCount, 10);
      } else {
        // Generate a random number between 1 and 8
        unreadCount = Math.floor(Math.random() * 8) + 1;
        localStorage.setItem('mockUnreadNotifications', unreadCount.toString());
      }
      
      return await mockResponse({ count: unreadCount }, 300);
    }
    
    // Real API call
    const response = await get('/notifications/unread-count');
    return response;
  } catch (error) {
    console.error('Get unread count error:', error);
    // Return 0 instead of throwing to prevent UI issues
    return { count: 0, success: false };
  }
};

/**
 * Mark a notification as read
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise} Promise that resolves with the updated notification
 */
export const markAsRead = async (notificationId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Update unread count in localStorage
      const savedCount = localStorage.getItem('mockUnreadNotifications');
      if (savedCount) {
        const unreadCount = Math.max(0, parseInt(savedCount, 10) - 1);
        localStorage.setItem('mockUnreadNotifications', unreadCount.toString());
      }
      
      return await mockResponse({ success: true }, 300);
    }
    
    // Real API call
    return await put(`/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Mark as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * 
 * @returns {Promise} Promise that resolves with success status
 */
export const markAllAsRead = async () => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Set unread count to 0 in localStorage
      localStorage.setItem('mockUnreadNotifications', '0');
      
      return await mockResponse({ success: true }, 500);
    }
    
    // Real API call — server route is PUT /notifications/read-all
    return await put('/notifications/read-all');
  } catch (error) {
    console.error('Mark all as read error:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise} Promise that resolves with success status
 */
export const deleteNotification = async (notificationId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true }, 300);
    }
    
    // Real API call — server route is DELETE /notifications/:id
    return await del(`/notifications/${notificationId}`);
  } catch (error) {
    console.error('Delete notification error:', error);
    throw error;
  }
};

// Export all notification service functions
const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};

export default notificationService;
