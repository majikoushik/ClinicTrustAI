import { get, post, put, del } from '../utils/apiUtils';
import {
  mockScheduledReports
} from './mockData';

// ── Inline mock data for new analytics endpoints ─────────────────────────────
const MOCK_PROVIDER_PERFORMANCE = [
  { id: 'p1', name: 'Dr. John Smith',     specialty: 'Cardiology',        organization: 'Metro Heart Institute',      referrals: 18, acceptanceRate: 0.89, avgResponseTime: 8.2,  tokenBalance: 420, tokenEarnedThisMonth: 60, dtxPrescriptions: 5, appointmentsTotal: 22, appointmentsCompleted: 18, noShowRate: 9  },
  { id: 'p2', name: 'Dr. Sarah Johnson',  specialty: 'Neurology',         organization: 'Central Neurology Center',   referrals: 14, acceptanceRate: 0.93, avgResponseTime: 6.5,  tokenBalance: 350, tokenEarnedThisMonth: 45, dtxPrescriptions: 3, appointmentsTotal: 17, appointmentsCompleted: 15, noShowRate: 6  },
  { id: 'p3', name: 'Dr. Michael Chen',   specialty: 'Orthopedics',       organization: 'North Orthopedic Clinic',    referrals: 12, acceptanceRate: 0.78, avgResponseTime: 11.3, tokenBalance: 290, tokenEarnedThisMonth: 32, dtxPrescriptions: 2, appointmentsTotal: 14, appointmentsCompleted: 11, noShowRate: 21 },
  { id: 'p4', name: 'Dr. Emily Rodriguez',specialty: 'Behavioral Health', organization: 'South Mental Health Center', referrals: 16, acceptanceRate: 0.85, avgResponseTime: 9.0,  tokenBalance: 175, tokenEarnedThisMonth: 50, dtxPrescriptions: 7, appointmentsTotal: 19, appointmentsCompleted: 16, noShowRate: 5  },
];

const MOCK_REFERRAL_CONVERSION = {
  data: [
    { month: 'Jan 25', sent: 8,  accepted: 7,  completed: 5  },
    { month: 'Feb 25', sent: 10, accepted: 8,  completed: 6  },
    { month: 'Mar 25', sent: 7,  accepted: 6,  completed: 5  },
    { month: 'Apr 25', sent: 12, accepted: 10, completed: 8  },
    { month: 'May 25', sent: 9,  accepted: 7,  completed: 6  },
    { month: 'Jun 25', sent: 11, accepted: 9,  completed: 7  },
  ],
  meta: {
    sent: 57, accepted: 47, completed: 37,
    acceptanceRate: 82, completionRate: 79, overallConversion: 65, referralToApptRate: 68,
    rejectionReasons: [
      { reason: 'Insurance not accepted', count: 4 },
      { reason: 'At capacity',            count: 3 },
      { reason: 'Incomplete referral info', count: 2 },
      { reason: 'Out of specialty scope', count: 1 },
    ],
  },
};

const MOCK_TOKEN_ECONOMY = {
  data: [
    { month: 'Jan 25', issued: 35,  redeemed: 12, circulation: 835  },
    { month: 'Feb 25', issued: 42,  redeemed: 15, circulation: 862  },
    { month: 'Mar 25', issued: 38,  redeemed: 13, circulation: 887  },
    { month: 'Apr 25', issued: 55,  redeemed: 19, circulation: 923  },
    { month: 'May 25', issued: 48,  redeemed: 17, circulation: 954  },
    { month: 'Jun 25', issued: 62,  redeemed: 22, circulation: 994  },
  ],
  meta: {
    totalIssued: 280, totalRedeemed: 98, currentCirculation: 994,
    leaderboard: [
      { rank: 1, name: 'Dr. John Smith',      specialty: 'Cardiology',        balance: 420 },
      { rank: 2, name: 'Dr. Sarah Johnson',   specialty: 'Neurology',         balance: 350 },
      { rank: 3, name: 'Dr. Michael Chen',    specialty: 'Orthopedics',       balance: 290 },
      { rank: 4, name: 'Dr. Emily Rodriguez', specialty: 'Behavioral Health', balance: 175 },
    ],
    breakdown: { referral: 145, appointment: 82, dtx: 36, other: 17 },
  },
};

const MOCK_AI_ANALYTICS = {
  accuracy: { riskAssessment: 0.87, summaryGeneration: 0.92, recommendationEngine: 0.85 },
  ambientAI: { total: 37, approved: 28, rejected: 5, pending: 4, approvalRate: 76 },
  referralMatching: { sessions: 57, withSelection: 48, selectionRate: 84, avgMatchScore: 78 },
  usage: [
    { month: 'Jan 25', ambientSessions: 3,  matchSessions: 5  },
    { month: 'Feb 25', ambientSessions: 5,  matchSessions: 8  },
    { month: 'Mar 25', ambientSessions: 4,  matchSessions: 7  },
    { month: 'Apr 25', ambientSessions: 7,  matchSessions: 10 },
    { month: 'May 25', ambientSessions: 8,  matchSessions: 12 },
    { month: 'Jun 25', ambientSessions: 10, matchSessions: 15 },
  ],
  falsePositives: 12, falseNegatives: 8, improvementRate: 0.082,
};

const MOCK_PLATFORM_HEALTH = {
  activeProviders:         { count: 4,    total: 5  },
  referralsThisMonth:      { count: 47,   trend: 15 },
  appointmentsThisWeek:    { scheduled: 8, completed: 5 },
  priorAuthPending:        { count: 3,    overdueCount: 1 },
  dtxActivePrescriptions:  { count: 7    },
  tokensInCirculation:     { total: 1235, issuedThisMonth: 145 },
};

const MOCK_ALERTS = [
  { type: 'prior_auth_overdue', severity: 'error',   message: '1 prior auth pending > 7 days without a decision', count: 1, link: '/admin/prior-auth' },
  { type: 'referral_stale',     severity: 'warning',  message: '2 referrals stuck in pending > 14 days',           count: 2, link: '/admin/referrals'  },
  { type: 'provider_inactive',  severity: 'warning',  message: '1 provider with no login activity this month',     count: 1, link: '/admin/users'      },
  { type: 'dtx_unused',         severity: 'info',     message: '3 active DTx programs with 0 prescriptions',       count: 3, link: '/admin/dtx'        },
];

const MOCK_CARE_FUNNEL = [
  { stage: 'Referrals Created',       count: 47, color: '#1976d2', dropoffPct: null },
  { stage: 'Referrals Accepted',      count: 38, color: '#0288d1', dropoffPct: 19   },
  { stage: 'Appointments Booked',     count: 31, color: '#00897b', dropoffPct: 18   },
  { stage: 'Appointments Completed',  count: 25, color: '#388e3c', dropoffPct: 19   },
  { stage: 'DTx Prescribed',          count: 12, color: '#7b1fa2', dropoffPct: 52   },
  { stage: 'DTx Completed',           count: 7,  color: '#f57c00', dropoffPct: 42   },
];

const _now = Date.now();
const MOCK_ACTIVITY_FEED = [
  { type: 'appointment', description: 'Appointment completed — Alice Johnson with Dr. John Smith',     timestamp: new Date(_now - 1200000)  },
  { type: 'referral',    description: 'Referral accepted — Neurology referral for Bob Williams',        timestamp: new Date(_now - 3600000)  },
  { type: 'dtx',        description: 'DTx program activated — David Brown started MindPath CBT',       timestamp: new Date(_now - 7200000)  },
  { type: 'prior_auth', description: 'Prior auth approved — Alice Johnson, Cardiology consultation',   timestamp: new Date(_now - 10800000) },
  { type: 'appointment', description: 'Appointment confirmed — Carol Davis with Dr. Michael Chen',     timestamp: new Date(_now - 14400000) },
  { type: 'ambient',    description: 'Ambient AI session approved — Chest pain note by Dr. John Smith',timestamp: new Date(_now - 18000000) },
  { type: 'referral',    description: 'Referral completed — Cardiology referral for Eva Martinez',     timestamp: new Date(_now - 21600000) },
  { type: 'dtx',        description: 'DTx prescribed — James Anderson started AnxietyFree ACT',       timestamp: new Date(_now - 28800000) },
  { type: 'appointment', description: 'No-show recorded — Frank Wilson with Dr. Sarah Johnson',        timestamp: new Date(_now - 36000000) },
  { type: 'prior_auth', description: 'Prior auth submitted — Bob Williams, Neurology follow-up',      timestamp: new Date(_now - 43200000) },
];

const MOCK_PLATFORM_OVERVIEW = {
  dtx:        { activePrograms: 10, prescriptionsThisMonth: 7, completionRate: 43, tokensAwarded: 120 },
  priorAuth:  { submitted: 10, pending: 3, approved: 5, denied: 2, avgTurnaroundDays: 4.2 },
  engagement: { sent: 48, deliveryRate: 94 },
  ambientAI:  { sessionsThisMonth: 8, approvedThisMonth: 6, approvalRate: 75 },
};

// Get provider performance data
const getProviderPerformance = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_PROVIDER_PERFORMANCE };
    }
    const response = await get('/admin/analytics/provider-performance');
    return response;
  } catch (error) {
    console.error('Error fetching provider performance:', error);
    return { success: false, error: error.message };
  }
};

// Get referral conversion rates
const getReferralConversionRates = async (period = 'last6months') => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_REFERRAL_CONVERSION.data, meta: MOCK_REFERRAL_CONVERSION.meta };
    }
    const response = await get(`/admin/analytics/referral-conversion?period=${period}`);
    return { success: true, data: response.data, meta: response.meta };
  } catch (error) {
    console.error('Error fetching referral conversion rates:', error);
    return { success: false, error: error.message };
  }
};

// Get token economy trends
const getTokenEconomyTrends = async (period = 'last6months') => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_TOKEN_ECONOMY.data, meta: MOCK_TOKEN_ECONOMY.meta };
    }
    const response = await get(`/admin/analytics/token-economy?period=${period}`);
    return { success: true, data: response.data, meta: response.meta };
  } catch (error) {
    console.error('Error fetching token economy trends:', error);
    return { success: false, error: error.message };
  }
};

// Get AI analytics data
const getAIAnalytics = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_AI_ANALYTICS };
    }
    const response = await get('/admin/analytics/ai-performance');
    return response;
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    return { success: false, error: error.message };
  }
};

// Export report as CSV or PDF
const exportReport = async (reportType, format, filters = {}) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // For mock API, we'd normally return a Blob or download URL
      // But for demo purposes, we'll just return success
      return { 
        success: true, 
        message: `${reportType} report exported as ${format} successfully`,
        // In a real implementation, this would be a download URL or Blob
        downloadUrl: `https://example.com/reports/${reportType}_${Date.now()}.${format}`
      };
    }
    const response = await post('/admin/reports/export', 
      { reportType, format, filters },
      { responseType: 'blob' } // For actual file download
    );    
    
    
    return {
      success: true,
      data: response.data,
      filename: `${reportType}_${new Date().toISOString().split('T')[0]}.${format}`
    };
  } catch (error) {
    console.error('Error exporting report:', error);
    return { success: false, error: error.message };
  }
};

// Get scheduled reports
const getScheduledReports = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: mockScheduledReports };
    }
    const response = await get('/admin/reports/scheduled');
    return response;
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    return { success: false, error: error.message };
  }
};

// Schedule a new report
const scheduleReport = async (reportData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Simulate creating a new scheduled report
      const newReport = {
        id: mockScheduledReports.length + 1,
        ...reportData,
        lastSent: null,
        nextScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
      };
      
      return { success: true, data: newReport };
    }
    const response = await post('/admin/reports/schedule', reportData);
    return response;
  } catch (error) {
    console.error('Error scheduling report:', error);
    return { success: false, error: error.message };
  }
};

// Update a scheduled report
const updateScheduledReport = async (reportId, reportData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { 
        success: true, 
        message: `Report ${reportId} updated successfully`
      };
    }
    const response = await put(`/admin/reports/schedule/${reportId}`, reportData);
    return response;
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    return { success: false, error: error.message };
  }
};

// Delete a scheduled report
const deleteScheduledReport = async (reportId) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return {
        success: true,
        message: `Report ${reportId} deleted successfully`
      };
    }
    const response = await del(`/admin/reports/schedule/${reportId}`);
    return response;
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    return { success: false, error: error.message };
  }
};

// Get admin emails for report recipient autocomplete
const getAdminEmails = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return {
        success: true,
        data: [
          'admin@clinictrustai.com',
          'superadmin@clinictrustai.com',
          'reports@clinictrustai.com'
        ]
      };
    }
    const response = await get('/admin/users/emails');
    return response;
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return { success: false, error: error.message };
  }
};

const getPlatformHealth = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_PLATFORM_HEALTH };
    }
    const response = await get('/admin/analytics/platform-health');
    return response;
  } catch (error) {
    console.error('Error fetching platform health:', error);
    return { success: false, error: error.message };
  }
};

const getAlerts = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_ALERTS };
    }
    const response = await get('/admin/analytics/alerts');
    return response;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return { success: false, error: error.message };
  }
};

const getCareFunnel = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_CARE_FUNNEL };
    }
    const response = await get('/admin/analytics/care-funnel');
    return response;
  } catch (error) {
    console.error('Error fetching care funnel:', error);
    return { success: false, error: error.message };
  }
};

const getActivityFeed = async (limit = 20) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_ACTIVITY_FEED.slice(0, limit) };
    }
    const response = await get(`/admin/analytics/activity-feed?limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return { success: false, error: error.message };
  }
};

const getPlatformOverview = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: MOCK_PLATFORM_OVERVIEW };
    }
    const response = await get('/admin/analytics/platform-overview');
    return response;
  } catch (error) {
    console.error('Error fetching platform overview:', error);
    return { success: false, error: error.message };
  }
};

const adminAnalyticsService = {
  getProviderPerformance,
  getReferralConversionRates,
  getTokenEconomyTrends,
  getAIAnalytics,
  getPlatformHealth,
  getAlerts,
  getCareFunnel,
  getActivityFeed,
  getPlatformOverview,
  exportReport,
  getScheduledReports,
  scheduleReport,
  updateScheduledReport,
  deleteScheduledReport,
  getAdminEmails,
};

export default adminAnalyticsService;
