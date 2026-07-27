import { get, post, put, del } from '../utils/apiUtils';
import { mockBroadcastMessages, mockTargetedAlerts, mockEscalationWorkflows } from './mockData';
import { mockResponse, mockError } from './mockUtils';

// No need to define API_URL as it's handled by apiUtils

// ============================================================================
// BROADCAST MESSAGES
// ============================================================================

/**
 * Get all broadcast messages
 * @returns {Promise} Promise with broadcast messages data
 */
export const getBroadcastMessages = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ data: mockBroadcastMessages });
    }
    const response = await get('/admin/messages/broadcast'); 
    return response;
  } catch (error) {
    console.error(`Error in getBroadcastMessages:`, error);
    throw error;
  }
};

/**
 * Get a specific broadcast message by ID
 * @param {string} id - Broadcast message ID
 * @returns {Promise} Promise with broadcast message data
 */
export const getBroadcastMessageById = async (id) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const message = mockBroadcastMessages.find(msg => msg.id === id);
      return await mockResponse({ data: message || null });
    }
    const response = await get(`/admin/messages/broadcast/${id}`);     
    return response;
  } catch (error) {
    console.error(`Error in getBroadcastMessageById with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new broadcast message
 * @param {Object} messageData - Broadcast message data
 * @returns {Promise} Promise with created message data
 */
export const createBroadcastMessage = async (messageData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const newMessage = {
        id: `broadcast-${mockBroadcastMessages.length + 1}`,
        ...messageData,
        sentAt: messageData.status === 'sent' ? new Date().toISOString() : null,
        recipientCount: messageData.status === 'sent' ? 156 : 0,
        readCount: 0
      };
      return await mockResponse({ data: newMessage });
    }
    const response = await post('/admin/messages/broadcast', messageData);  
    return response;
  } catch (error) {
    console.error('Error in createBroadcastMessage:', error);
    throw error;
  }
};

/**
 * Update an existing broadcast message
 * @param {string} id - Broadcast message ID
 * @param {Object} messageData - Updated broadcast message data
 * @returns {Promise} Promise with updated message data
 */
export const updateBroadcastMessage = async (id, messageData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockBroadcastMessages.findIndex(msg => msg.id === id);
      if (index === -1) {
        return mockError(new Error('Message not found'), 404);
      }
      
      // If status changed from draft to sent, update sentAt
      if (mockBroadcastMessages[index].status === 'draft' && messageData.status === 'sent') {
        messageData.sentAt = new Date().toISOString();
        messageData.recipientCount = 156;
      }
      
      const updatedMessage = { ...mockBroadcastMessages[index], ...messageData };
      return await mockResponse({ data: updatedMessage });
    }
    const response = await put(`/admin/messages/broadcast/${id}`, messageData); 
    
    return response;
  } catch (error) {
    console.error(`Error in updateBroadcastMessage with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a broadcast message
 * @param {string} id - Broadcast message ID
 * @returns {Promise} Promise with deletion status
 */
export const deleteBroadcastMessage = async (id) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockBroadcastMessages.findIndex(msg => msg.id === id);
      if (index === -1) {
        return mockError(new Error('Message not found'), 404);
      }
      return await mockResponse({ data: { success: true, message: 'Broadcast message deleted successfully' } });
    }

    const response = await del(`/admin/messages/broadcast/${id}`);
    return response;
  } catch (error) {
    console.error('Error in deleteBroadcastMessage:', error);
    throw error;
  }
};

/**
 * Send a broadcast message (change status from draft to sent)
 * @param {string} id - Broadcast message ID
 * @returns {Promise} Promise with sent message data
 */
export const sendBroadcastMessage = async (id) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockBroadcastMessages.findIndex(msg => msg.id === id);
      if (index === -1) {
        return mockError(new Error('Message not found'), 404);
      }
      
      const updatedMessage = { 
        ...mockBroadcastMessages[index], 
        status: 'sent',
        sentAt: new Date().toISOString(),
        recipientCount: 156,
        readCount: 0
      };
      
      return await mockResponse({ data: updatedMessage });
    }

    const response = await post(`/admin/messages/broadcast/${id}/send`, {});
    return response;
  } catch (error) {
    console.error('Error in sendBroadcastMessage:', error);
    throw error;
  }
};

// ============================================================================
// TARGETED ALERTS
// ============================================================================

/**
 * Get all targeted alerts
 * @returns {Promise} Promise with targeted alerts data
 */
export const getTargetedAlerts = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ data: mockTargetedAlerts });
    }

    const response = await get(`/admin/messages/alerts`);
    return response;
  } catch (error) {
    console.error('Error in getTargetedAlerts:', error);
    throw error;
  }
};

/**
 * Get a specific targeted alert by ID
 * @param {string} id - Targeted alert ID
 * @returns {Promise} Promise with targeted alert data
 */
export const getTargetedAlertById = async (id) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const alert = mockTargetedAlerts.find(a => a.id === id);
      return await mockResponse({ data: alert || null });
    }

    const response = await get(`/admin/messages/alerts/${id}`);
    return response;
  } catch (error) {
    console.error('Error in getTargetedAlertById:', error);
    throw error;
  }
};

/**
 * Create a new targeted alert
 * @param {Object} alertData - Targeted alert data
 * @returns {Promise} Promise with created alert data
 */
export const createTargetedAlert = async (alertData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const newAlert = {
        id: `alert-${mockTargetedAlerts.length + 1}`,
        ...alertData,
        sentAt: alertData.status === 'sent' ? new Date().toISOString() : null
      };
      
      // Initialize readAt to null for all recipients if status is sent
      if (alertData.status === 'sent' && alertData.recipients) {
        newAlert.recipients = alertData.recipients.map(recipient => ({
          ...recipient,
          readAt: null
        }));
      }
      
      return await mockResponse({ data: newAlert });
    }

    const response = await post(`/admin/messages/alerts`, alertData);
    return response;
  } catch (error) {
    console.error('Error in createTargetedAlert:', error);
    throw error;
  }
};

/**
 * Update an existing targeted alert
 * @param {string} id - Targeted alert ID
 * @param {Object} alertData - Updated targeted alert data
 * @returns {Promise} Promise with updated alert data
 */
export const updateTargetedAlert = async (id, alertData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockTargetedAlerts.findIndex(alert => alert.id === id);
      if (index === -1) {
        return mockError(new Error('Alert not found'), 404);
      }
      
      // If status changed from draft to sent, update sentAt
      if (mockTargetedAlerts[index].status === 'draft' && alertData.status === 'sent') {
        alertData.sentAt = new Date().toISOString();
        
        // Initialize readAt to null for all recipients
        if (alertData.recipients) {
          alertData.recipients = alertData.recipients.map(recipient => ({
            ...recipient,
            readAt: null
          }));
        }
      }
      
      const updatedAlert = { ...mockTargetedAlerts[index], ...alertData };
      return await mockResponse({ data: updatedAlert });
    }

    const response = await put(`/admin/messages/alerts/${id}`, alertData);
    return response;
  } catch (error) {
    console.error('Error in updateTargetedAlert:', error);
    throw error;
  }
};

/**
 * Delete a targeted alert
 * @param {string} id - Targeted alert ID
 * @returns {Promise} Promise with deletion status
 */
export const deleteTargetedAlert = async (id) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockTargetedAlerts.findIndex(alert => alert.id === id);
      if (index === -1) {
        return mockError(new Error('Alert not found'), 404);
      }
      return await mockResponse({ data: { success: true, message: 'Targeted alert deleted successfully' } });
    }

    const response = await del(`/admin/messages/alerts/${id}`);
    return response;
  } catch (error) {
    console.error('Error in deleteTargetedAlert:', error);
    throw error;
  }
};

/**
 * Send a targeted alert (change status from draft to sent)
 * @param {string} id - Targeted alert ID
 * @returns {Promise} Promise with sent alert data
 */
export const sendTargetedAlert = async (id) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockTargetedAlerts.findIndex(alert => alert.id === id);
      if (index === -1) {
        return mockError(new Error('Alert not found'), 404);
      }
      
      const updatedAlert = { 
        ...mockTargetedAlerts[index], 
        status: 'sent',
        sentAt: new Date().toISOString()
      };
      
      // Initialize readAt to null for all recipients
      if (updatedAlert.recipients) {
        updatedAlert.recipients = updatedAlert.recipients.map(recipient => ({
          ...recipient,
          readAt: null
        }));
      }
      
      return await mockResponse({ data: updatedAlert });
    }

    const response = await post(`/admin/messages/alerts/${id}/send`, {});
    return response;
  } catch (error) {
    console.error('Error in sendTargetedAlert:', error);
    throw error;
  }
};

// ============================================================================
// ESCALATION WORKFLOWS
// ============================================================================

/**
 * Get all escalation workflows
 * @param {Object} filters - Optional filters for status, priority, category
 * @returns {Promise} Promise with escalation workflows data
 */
export const getEscalationWorkflows = async (filters = {}) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      let filteredWorkflows = [...mockEscalationWorkflows];
      
      // Apply filters if provided
      if (filters.status) {
        filteredWorkflows = filteredWorkflows.filter(workflow => workflow.status === filters.status);
      }
      
      if (filters.priority) {
        filteredWorkflows = filteredWorkflows.filter(workflow => workflow.priority === filters.priority);
      }
      
      if (filters.category) {
        filteredWorkflows = filteredWorkflows.filter(workflow => workflow.category === filters.category);
      }
      
      return await mockResponse({ data: filteredWorkflows });
    }

    const response = await get(`/admin/escalations`, { params: filters });
    return response;
  } catch (error) {
    console.error('Error in getEscalationWorkflows:', error);
    throw error;
  }
};

/**
 * Get a specific escalation workflow by ID
 * @param {string} id - Escalation workflow ID
 * @returns {Promise} Promise with escalation workflow data
 */
export const getEscalationWorkflowById = async (id) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const workflow = mockEscalationWorkflows.find(w => w.id === id);
      return await mockResponse({ data: workflow || null });
    }

    const response = await get(`/admin/escalations/${id}`);
    return response;
  } catch (error) {
    console.error('Error in getEscalationWorkflowById:', error);
    throw error;
  }
};

/**
 * Update an escalation workflow
 * @param {string} id - Escalation workflow ID
 * @param {Object} workflowData - Updated escalation workflow data
 * @returns {Promise} Promise with updated workflow data
 */
export const updateEscalationWorkflow = async (id, workflowData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockEscalationWorkflows.findIndex(workflow => workflow.id === id);
      if (index === -1) {
        return mockError(new Error('Workflow not found'), 404);
      }
      
      // If status changed to resolved and no resolution provided, add one
      if (workflowData.status === 'resolved' && !workflowData.resolution) {
        workflowData.resolution = {
          action: 'Resolved by admin',
          notes: 'Issue addressed by administrator',
          timestamp: new Date().toISOString(),
          resolvedBy: {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@clinictrust.ai'
          }
        };
      }
      
      // Add timeline entry for status change if applicable
      if (workflowData.status && workflowData.status !== mockEscalationWorkflows[index].status) {
        const timelineEntry = {
          action: `Status changed to ${workflowData.status}`,
          timestamp: new Date().toISOString(),
          user: 'Admin User'
        };
        
        workflowData.timeline = [
          ...(mockEscalationWorkflows[index].timeline || []),
          timelineEntry
        ];
      }
      
      // Add timeline entry for assignment change if applicable
      if (workflowData.assignedTo && 
          (!mockEscalationWorkflows[index].assignedTo || 
           workflowData.assignedTo.id !== mockEscalationWorkflows[index].assignedTo.id)) {
        const timelineEntry = {
          action: `Assigned to ${workflowData.assignedTo.name}`,
          timestamp: new Date().toISOString(),
          user: 'Admin User'
        };
        
        workflowData.timeline = [
          ...(workflowData.timeline || mockEscalationWorkflows[index].timeline || []),
          timelineEntry
        ];
      }
      
      const updatedWorkflow = { ...mockEscalationWorkflows[index], ...workflowData };
      return await mockResponse({ data: updatedWorkflow });
    }

    const response = await put(`/admin/escalations/${id}`, workflowData);
    return response;
  } catch (error) {
    console.error('Error in updateEscalationWorkflow:', error);
    throw error;
  }
};

/**
 * Assign an escalation workflow to a provider
 * @param {string} id - Escalation workflow ID
 * @param {Object} assignmentData - Assignment data with provider information
 * @returns {Promise} Promise with updated workflow data
 */
export const assignEscalationWorkflow = async (id, assignmentData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockEscalationWorkflows.findIndex(workflow => workflow.id === id);
      if (index === -1) {
        return mockError(new Error('Workflow not found'), 404);
      }
      
      const timelineEntry = {
        action: `Assigned to ${assignmentData.name}`,
        timestamp: new Date().toISOString(),
        user: 'Admin User'
      };
      
      const updatedWorkflow = { 
        ...mockEscalationWorkflows[index],
        assignedTo: assignmentData,
        status: mockEscalationWorkflows[index].status === 'pending_review' ? 'in_progress' : mockEscalationWorkflows[index].status,
        timeline: [...mockEscalationWorkflows[index].timeline, timelineEntry]
      };
      
      return await mockResponse({ data: updatedWorkflow });
    }

    const response = await post(`/admin/escalations/${id}/assign`, assignmentData);
    return response;
  } catch (error) {
    console.error('Error in assignEscalationWorkflow:', error);
    throw error;
  }
};

/**
 * Resolve an escalation workflow
 * @param {string} id - Escalation workflow ID
 * @param {Object} resolutionData - Resolution data with action, notes
 * @returns {Promise} Promise with updated workflow data
 */
export const resolveEscalationWorkflow = async (id, resolutionData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const index = mockEscalationWorkflows.findIndex(workflow => workflow.id === id);
      if (index === -1) {
        return mockError(new Error('Workflow not found'), 404);
      }
      
      const timelineEntry = {
        action: 'Case resolved',
        timestamp: new Date().toISOString(),
        user: resolutionData.resolvedBy?.name || 'Admin User'
      };
      
      const resolution = {
        ...resolutionData,
        timestamp: new Date().toISOString()
      };
      
      const updatedWorkflow = { 
        ...mockEscalationWorkflows[index],
        status: 'resolved',
        resolution,
        timeline: [...mockEscalationWorkflows[index].timeline, timelineEntry]
      };
      
      return await mockResponse({ data: updatedWorkflow });
    }

    const response = await post(`/admin/escalations/${id}/resolve`, resolutionData);
    return response;
  } catch (error) {
    console.error('Error in resolveEscalationWorkflow:', error);
    throw error;
  }
};

/**
 * Get escalation workflow statistics
 * @returns {Promise} Promise with escalation workflow statistics
 */
export const getEscalationStatistics = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Calculate statistics from mock data
      const totalWorkflows = mockEscalationWorkflows.length;
      const pendingReview = mockEscalationWorkflows.filter(w => w.status === 'pending_review').length;
      const inProgress = mockEscalationWorkflows.filter(w => w.status === 'in_progress').length;
      const resolved = mockEscalationWorkflows.filter(w => w.status === 'resolved').length;
      
      const highPriority = mockEscalationWorkflows.filter(w => w.priority === 'high' || w.priority === 'critical').length;
      const unassigned = mockEscalationWorkflows.filter(w => !w.assignedTo).length;
      
      const categoryDistribution = {};
      mockEscalationWorkflows.forEach(workflow => {
        if (!categoryDistribution[workflow.category]) {
          categoryDistribution[workflow.category] = 0;
        }
        categoryDistribution[workflow.category]++;
      });
      
      const statistics = {
        totalWorkflows,
        statusDistribution: {
          pendingReview,
          inProgress,
          resolved
        },
        highPriority,
        unassigned,
        categoryDistribution: Object.entries(categoryDistribution).map(([name, value]) => ({ name, value })),
        averageResolutionTime: '1.5 days'
      };
      
      return await mockResponse({ data: statistics });
    }

    const response = await get(`/admin/escalations/statistics`);
    return response;
  } catch (error) {
    console.error('Error in getEscalationStatistics:', error);
    throw error;
  }
};

// Export all services
const adminMessagingService = {
  // Broadcast Messages
  getBroadcastMessages,
  getBroadcastMessageById,
  createBroadcastMessage,
  updateBroadcastMessage,
  deleteBroadcastMessage,
  sendBroadcastMessage,
  
  // Targeted Alerts
  getTargetedAlerts,
  getTargetedAlertById,
  createTargetedAlert,
  updateTargetedAlert,
  deleteTargetedAlert,
  sendTargetedAlert,
  
  // Escalation Workflows
  getEscalationWorkflows,
  getEscalationWorkflowById,
  updateEscalationWorkflow,
  assignEscalationWorkflow,
  resolveEscalationWorkflow,
  getEscalationStatistics
};

export default adminMessagingService;
