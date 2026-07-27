import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToken, usePatient, useReferral, useAnalytics } from '../../contexts';
import dashboardService from '../../services/dashboardService';
import {
  mockClinicalMetricsData,
  mockReferralEfficiencyData,
} from '../../services/mockData';
import { ModernLoadingIndicator, ErrorDisplay } from '../../components/common';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Tab,
  Tabs,
  LinearProgress,
  Tooltip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  SwapHoriz as ReferralsIcon,
  Analytics as AnalyticsIcon,
  Token as TokenIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  Insights as InsightsIcon,
  TrendingDown as TrendingDownIcon,
  Speed as SpeedIcon,
  Favorite as FavoriteIcon,
  Psychology as PsychologyIcon,
  EventAvailable as ApptIcon,
  VideoCall as TelehealthIcon,
  Storefront as StorefrontIcon,
  LocalPharmacy as RxIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getMySchedule } from '../../services/appointmentService';
import { getMyPrescriptions } from '../../services/dtxService';
import { formatDate } from '../../utils/dateFormatter';

// Import recharts for data visualization
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

// Dashboard stat card component - memoized to prevent unnecessary re-renders
const StatCard = memo(({ title, value, icon, color, subtitle, additionalInfo, onClick }) => (
  <Paper
    elevation={2}
    sx={{
      p: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 2,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 6,
        cursor: onClick ? 'pointer' : 'default'
      }
    }}
    onClick={onClick}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
        {icon}
      </Avatar>
    </Box>
    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
      {value}
    </Typography>
    {additionalInfo && (
      <Typography variant="body1" sx={{ color: additionalInfo.color || 'success.main', mb: 1, display: 'flex', alignItems: 'center' }}>
        {additionalInfo.icon && <Box component="span" sx={{ mr: 0.5, display: 'flex', alignItems: 'center' }}>{additionalInfo.icon}</Box>}
        {additionalInfo.text}
      </Typography>
    )}
    {subtitle && (
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </Paper>
));

// AI Insight Card component
// Patient Risk Analysis Chart component
const PatientRiskAnalysisChart = memo(({ data }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Patient Risk Distribution
      </Typography>
      <Box sx={{ flex: 1, minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, value, percent }) => `${value}`}
            >
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <RechartsTooltip formatter={(value, name) => [`${value} patients`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
});

// Clinical Metrics Chart component
const ClinicalMetricsChart = memo(({ data, title }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ flex: 1, minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#8884d8" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="average" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
});

// Referral Efficiency Chart component
const ReferralEfficiencyChart = memo(({ data }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Referral Efficiency Metrics
      </Typography>
      <Box sx={{ flex: 1, minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="current" fill="#8884d8" name="Current" />
            <Bar dataKey="target" fill="#82ca9d" name="Target" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
});

// AI Performance Metrics component
const AIPerformanceMetrics = memo(({ metrics }) => {
  // Add null check for metrics
  const safeMetrics = metrics || {};
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          AI Performance Metrics
        </Typography>
        <Tooltip title="AI-powered insights based on your practice data">
          <IconButton size="small">
            <PsychologyIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {Object.entries(safeMetrics).map(([key, value]) => (
        <Box key={key} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">
              {key.split(/(?=[A-Z])/).join(' ')}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {value}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={value} 
            color={value > 80 ? 'success' : value > 60 ? 'primary' : 'warning'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      ))}
    </Paper>
  );
});

function Dashboard() {
  const { currentUser } = useAuth();
  useToken();
  usePatient();
  useReferral();
  useAnalytics();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState({
    patients: { total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, careQualityIndex: 0 },
    referrals: { pending: 0, completed: 0, conversionRate: 0 },
    analytics: { recent: [], engagementGrowth: 0 },
    tokens: { balance: 0, estimatedValue: 0 },
    recentActivity: [],
    providerPerformance: { averageAcceptanceRate: 0, averageCompletionTime: 0 },
    aiMetrics: { riskAssessment: 0, summaryGeneration: 0, recommendations: 0, overall: 0 }
  });
  const [, setAiInsights] = useState([]);
  const [clinicalMetrics, setClinicalMetrics] = useState([]);
  const [referralEfficiency, setReferralEfficiency] = useState([]);
  const [patientRiskData, setPatientRiskData] = useState([]);
  const [aiMetricsData, setAiMetricsData] = useState([]);
  const [clinicalOutcomesData, setClinicalOutcomesData] = useState(null);
  const [aiPerformanceData, setAiPerformanceData] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [todayLoading, setTodayLoading] = useState(false);
  const [recentRx, setRecentRx] = useState([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState(null);

  // Define fetchDashboardData function outside of useEffect
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Check if we should use mock data
      const useMockData = process.env.REACT_APP_MOCK_API === 'true';
      
      // Fetch dashboard data
      let data;
      if (useMockData) {
        data = await dashboardService.getDashboardData();
        // Enhance with our new mock data
        data = {
          ...data,
          clinicalMetricsData: mockClinicalMetricsData,
          referralEfficiencyData: mockReferralEfficiencyData,
        };
      } else {
        data = await dashboardService.getDashboardData();
      }
      
      setDashboardData(data);

      // Build patient risk chart from the real counts returned by the API
      if (data?.patients) {
        setPatientRiskData([
          { name: 'High Risk',   value: data.patients.highRisk   || 0 },
          { name: 'Medium Risk', value: data.patients.mediumRisk || 0 },
          { name: 'Low Risk',    value: data.patients.lowRisk    || 0 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Fetch today's schedule
  const fetchTodaySchedule = useCallback(async () => {
    setTodayLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const res = await getMySchedule({ startDate: todayStr, endDate: todayStr });
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      const appts = inner.appointments || [];
      setTodayAppointments(appts.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')));
    } catch {
      setTodayAppointments([]);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const fetchRecentRx = useCallback(async () => {
    setRxLoading(true);
    try {
      const res = await getMyPrescriptions({ limit: 5, page: 1 });
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setRecentRx(inner.prescriptions || []);
    } catch {
      setRecentRx([]);
    } finally {
      setRxLoading(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchDashboardData();
    fetchAdditionalMetrics();
    fetchTodaySchedule();
    fetchRecentRx();
    // Fetch pre-calculated analytics snapshot for Patient Analytics & Referral Metrics tabs
    dashboardService.getAnalyticsSnapshot().then(res => {
      if (res?.data) setAnalyticsSnapshot(res.data);
    }).catch(() => {});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAdditionalMetrics = useCallback(async () => {
    try {
      // Fetch provider performance metrics
      const providerResponse = await dashboardService.getProviderPerformance();
      if (providerResponse.success) {
        setDashboardData(prev => ({
          ...prev,
          providerPerformance: providerResponse.data
        }));
      }
      
      // Fetch AI analytics metrics
      const aiResponse = await dashboardService.getAIAnalyticsStats();
      if (aiResponse.success) {
        const accuracy = aiResponse.data.accuracyMetrics || {};
        setDashboardData(prev => ({ ...prev, aiMetrics: accuracy }));
        setAiMetricsData({
          riskAssessment:    Math.round((accuracy.riskAssessment    || 0) * 100),
          summaryGeneration: Math.round((accuracy.summaryGeneration || 0) * 100),
          recommendations:   Math.round((accuracy.recommendations   || 0) * 100),
          overall:           Math.round((accuracy.overall           || 0) * 100),
        });
        // Store full AI performance data for the AI Performance tab
        setAiPerformanceData(aiResponse.data);
        generateAIInsights(aiResponse.data);
      }

      // Fetch token economy stats (drives Care Quality Trends chart)
      const tokenResponse = await dashboardService.getTokenEconomyStats();
      if (tokenResponse.success) {
        generateClinicalMetrics(tokenResponse.data);
      }

      // Fetch referral statistics for efficiency chart
      const referralStatsResponse = await dashboardService.getReferralStatistics();
      if (referralStatsResponse.success) {
        generateReferralEfficiencyData(referralStatsResponse.data);
      }

      // Fetch clinical outcomes for the Clinical Outcomes tab
      const clinicalResponse = await dashboardService.getClinicalOutcomesData();
      if (clinicalResponse?.success && clinicalResponse.data) {
        setClinicalOutcomesData(clinicalResponse.data);
      }
      
    } catch (err) {
      console.error('Error fetching additional metrics:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchAdditionalMetrics(),
        fetchTodaySchedule(),
        fetchRecentRx(),
        dashboardService.getAnalyticsSnapshot().then(res => {
          if (res?.data) setAnalyticsSnapshot(res.data);
        }).catch(() => {}),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData, fetchAdditionalMetrics, fetchTodaySchedule, fetchRecentRx]);

  // Generate AI insights based on data
  const generateAIInsights = useCallback((aiData) => {
    const insights = [
      {
        title: 'High-Risk Patient Alert',
        insight: `${dashboardData?.patients?.highRisk} patients identified as high-risk. Consider scheduling follow-up appointments.`,
        severity: 'high',
        actionText: 'View Patients',
        onAction: () => navigate('/app/patients?filter=high-risk')
      },
      {
        title: 'Referral Efficiency',
        insight: `Your referral conversion rate (${dashboardData?.referrals?.conversionRate}%) is above average. Keep up the good work!`,
        severity: 'positive',
        actionText: 'View Referrals',
        onAction: () => navigate('/app/referrals')
      },
      {
        title: 'Care Quality Improvement',
        insight: `Your Care Quality Index has improved by ${dashboardData?.patients?.careQualityIndex}% this month based on patient outcomes.`,
        severity: 'positive',
        actionText: 'View Details',
        onAction: () => navigate('/app/analytics/care-quality')
      },
      {
        title: 'Analytics Engagement',
        insight: `Your analytics usage has ${dashboardData?.analytics?.engagementGrowth >= 0 ? 'increased' : 'decreased'} by ${Math.abs(dashboardData?.analytics?.engagementGrowth || 0)}% this month.`,
        severity: dashboardData?.analytics?.engagementGrowth >= 0 ? 'positive' : 'medium',
        actionText: 'Explore Analytics',
        onAction: () => navigate('/app/analytics')
      },
      {
        title: 'Token Economy Update',
        insight: `Token estimated value has changed by ${dashboardData?.tokens?.estimatedValue || 0}% this month. Consider strategic token usage.`,
        severity: dashboardData?.tokens?.estimatedValue >= 0 ? 'positive' : 'medium',
        actionText: 'Token Dashboard',
        onAction: () => navigate('/app/tokens')
      }
    ];
    
    setAiInsights(insights);
  }, [dashboardData, navigate]);
  
  // Generate clinical metrics data for chart from token economy trends
  const generateClinicalMetrics = useCallback((tokenData) => {
    if (!tokenData?.trends?.periods?.length) {
      setClinicalMetrics(mockClinicalMetricsData);
      return;
    }
    const { periods, issued, redeemed } = tokenData.trends;
    const totalIssued = tokenData.totalIssued || 1;
    const overallRate = Math.round((tokenData.totalRedeemed / totalIssued) * 100);
    const data = periods.map((period, i) => ({
      month: period,
      actual: Math.min(100, Math.round(((redeemed[i] || 0) / (issued[i] || 1)) * 100)),
      average: overallRate,
    }));
    setClinicalMetrics(data);
  }, []);
  
  // Generate referral efficiency data from real referral statistics
  const generateReferralEfficiencyData = useCallback((referralStats) => {
    if (!referralStats || !referralStats.total) {
      setReferralEfficiency(mockReferralEfficiencyData);
      return;
    }
    const { total, pending, completed, rejected, averageCompletionTime } = referralStats;
    const accepted = Math.max(0, total - pending - completed - (rejected || 0));
    setReferralEfficiency([
      { name: 'Response Time', current: averageCompletionTime || 36, target: 18 },
      { name: 'Acceptance Rate', current: total > 0 ? Math.round(((accepted + completed) / total) * 100) : 0, target: 90 },
      { name: 'Completion Rate', current: total > 0 ? Math.round((completed / total) * 100) : 0, target: 85 },
    ]);
  }, []);

  // Get activity icon - memoized with useCallback
  const getActivityIcon = useCallback((type) => {
    switch (type) {
      case 'referral':
        return <ReferralsIcon />;
      case 'patient':
        return <PeopleIcon />;
      case 'analytics':
        return <AnalyticsIcon />;
      case 'token':
        return <TokenIcon />;
      default:
        return <AccessTimeIcon />;
    }
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {loading ? (
        <ModernLoadingIndicator variant="pulse" message="Loading dashboard data..." />
      ) : error ? (
        <ErrorDisplay message={error} />
      ) : (
        <>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Welcome, {currentUser?.firstName || 'User'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Here's an overview of your ClinicTrust AI platform
              </Typography>
            </Box>
            <Tooltip title="Refresh dashboard">
              <span>
                <IconButton
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh dashboard"
                  sx={{ mt: 0.5 }}
                >
                  {refreshing
                    ? <CircularProgress size={22} color="inherit" />
                    : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        
        {/* Dashboard Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            aria-label="dashboard tabs"
          >
            <Tab label="Overview" icon={<InsightsIcon />} iconPosition="start" />
            <Tab label="Patient Analytics" icon={<PeopleIcon />} iconPosition="start" />
            <Tab label="Referral Metrics" icon={<ReferralsIcon />} iconPosition="start" />
            <Tab label="Clinical Outcomes" icon={<FavoriteIcon />} iconPosition="start" />
            <Tab label="AI Performance" icon={<PsychologyIcon />} iconPosition="start" />
          </Tabs>
        </Box>
        
        {/* Overview Tab */}
        {activeTab === 0 && (
          <>
          <Grid container spacing={3}>
            {/* Total Patients */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Patients"
                value={dashboardData?.patients?.total}
                icon={<PeopleIcon />}
                color="primary"
                subtitle="Active patient records"
                additionalInfo={{
                  text: `${dashboardData?.patients?.highRisk} high risk patients`,
                  color: 'warning.main',
                  icon: <WarningIcon fontSize="small" />
                }}
                onClick={() => navigate('/app/patients')}
              />
            </Grid>
            
            {/* Pending Referrals */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Pending Referrals"
                value={dashboardData?.referrals?.pending}
                icon={<ReferralsIcon />}
                color="warning"
                subtitle="Awaiting action"
                additionalInfo={{
                  text: (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <span>Conversion rate</span>
                      <TrendingUpIcon sx={{ mx: 0.5, fontSize: '1rem' }} />
                      <span>{dashboardData?.referrals?.conversionRate}%</span>
                    </Box>
                  ),
                  color: 'info.main'
                }}
                onClick={() => navigate('/app/referrals?status=pending')}
              />
            </Grid>
            
            {/* Care Quality Index */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Care Quality Index"
                value={`${dashboardData?.patients?.careQualityIndex}%`}
                icon={<SpeedIcon />}
                color="success"
                subtitle="Based on patient outcomes"
                additionalInfo={{
                  text: `${dashboardData?.patients?.careQualityIndex >= 0 ? '+' : ''}${dashboardData?.patients?.careQualityIndex}% this month`,
                  color: dashboardData?.patients?.careQualityIndex >= 0 ? 'success.main' : 'error.main',
                  icon: dashboardData?.patients?.careQualityIndex >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />
                }}
                onClick={() => navigate('/app/analytics/care-quality')}
              />
            </Grid>
            
            {/* Token Balance */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Token Balance"
                value={dashboardData?.tokens?.balance ?? 0}
                icon={<TokenIcon />}
                color="info"
                subtitle="Available tokens"
                additionalInfo={{
                  text: `${dashboardData?.tokens?.estimatedValue >= 0 ? '+' : ''}${dashboardData?.tokens?.estimatedValue}% value change`,
                  color: dashboardData?.tokens?.estimatedValue >= 0 ? 'success.main' : 'error.main',
                  icon: dashboardData?.tokens?.estimatedValue >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />
                }}
                onClick={() => navigate('/app/tokens')}
              />
            </Grid>
            
            {/* Patient Risk Analysis Chart */}
            <Grid item xs={12} md={4}>
              <PatientRiskAnalysisChart data={patientRiskData} />
            </Grid>
            
            {/* Clinical Metrics Chart */}
            <Grid item xs={12} md={4}>
              <ClinicalMetricsChart 
                data={clinicalMetrics} 
                title="Care Quality Trends"
              />
            </Grid>
            
            {/* Referral Efficiency Chart */}
            <Grid item xs={12} md={4}>
              <ReferralEfficiencyChart data={referralEfficiency} />
            </Grid>
          
            {/* Today's Schedule */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ApptIcon color="primary" />
                    <Typography variant="h6">Today's Schedule</Typography>
                    <Chip label={formatDate(new Date())} size="small" variant="outlined" />
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => navigate('/app/schedule')}>
                    Full Schedule
                  </Button>
                </Box>
                {todayLoading ? (
                  <LinearProgress />
                ) : todayAppointments.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <ApptIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No appointments scheduled for today</Typography>
                    <Button size="small" variant="contained" sx={{ mt: 1.5 }} onClick={() => navigate('/app/appointments/book')}>
                      Schedule a Patient
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {todayAppointments.slice(0, 6).map((appt, idx) => {
                      const statusColor = { scheduled: 'info', confirmed: 'primary', checked_in: 'warning', in_progress: 'secondary', completed: 'success', cancelled: 'error', no_show: 'error' };
                      const isVirtual = appt.appointmentType === 'telehealth' || appt.location === 'telehealth';
                      return (
                        <Grid item xs={12} sm={6} md={4} key={appt._id || appt.id || idx}>
                          <Paper variant="outlined" sx={{ p: 1.5, borderLeft: 4, borderColor: `${statusColor[appt.status] || 'default'}.main`, borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: '60%' }}>
                                {appt.patientName || '—'}
                              </Typography>
                              <Chip label={appt.status?.replace('_', ' ')} size="small" color={statusColor[appt.status] || 'default'} sx={{ fontSize: '0.65rem', height: 20 }} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {appt.startTime} – {appt.endTime}
                              </Typography>
                              {isVirtual && <TelehealthIcon sx={{ fontSize: 14, color: 'secondary.main' }} />}
                            </Box>
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                              {appt.appointmentType?.replace('_', ' ')} {appt.chiefComplaint ? `· ${appt.chiefComplaint}` : ''}
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Paper>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12} md={8}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Recent Activity</Typography>
                  <Chip 
                    label="Live Updates" 
                    color="success" 
                    size="small" 
                    icon={<AccessTimeIcon />} 
                  />
                </Box>
                <List>
                  {dashboardData?.recentActivity?.map((activity, idx) => (
                    <ListItem key={activity.id || activity._id || idx} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: activity.status === 'completed' ? 'success.light' : 'info.light' }}>
                          {getActivityIcon(activity.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.description}
                        secondary={formatDate(activity.timestamp)}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button 
                    variant="text" 
                    color="primary"
                    onClick={() => navigate('/app/activity')}
                  >
                    View All Activity
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            {/* AI Performance Metrics */}
            <Grid item xs={12} md={4}>
              <AIPerformanceMetrics metrics={aiMetricsData} />
              
              {/* Quick Actions */}
              <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PeopleIcon />}
                      onClick={() => navigate('/app/patients/add')}
                    >
                      Add Patient
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ReferralsIcon />}
                      onClick={() => navigate('/app/referrals/create')}
                    >
                      Create Referral
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<AnalyticsIcon />}
                      onClick={() => navigate('/app/analytics/create')}
                    >
                      New Analysis
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ApptIcon />}
                      onClick={() => navigate('/app/appointments/book')}
                    >
                      Schedule Patient
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<StorefrontIcon />}
                      onClick={() => navigate('/app/dtx/marketplace')}
                    >
                      DTx Marketplace
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<TokenIcon />}
                      onClick={() => navigate('/app/tokens/transfer')}
                    >
                      Transfer Tokens
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Recent DTx Prescriptions Widget */}
              <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <RxIcon color="primary" fontSize="small" />
                    <Typography variant="h6">Recent DTx Prescriptions</Typography>
                  </Box>
                  <Button size="small" onClick={() => navigate('/app/dtx/prescriptions')}>View All</Button>
                </Box>
                {rxLoading ? (
                  <LinearProgress />
                ) : recentRx.length === 0 ? (
                  <Box textAlign="center" py={2}>
                    <Typography variant="body2" color="text.secondary">No prescriptions yet</Typography>
                    <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => navigate('/app/dtx/marketplace')}>
                      Browse Marketplace
                    </Button>
                  </Box>
                ) : (
                  recentRx.map((rx, idx) => (
                    <Box key={rx._id || rx.id || idx} display="flex" justifyContent="space-between" alignItems="center" py={0.75} borderBottom="1px solid" sx={{ borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{rx.patientName}</Typography>
                        <Typography variant="caption" color="text.secondary">{rx.programName}</Typography>
                      </Box>
                      <Chip
                        label={rx.status}
                        size="small"
                        color={rx.status === 'completed' ? 'success' : rx.status === 'active' ? 'primary' : 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                  ))
                )}
              </Paper>
            </Grid>
          </Grid>
          </>
        )}
        
        {/* Patient Analytics Tab */}
        {activeTab === 1 && (() => {
          const m = analyticsSnapshot?.metrics;
          const demographics  = m?.patientDemographics   || [];
          const conditions    = m?.topConditions          || [];
          const monthlyTrends = m?.patientMonthlyTrends   || [];
          const noData = !analyticsSnapshot;
          return (
            <Grid container spacing={3}>
              {noData && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2, textAlign: 'center', color: 'text.secondary' }}>
                    No analytics data yet. Ask your admin to run the Analytics Job to populate these charts.
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Patient Demographics</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={demographics}
                          dataKey="count"
                          nameKey="ageGroup"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ageGroup, percentage}) => `${ageGroup}: ${percentage || 0}%`}
                        >
                          {demographics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]} />
                          ))}
                        </Pie>
                        <Legend />
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Common Conditions</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conditions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip formatter={(value) => [`${value} patients`]} />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Risk Factors</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conditions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip formatter={(value) => [`${value} patients`]} />
                        <Bar dataKey="count" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Patient Trends</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="newPatients" stroke="#8884d8" name="New Patients" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          );
        })()}
        
        {/* Referral Metrics Tab */}
        {activeTab === 2 && (() => {
          const m = analyticsSnapshot?.metrics;
          const bySpecialty        = m?.referralsBySpecialty        || [];
          const statusDistribution = m?.referralStatusDistribution  || [];
          const monthlyTrends      = m?.referralMonthlyTrends       || [];
          const providerConversion = m?.referralProviderConversion   || [];
          const noData = !analyticsSnapshot;
          return (
            <Grid container spacing={3}>
              {noData && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2, textAlign: 'center', color: 'text.secondary' }}>
                    No analytics data yet. Ask your admin to run the Analytics Job to populate these charts.
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Referrals by Specialty</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bySpecialty}
                          dataKey="count"
                          nameKey="specialty"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({specialty, percentage}) => `${specialty}: ${percentage || 0}%`}
                        >
                          {bySpecialty.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'][index % 6]} />
                          ))}
                        </Pie>
                        <Legend />
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Referral Status Distribution</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <RechartsTooltip formatter={(value) => [`${value} referrals`]} />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Referral Trends</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="sent"      stroke="#8884d8" name="Sent" />
                        <Line type="monotone" dataKey="accepted"  stroke="#82ca9d" name="Accepted" />
                        <Line type="monotone" dataKey="completed" stroke="#ffc658" name="Completed" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Provider Conversion Rates</Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box sx={{ minWidth: 650 }}>
                      <Box sx={{ display: 'flex', fontWeight: 'bold', p: 1, bgcolor: 'background.paper' }}>
                        <Box sx={{ flex: 2 }}>Provider</Box>
                        <Box sx={{ flex: 1 }}>Sent</Box>
                        <Box sx={{ flex: 1 }}>Accepted</Box>
                        <Box sx={{ flex: 1 }}>Completed</Box>
                        <Box sx={{ flex: 1 }}>Rate (%)</Box>
                      </Box>
                      <Divider />
                      {providerConversion.length === 0 ? (
                        <Box sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>No conversion data available</Box>
                      ) : providerConversion.map((row, index) => (
                        <Box key={index} sx={{ display: 'flex', p: 1, '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                          <Box sx={{ flex: 2 }}>{row.provider}</Box>
                          <Box sx={{ flex: 1 }}>{row.sent}</Box>
                          <Box sx={{ flex: 1 }}>{row.accepted}</Box>
                          <Box sx={{ flex: 1 }}>{row.completed}</Box>
                          <Box sx={{ flex: 1 }}>{row.rate}%</Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          );
        })()}
        
        {/* Clinical Outcomes Tab */}
        {activeTab === 3 && (() => {
          const co = clinicalOutcomesData;
          const noData = !co;
          return (
            <Grid container spacing={3}>
              {noData && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2, textAlign: 'center', color: 'text.secondary' }}>
                    Clinical outcomes data is loading or unavailable. Data is computed from your referral history.
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Referral Outcomes by Specialty</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={co?.treatmentEffectiveness || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="condition" type="category" width={100} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="improved" stackId="a" fill="#82ca9d" name="Completed" />
                        <Bar dataKey="unchanged" stackId="a" fill="#ffc658" name="Accepted" />
                        <Bar dataKey="worsened" stackId="a" fill="#ff8042" name="Rejected/Cancelled" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Monthly Rejection Rate vs Benchmark</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={co?.readmissionRates || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis unit="%" />
                        <RechartsTooltip formatter={(v) => `${v}%`} />
                        <Legend />
                        <Line type="monotone" dataKey="rate" stroke="#8884d8" name="Your Rate %" />
                        <Line type="monotone" dataKey="benchmark" stroke="#82ca9d" name="Benchmark %" strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Referral Outcome Scores (out of 5)</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={co?.patientSatisfaction || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis domain={[0, 5]} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="score"     fill="#8884d8" name="Your Score" />
                        <Bar dataKey="benchmark" fill="#82ca9d" name="Benchmark" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Quality Metrics</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={co?.qualityMetrics || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="metric" type="category" width={170} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="score"  fill="#8884d8" name="Current" />
                        <Bar dataKey="target" fill="#82ca9d" name="Target" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          );
        })()}
        
        {/* AI Performance Tab */}
        {activeTab === 4 && (() => {
          const ai = aiPerformanceData;
          const noData = !ai;
          const feedback = ai?.feedbackMetrics || {};
          return (
            <Grid container spacing={3}>
              {noData && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2, textAlign: 'center', color: 'text.secondary' }}>
                    AI performance data is computed from your analytics job history. Run analytics jobs to populate these charts.
                  </Paper>
                </Grid>
              )}
              {!noData && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Box><Typography variant="caption" color="text.secondary">Total Jobs</Typography><Typography variant="h6">{feedback.totalJobs ?? 0}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Completed</Typography><Typography variant="h6" color="success.main">{feedback.completedJobs ?? 0}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Failed</Typography><Typography variant="h6" color="error.main">{feedback.failedJobs ?? 0}</Typography></Box>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={12} md={12}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>AI Confidence Score Trends (% by month)</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ai?.accuracyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 100]} unit="%" />
                        <RechartsTooltip formatter={(v) => `${v}%`} />
                        <Legend />
                        <Line type="monotone" dataKey="riskAssessment"    stroke="#8884d8" name="Risk Assessment" />
                        <Line type="monotone" dataKey="summaryGeneration" stroke="#82ca9d" name="Summary Generation" />
                        <Line type="monotone" dataKey="recommendations"   stroke="#ffc658" name="Recommendations" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Analytics Job Usage by Type</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ai?.usageByFeature || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="feature" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Total Jobs" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Failed Jobs by Type</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ai?.errorAnalysis?.length ? ai.errorAnalysis : [{ category: 'No failures', count: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip formatter={(v) => [`${v} jobs`]} />
                        <Bar dataKey="count" fill="#ff8042" name="Failed Jobs" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Model Performance by Job Type</Typography>
                  {(!ai?.modelPerformance?.length) ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No completed analytics jobs yet. Run an analytics job to see model performance stats.
                    </Typography>
                  ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Box sx={{ minWidth: 650 }}>
                        <Box sx={{ display: 'flex', fontWeight: 'bold', p: 1, bgcolor: 'background.paper' }}>
                          <Box sx={{ flex: 3 }}>Model Type</Box>
                          <Box sx={{ flex: 1 }}>Accuracy</Box>
                          <Box sx={{ flex: 1 }}>Precision</Box>
                          <Box sx={{ flex: 1 }}>Recall</Box>
                          <Box sx={{ flex: 1 }}>F1 Score</Box>
                        </Box>
                        <Divider />
                        {ai.modelPerformance.map((row, index) => (
                          <Box key={index} sx={{ display: 'flex', p: 1, '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                            <Box sx={{ flex: 3 }}>{row.model}</Box>
                            <Box sx={{ flex: 1 }}>{row.accuracy}%</Box>
                            <Box sx={{ flex: 1 }}>{row.precision}%</Box>
                            <Box sx={{ flex: 1 }}>{row.recall}%</Box>
                            <Box sx={{ flex: 1 }}>{row.f1Score}</Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          );
        })()}
        </>
      )}
    </Container>
  );
}

// ... (rest of the code remains the same)
// Export as memoized component to prevent unnecessary re-renders
export default memo(Dashboard);
